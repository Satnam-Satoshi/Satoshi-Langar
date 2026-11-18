import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateEditorial,reviewBinding,textDigest} from './editorial-gate.mjs';
import {validateFeatures} from './baseline/scripts/lib/ltc-flagship-record.mjs';
const now='2026-11-14T15:00:00Z';
const fixture=()=>{
const text='Synthetic test-only official statement. A test release was published on November 13. The fixture supplies no facts about a real company or blockchain.';
const features={schemaVersion:1,issueDate:'2026-11-14',checkedAt:'2026-11-14',preparedAt:now,timezone:'America/New_York',editorialStatus:'AI-prepared and source-checked',sources:[{id:'test',url:'https://example.com/release',title:'Synthetic fixture',publisher:'Test publisher',note:'Synthetic fixture, never publish.',publishedAt:'2026-11-13',checkedAt:'2026-11-14'}],stories:[{id:'test-release',title:'Synthetic release fixture',desk:'Test desk',classification:'Attributed publication',dek:'A synthetic release used only for tests.',status:'Test only',takeaway:'Do not publish fixture.',discussionPrompt:'What does the fixture prove?',paragraphs:['This is a synthetic fixture paragraph and is not real-world reporting.'],sourceIds:['test'],eventDates:[{date:'2026-11-13',label:'Publication'}]}]};
const archives=[{sourceId:'test',registryId:'primary',url:'https://example.com/release',kind:'release',text,sha256:textDigest(text),retrievedAt:now,publishedAt:'2026-11-13'}],coverage=[{id:'primary',status:'ok',checkedAt:now}],review={binding:'',issueDate:'2026-11-14',reviewedAt:now,decision:'approve',scope:'all-material-claims-and-source-entailment'};
const input={features,archives,coverage,review};review.binding=reviewBinding(input);
const options={now,issueDate:'2026-11-14',registry:[{id:'primary',origins:['https://example.com'],required:true}],validateFeatures,verifyReview:async()=>true};return{input,options};};
const run=({input,options})=>evaluateEditorial(input,options);
test('reviewed fixture remains non-publishing candidate',async()=>{let r=await run(fixture());assert.equal(r.status,'reviewed-candidate');assert.equal(r.mayPublish,false);});
const cases=[
 ['wrong edition',f=>f.input.features.issueDate='2026-11-13','wrong_issue_date'],
 ['source-watch text',f=>f.input.features.stories[0].id='watch-123','source_watch_not_reporting'],
 ['reference hash is not news',f=>f.input.archives[0].kind='reference','discovery_is_not_article'],
 ['no source evidence',f=>f.input.archives=[],'untrusted_or_missing_source'],
 ['changed evidence bytes',f=>f.input.archives[0].text+=' ALTERED','invalid_archive'],
 ['title-only evidence',f=>{f.input.archives[0].text='Short title';f.input.archives[0].sha256=textDigest('Short title');},'invalid_archive'],
 ['future retrieval',f=>f.input.archives[0].retrievedAt='2026-11-15T15:00:00Z','invalid_archive'],
 ['stale retrieval',f=>f.input.archives[0].retrievedAt='2026-11-12T15:00:00Z','invalid_archive'],
 ['untrusted origin',f=>{f.input.features.sources[0].url='https://evil.example/release';f.input.archives[0].url='https://evil.example/release';},'untrusted_or_missing_source'],
 ['date mismatch',f=>f.input.archives[0].publishedAt='2026-11-12','invalid_source_publication_date'],
 ['no event date',f=>f.input.features.stories[0].eventDates=[],'missing_or_invalid_event_date'],
 ['old context presented as fresh',f=>f.input.features.stories[0].eventDates[0].date='2026-10-01','historical_story_not_labeled'],
 ['required feed unavailable',f=>f.input.coverage[0].status='unavailable','required_source_unavailable'],
 ['unreported source health',f=>f.input.coverage=[],'coverage_manifest_mismatch'],
 ['duplicate source',f=>f.input.archives.push({...f.input.archives[0]}),'invalid_evidence_manifest'],
 ['invented health',f=>f.input.coverage[0].status='good','invalid_source_health'],
 ['future health check',f=>f.input.coverage[0].checkedAt='2026-11-15T15:00:00Z','invalid_source_health'],
 ['missing review',f=>f.input.review=null,'missing_bound_editorial_review'],
 ['unbound amended story',f=>f.input.features.stories[0].title='Unsupported launch claim','missing_bound_editorial_review'],
 ['untrusted review receipt',f=>f.options.verifyReview=async()=>false,'unauthenticated_editorial_review'],
 ['review service outage',f=>f.options.verifyReview=async()=>{throw Error('offline');},'review_verification_unavailable'],
 ['missing validator',f=>delete f.options.validateFeatures,'missing_trusted_validators'],
 ['invalid clock',f=>f.options.now='2026-02-30T15:00:00Z','invalid_evaluation_clock'],
 ['bad policy',f=>f.options.minHealthyRatio=0,'invalid_trusted_policy'],
];
for(const [name,mutate,code]of cases)test(name,async()=>{const f=fixture();mutate(f);let r=await run(f);assert.equal(r.status,'withheld');assert.ok(r.blockers.includes(code),JSON.stringify(r));assert.equal(r.mayPublish,false);});
test('labeled historical context allowed with bound review',async()=>{const f=fixture();f.input.features.stories[0].eventDates[0].date='2026-10-01';f.input.features.stories[0].classification='Historical context';f.input.review.binding=reviewBinding(f.input);assert.equal((await run(f)).status,'reviewed-candidate');});
test('health gaps preserved even at allowed threshold',async()=>{const f=fixture();f.options.registry.push({id:'optional',origins:['https://optional.example'],required:false});f.options.minHealthyRatio=.5;f.input.coverage.push({id:'optional',status:'manual-only',checkedAt:now});f.input.review.binding=reviewBinding(f.input);const r=await run(f);assert.equal(r.status,'reviewed-candidate');assert.deepEqual(r.gaps,['optional: manual-only']);});
