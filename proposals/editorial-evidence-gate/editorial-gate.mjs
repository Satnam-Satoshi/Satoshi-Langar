/** Isolated proposal. No network, writes, deployment or production imports.
 * Trusted registry/review verification are supplied by the protected caller,
 * never from the candidate feature file or fetched publisher content.
 */
import {createHash} from 'node:crypto';
export const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const textDigest = value => createHash('sha256').update(value).digest('hex');
const day = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s;
const instant = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s) && Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0,19) === s.slice(0,19);
const nyDay = s => new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s));
const safeURL = s => {try {let u=new URL(s);return u.protocol==='https:' && !u.username && !u.password && !u.hash && u.href===s;} catch{return false;}};
const unique = xs => new Set(xs).size === xs.length;
export const reviewBinding = ({features,archives,coverage}) => digest({features,archives,coverage});

/** Admission is editorial review evidence, NOT automatic semantic fact verification.
 * verifyReview must authenticate an immutable review receipt outside candidate data.
 * A test double returning true is NEVER a production review verifier.
 */
export async function evaluateEditorial({features,archives,coverage,review}, {
  now, issueDate, registry, validateFeatures, verifyReview, minHealthyRatio=.75,
  maxRetrievalAgeHours=24, maxFreshEventAgeDays=7,
} = {}) {
  const blockers=[], gaps=[];
  const fail = code => {if(!blockers.includes(code))blockers.push(code);};
  const result = () => ({status:blockers.length?'withheld':'reviewed-candidate',blockers,gaps,mayPublish:false});
  if (!instant(now)||!day(issueDate)||nyDay(now)!==issueDate) {fail('invalid_evaluation_clock');return result();}
  if(!Array.isArray(registry)||!registry.length||!unique(registry.map(s=>s.id))||registry.some(s=>typeof s.id!=='string'||!Array.isArray(s.origins)||!s.origins.length||s.origins.some(o=>!safeURL(o+'/')))||!Number.isFinite(minHealthyRatio)||minHealthyRatio<=0||minHealthyRatio>1||!Number.isFinite(maxRetrievalAgeHours)||maxRetrievalAgeHours<=0||!Number.isFinite(maxFreshEventAgeDays)||maxFreshEventAgeDays<0){fail('invalid_trusted_policy');return result();}
  if(typeof validateFeatures!=='function'||typeof verifyReview!=='function'){fail('missing_trusted_validators');return result();}
  try{validateFeatures(features,issueDate,{now});}catch {fail('invalid_features');return result();}
  if(features.issueDate!==issueDate)fail('wrong_issue_date');
  if(!Array.isArray(features.stories)||!features.stories.length||!Array.isArray(features.sources)||!unique(features.stories.map(s=>s.id))||!unique(features.sources.map(s=>s.id))){fail('invalid_features');return result();}
  if(features.stories.some(s=>/^watch-|^dated-source-check$/.test(s.id)||/source.watch|source.check|dated publication to inspect|earlier context to revisit/i.test(s.title+' '+s.classification)))fail('source_watch_not_reporting');
  if(!Array.isArray(archives)||!unique(archives.map(a=>a.sourceId))||!Array.isArray(coverage)||!unique(coverage.map(c=>c.id))){fail('invalid_evidence_manifest');return result();}
  const isRecent = s=>instant(s)&&Date.parse(s)<=Date.parse(now)&&Date.parse(now)-Date.parse(s)<=maxRetrievalAgeHours*3600000;
  if(coverage.length!==registry.length||coverage.some(c=>!registry.some(s=>s.id===c.id)))fail('coverage_manifest_mismatch');
  let healthy=0;
  for(const registered of registry){const c=coverage.find(c=>c.id===registered.id);if(!c||!isRecent(c.checkedAt)||!['ok','unavailable','manual-only'].includes(c.status)){fail('invalid_source_health');continue;}if(c.status==='ok')healthy++;else {gaps.push(`${registered.id}: ${c.status}`);if(registered.required)fail('required_source_unavailable');}}
  if(healthy/registry.length<minHealthyRatio)fail('insufficient_source_coverage');
  for(const source of features.sources){
    const a=archives.find(a=>a.sourceId===source.id),registered=registry.find(s=>s.id===a?.registryId);
    if(!a||!registered||!safeURL(a.url)||a.url!==source.url||!registered.origins.includes(new URL(a.url).origin)||coverage.find(c=>c.id===a.registryId)?.status!=='ok'){fail('untrusted_or_missing_source');continue;}
    if(typeof a.text!=='string'||a.text.trim().length<100||a.sha256!==textDigest(a.text)||!isRecent(a.retrievedAt)||source.checkedAt!==nyDay(a.retrievedAt))fail('invalid_archive');
    if(!['article','release','official-record'].includes(a.kind))fail('discovery_is_not_article');
    if(a.publishedAt!==source.publishedAt||!(day(a.publishedAt)||instant(a.publishedAt))||Date.parse(a.publishedAt)>Date.parse(now))fail('invalid_source_publication_date');
  }
  if(archives.length!==features.sources.length)fail('archive_manifest_mismatch');
  for(const story of features.stories){
    if(!Array.isArray(story.sourceIds)||!story.sourceIds.length||!story.sourceIds.every(id=>features.sources.some(s=>s.id===id)))fail('missing_story_source');
    if(!Array.isArray(story.eventDates)||!story.eventDates.length||story.eventDates.some(e=>!day(e.date)||e.date>issueDate))fail('missing_or_invalid_event_date');
    else if(story.eventDates.every(e=>(Date.parse(issueDate)-Date.parse(e.date))/86400000>maxFreshEventAgeDays)&&!/historical|follow.up|context/i.test(story.classification))fail('historical_story_not_labeled');
  }
  if(!review||review.binding!==reviewBinding({features,archives,coverage})||review.issueDate!==issueDate||!isRecent(review.reviewedAt)||review.decision!=='approve'||review.scope!=='all-material-claims-and-source-entailment')fail('missing_bound_editorial_review');
  else {try {if(await verifyReview(review)!==true)fail('unauthenticated_editorial_review');}catch {fail('review_verification_unavailable');}}
  return result();
}
