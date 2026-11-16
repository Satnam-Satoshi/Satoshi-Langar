/** Public display registry only. Does not grant publication permission or execute a release. */
const sha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const positive = value => Number.isSafeInteger(value) && value > 0;
const text = value => typeof value === 'string' && value.trim().length > 0 && !/[\u0000-\u001f]/.test(value);
const asset = (value, extension) => typeof value === 'string' && /^\/magazine\/daily\/[a-zA-Z0-9_./-]+$/.test(value) && !value.includes('..') && !value.includes('//') && extension.test(value);
const freeze = value => { if(value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
export const pdfRouteId = issue => issue.revision === 1 ? issue.date : issue.id;
export const pdfIssuePage = issue => `/conversations/editions/${pdfRouteId(issue)}/`;
/** @param {any} input @param {{legacyRouteIds?:string[]}} options */
export function validatePdfRegistry(input, { legacyRouteIds = [] } = {}) {
  if(!input || input.schemaVersion !== 1 || !Array.isArray(input.issues) || input.issues.length === 0 || typeof input.current !== 'string') throw Error('invalid-pdf-registry');
  const ids=new Set(), paths=new Set(), hashes=new Set(), legacy=new Set(legacyRouteIds);
  for(const issue of input.issues){
    const fields=['id','date','revision','title','dek','preparedDate','pdf','cover','pages','bytes','sha256','coverBytes','coverSha256','coverWidth','coverHeight','correction'];
    if(!issue || Object.keys(issue).some(key=>!fields.includes(key)) || !date(issue.date) || !positive(issue.revision) || issue.id !== `${issue.date}-r${issue.revision}` || !text(issue.title) || !text(issue.dek) || !date(issue.preparedDate)) throw Error('invalid-pdf-identity');
    if(ids.has(issue.id)) throw Error('duplicate-pdf-identity'); ids.add(issue.id);
    if(legacy.has(issue.id) || legacy.has(pdfRouteId(issue))) throw Error('pdf-legacy-route-collision');
    if(!asset(issue.pdf,/\.pdf$/) || !asset(issue.cover,/\.png$/) || !positive(issue.pages) || !positive(issue.bytes) || !positive(issue.coverBytes) || !positive(issue.coverWidth) || !positive(issue.coverHeight) || !sha(issue.sha256) || !sha(issue.coverSha256)) throw Error('invalid-pdf-artifact');
    if(paths.has(issue.pdf) || paths.has(issue.cover)) throw Error('duplicate-pdf-artifact-path');paths.add(issue.pdf);paths.add(issue.cover);
    if(hashes.has(issue.sha256)) throw Error('duplicate-pdf-bytes');hashes.add(issue.sha256);
    if(issue.revision === 1 ? issue.correction !== null : !issue.correction || issue.correction.replacesId !== `${issue.date}-r${issue.revision-1}` || !text(issue.correction.reason)) throw Error('invalid-pdf-correction');
  }
  for(const issue of input.issues) if(issue.revision > 1 && !ids.has(issue.correction.replacesId)) throw Error('missing-original-pdf-revision');
  const issues=structuredClone(input.issues).sort((a,b)=>b.date.localeCompare(a.date)||b.revision-a.revision);
  if(input.current !== issues[0].id) throw Error('pdf-current-must-be-latest');
  return freeze({schemaVersion:1,current:input.current,issues});
}
export function pdfDisplayIssues(registry){return validatePdfRegistry(registry).issues.map(issue=>freeze({...issue,page:pdfIssuePage(issue),size:`${Math.round(issue.bytes/1024)} KB`}));}
export function findPdfIssue(registry, routeId){return pdfDisplayIssues(registry).find(issue=>issue.id===routeId || (issue.revision===1 && issue.date===routeId));}
export function pdfStaticRouteIds(registry){return [...new Set(validatePdfRegistry(registry).issues.flatMap(issue=>[issue.id,pdfRouteId(issue)]))];}
/** Append-only projection helper; approved producer validation is a separate prerequisite. */
export function appendPdfIssue(registry, issue){
  const prior=validatePdfRegistry(registry),existing=prior.issues.find(record=>record.id===issue.id);
  if(existing){if(JSON.stringify(Object.entries(existing).sort())!==JSON.stringify(Object.entries(issue).sort()))throw Error('immutable-pdf-record-conflict');return prior;}
  return validatePdfRegistry({schemaVersion:1,current:issue.id,issues:[...prior.issues,structuredClone(issue)]});
}
