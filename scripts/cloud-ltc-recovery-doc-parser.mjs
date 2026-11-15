import {decodeStateEnvelope, MAX_DOCS_STATE_CHARACTERS} from './cloud-ltc-state-envelope.mjs';
// Strict existing state-document parser reused without changing ordinary adapters.
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
export function parseRecoveryDocument(doc, documentId, key) {
  check(doc?.documentId === documentId && revision(doc.revisionId), 'invalid_state_document');
  check(JSON.stringify(doc).length <= MAX_DOCS_STATE_CHARACTERS, 'state_capacity_exceeded');
  noSuggestions(doc);
  for (const field of ['headers','footers','footnotes','inlineObjects','positionedObjects','namedRanges']) check(!populated(doc[field]), 'invalid_state_document');
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
  let value;
  try { value = decodeStateEnvelope(raw, key); }
  catch { throw new Error('invalid_state_document'); }
  return { raw, value, version: doc.revisionId, revision: doc.revisionId, endIndex: index, tabId: tab.tabProperties.tabId };
}
