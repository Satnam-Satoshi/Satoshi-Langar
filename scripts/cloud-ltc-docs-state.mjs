// OFFLINE-REVIEWED ADAPTER ONLY. No credential lookup, resource creation or runner activation.
// Injected methods return {status, body}. Same OAuth identity must serve every call.
// Docs requiredRevisionId is CAS; targetRevisionId (merge) is never permitted.
const check = (condition, code) => { if (!condition) throw new Error(code); };
const keyPattern = /^[a-z0-9][a-z0-9_-]{0,79}$/;
const idPattern = /^[A-Za-z0-9_-]{5,200}$/;
const revision = value => typeof value === 'string' && value.length > 0 && value.length <= 2048;
const populated = value => value && (typeof value !== 'object' || Object.keys(value).length > 0);
function noSuggestions(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    check(!((key.startsWith('suggested') || key === 'suggestions') && populated(child)), 'invalid_state_document');
    noSuggestions(child);
  }
}
function parseDocument(doc, documentId, key) {
  check(doc?.documentId === documentId && revision(doc.revisionId), 'invalid_state_document');
  check(JSON.stringify(doc).length <= 1_000_000, 'state_capacity_exceeded');
  noSuggestions(doc);
  check(Array.isArray(doc.tabs) && doc.tabs.length === 1 && !doc.body, 'invalid_state_document');
  const tab = doc.tabs[0];
  check(!tab.childTabs?.length && typeof tab.tabProperties?.tabId === 'string' && tab.tabProperties.tabId.length > 0 && tab.documentTab, 'invalid_state_document');
  const documentTab = tab.documentTab;
  for (const field of ['headers', 'footers', 'footnotes', 'inlineObjects', 'positionedObjects', 'namedRanges']) check(!populated(documentTab[field]), 'invalid_state_document');
  const content = documentTab.body?.content;
  check(Array.isArray(content) && content.length === 2 && content[0].sectionBreak && content[0].endIndex === 1, 'invalid_state_document');
  const paragraph = content[1];
  check(paragraph.startIndex === 1 && paragraph.paragraph && !paragraph.table && !paragraph.tableOfContents && !paragraph.paragraph.bullet && !populated(paragraph.paragraph.positionedObjectIds), 'invalid_state_document');
  const elements = paragraph.paragraph.elements;
  check(Array.isArray(elements) && elements.length > 0, 'invalid_state_document');
  let text = ''; let index = 1;
  for (const element of elements) {
    check(element.startIndex === index && element.textRun && typeof element.textRun.content === 'string' && Object.keys(element).every(k => ['startIndex','endIndex','textRun'].includes(k)), 'invalid_state_document');
    check(!populated(element.textRun.textStyle?.link), 'invalid_state_document');
    text += element.textRun.content; index += element.textRun.content.length; // Docs indexes are UTF-16.
    check(element.endIndex === index, 'invalid_state_document');
  }
  check(paragraph.endIndex === index && text.endsWith('\n') && !text.slice(0,-1).includes('\n'), 'invalid_state_document');
  const raw = text.slice(0,-1);
  if (!raw) return { value: null, version: null, revision: doc.revisionId, endIndex: index, tabId: tab.tabProperties.tabId };
  let envelope; try { envelope = JSON.parse(raw); } catch { throw new Error('invalid_state_document'); }
  check(envelope?.schemaVersion === 1 && envelope.key === key && envelope.value && typeof envelope.value === 'object' && !Array.isArray(envelope.value) && Object.keys(envelope).length === 3 && JSON.stringify(envelope) === raw, 'invalid_state_document');
  return { value: envelope.value, version: doc.revisionId, revision: doc.revisionId, endIndex: index, tabId: tab.tabProperties.tabId };
}
export class GoogleDocsStateAdapter {
  constructor({ documentId, folderId, client }) {
    check(idPattern.test(documentId ?? '') && idPattern.test(folderId ?? '') && client && ['getFileMetadata','getDocument','batchUpdateDocument'].every(name => typeof client[name] === 'function'), 'invalid_storage_configuration');
    this.documentId = documentId; this.folderId = folderId; this.client = client;
  }
  async #read(key) {
    check(keyPattern.test(key ?? ''), 'invalid_state_key');
    let metadata, response;
    try { metadata = await this.client.getFileMetadata(this.documentId); }
    catch { throw new Error('storage_read_failed'); }
    check(metadata?.status === 200, 'storage_read_failed');
    const file = metadata.body;
    check(file?.id === this.documentId && file.mimeType === 'application/vnd.google-apps.document' && file.trashed === false && file.ownedByMe === true && file.shared === false && file.capabilities?.canEdit === true && Array.isArray(file.parents) && file.parents.length === 1 && file.parents[0] === this.folderId, 'private_storage_required');
    try { response = await this.client.getDocument(this.documentId, { includeTabsContent: true, suggestionsViewMode: 'SUGGESTIONS_INLINE' }); }
    catch { throw new Error('storage_read_failed'); }
    check(response?.status === 200, 'storage_read_failed');
    return parseDocument(response.body, this.documentId, key);
  }
  async read(key) {
    const {value,version} = await this.#read(key); return { value: structuredClone(value), version };
  }
  async conditionalWrite(key, value, expectedVersion) {
    check(value && typeof value === 'object' && !Array.isArray(value), 'invalid_state_document');
    check(expectedVersion === null || revision(expectedVersion), 'invalid_storage_configuration');
    // Re-read even on bootstrap: never equate absent provider resource with blank provisioned ledger.
    const current = await this.#read(key);
    check(current.version === expectedVersion, 'state_conflict');
    const text = JSON.stringify({schemaVersion:1,key,value});
    check(text.length <= 900_000, 'state_capacity_exceeded');
    const requests = [];
    if (current.endIndex > 2) requests.push({deleteContentRange:{range:{startIndex:1,endIndex:current.endIndex-1,tabId:current.tabId}}});
    requests.push({insertText:{location:{index:1,tabId:current.tabId},text}});
    let response;
    try { response = await this.client.batchUpdateDocument(this.documentId, {requests,writeControl:{requiredRevisionId:current.revision}}); }
    catch { throw new Error('storage_write_uncertain'); }
    // A bare 400 is not proof of a stale revision: only an independently changed
    // revision permits conflict classification; otherwise fail closed as uncertain.
    if (response?.status === 400) {
      let readback; try { readback = await this.#read(key); } catch { throw new Error('storage_write_uncertain'); }
      if (readback.revision !== current.revision) throw new Error('state_conflict');
      throw new Error('storage_write_uncertain');
    }
    check(response?.status === 200 && response.body?.documentId === this.documentId && revision(response.body?.writeControl?.requiredRevisionId) && !response.body.writeControl.targetRevisionId, 'storage_write_uncertain');
    return response.body.writeControl.requiredRevisionId;
  }
}
