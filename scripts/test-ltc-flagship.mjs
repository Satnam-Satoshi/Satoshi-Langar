import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdtemp,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {collectSnapshot} from './collect-ltc.mjs';
import {collectIntelligence,MARKET_ROUTES} from './lib/ltc-intelligence.mjs';
import {collectPolicy} from './lib/ltc-policy.mjs';
import {prepareFlagship,validateFeatures} from './prepare-ltc-flagship.mjs';
import {prepareEdition,publishEdition,readEditionArchive,digest} from './prepare-ltc-edition.mjs';
import {validateFlagshipRecord} from './lib/ltc-flagship-record.mjs';
import {validateLtcArchive} from './validate-ltc-archive.mjs';
const json=async file=>JSON.parse(await readFile(new URL(file,import.meta.url),'utf8'));
const registry=await json('../config/ltc-sources.json'),policy=await json('../config/ltc-publication.json'),features=await json('../content/daily-features/2026-10-05.json');
const now='2026-10-05T14:00:00.000Z', timestamp=Date.parse(now)/1000;
const snapshot=await collectSnapshot(registry,{now,fetcher:async url=>url.includes('coinbase')?new Response(JSON.stringify({trade_id:123,price:'100.00',bid:'99.00',ask:'101.00',size:'0.1',volume:'1000.00',time:now}),{headers:{'content-type':'application/json'}}):new Response('Unavailable',{status:403})});
const intelligence=await collectIntelligence({now,waitImpl:async()=>{},fetchImpl:async url=>url.includes('morpho')?new Response(JSON.stringify({data:{markets:{items:MARKET_ROUTES.map(r=>({marketId:r.marketId,chain:{id:r.chainId},lltv:String(BigInt(Math.round(Number(r.lltv)*1000))*10n**15n),oracle:{address:r.oracleAddress},irmAddress:r.irmAddress,loanAsset:{...r.loan,chain:{id:r.chainId},price:{usd:1,timestamp}},collateralAsset:{...r.collateral,chain:{id:r.chainId},price:{usd:100,timestamp}},state:{timestamp,borrowApy:.05,supplyApy:.04,utilization:.8,liquidityAssets:'10000000',supplyAssets:'50000000',borrowAssets:'40000000'}}))}}}),{headers:{'content-type':'application/json'}}):new Response('Unavailable',{status:403})});
const policyRecords=await collectPolicy({now,fetcher:async()=>new Response('Unavailable',{status:403})});
const args={snapshot,registry,policy,intelligence,policyRecords,features,now};
test('complete flagship preserves evidence dates and exact missing fields, with human status unchanged',()=>{
 const issue=prepareFlagship(args);assert.equal(issue.id,'2026-10-05-r1');assert.equal(issue.intelligence.markets[0].state.borrowApy,'0.05');assert.equal(issue.policyRecords.sources[0].items.length,0);assert.equal(issue.intelligence.network.assets[1].transactions,null);assert.equal(issue.features.issueDate,'2026-10-05');assert.equal(issue.humanReview,'Not individually reviewed by a human editor');assert.equal(issue.flagship.series,'Proof of Work');assert.equal(issue.presentation.artDirection.version,2);
});
test('publication re-evaluates rate age and blanks a once-fresh quote after fifteen minutes',()=>{
 const issue=prepareFlagship({...args,now:'2026-10-05T14:16:00.000Z'});assert.equal(issue.intelligence.markets[0].state.freshness,'stale');assert.equal(issue.intelligence.markets[0].state.borrowApy,null);assert.equal(intelligence.markets[0].state.borrowApy,'0.05');
});
test('pause, future observation and missing registry cannot publish flagship',()=>{
 assert.throws(()=>prepareFlagship({...args,policy:{...policy,paused:true}}),/publication_paused/);
 assert.throws(()=>prepareFlagship({...args,now:'2026-10-05T13:59:00.000Z'}));
 assert.throws(()=>prepareFlagship({...args,policyRecords:{...policyRecords,sources:[]}}),/invalid_policy_registry/);
});
test('feature sources reject unsafe links, missing citations, invalid dates, duplicate IDs and non-text status',()=>{
 const mutations=[
  ['script URL',f=>f.sources[0].url='javascript:alert(1)'],
  ['protocol-relative URL',f=>f.sources[0].url='//evil.invalid/a'],
  ['missing citation',f=>f.stories[0].sourceIds=['missing']],
  ['future issue date',f=>f.issueDate='2026-10-06'],
  ['impossible issue date',f=>f.issueDate='2026-02-30'],
  ['future preparation',f=>f.preparedAt='2026-10-06T14:00:00.000Z'],
  ['impossible preparation',f=>f.preparedAt='2026-02-30T14:00:00.000Z'],
  ['future collection check',f=>f.checkedAt='2026-10-06'],
  ['impossible collection check',f=>f.checkedAt='2026-02-30'],
  ['future source check',f=>f.sources[0].checkedAt='2026-10-06'],
  ['impossible source check',f=>f.sources[0].checkedAt='2026-02-30'],
  ['impossible source publication',f=>f.sources[0].publishedAt='2026-02-30'],
  ['future event date',f=>f.stories[0].eventDates=[{date:'2027-01-01',label:'future'}]],
  ['impossible event date',f=>f.stories[0].eventDates=[{date:'2026-02-30',label:'impossible'}]],
  ['duplicate story ID',f=>f.stories[1].id=f.stories[0].id],
  ['duplicate source ID',f=>f.sources[1].id=f.sources[0].id],
  ['non-text story status',f=>f.stories[0].status={reviewed:true}],
  ['fabricated human review',f=>f.editorialStatus='Human approved'],
 ];
 for(const [label,mutate] of mutations){const f=structuredClone(features);mutate(f);assert.throws(()=>validateFeatures(f,'2026-10-05'),undefined,label)}
 // Date-only validation cannot distinguish two times on the same day; preparation must.
 const future=structuredClone(features);future.preparedAt='2026-10-05T14:00:01.000Z';
 assert.throws(()=>prepareFlagship({...args,features:future}),/future_feature_preparation/);
 const futureSource=structuredClone(features);futureSource.sources[0].publishedAt='2026-10-05T14:00:01.000Z';
 assert.throws(()=>prepareFlagship({...args,features:futureSource}),/future_feature_source_publication/);
});
test('a later issue retains the original feature research date rather than relabeling old reporting',()=>{
 assert.equal(validateFeatures(features,'2026-10-06'),true);assert.equal(features.issueDate,'2026-10-05');
});

test('archive checks use saved preparation time and leave legacy and flagship records unchanged',async()=>{
 const legacy=await json('../content/ltc/2026-10-04-r1.json');
 const saved=prepareFlagship(args);
 for(const edition of [legacy,saved]){const before=JSON.stringify(edition);assert.equal(validateFlagshipRecord(edition),true);assert.equal(JSON.stringify(edition),before)}
 // The historical preparation clock, not Date.now(), owns archived quote freshness.
 const later=prepareFlagship({...args,now:'2026-10-05T14:16:00.000Z'});
 assert.equal(validateFlagshipRecord(later),true);assert.equal(later.intelligence.markets[0].state.borrowApy,null);
});

test('flagship archive gate requires every evidence group and verifies all saved digests',()=>{
 const complete=prepareFlagship(args);
 for(const key of ['flagship','intelligence','policyRecords','features']){
  const incomplete=structuredClone(complete);delete incomplete[key];assert.throws(()=>validateFlagshipRecord(incomplete),/incomplete_flagship_evidence/,key);
 }
 for(const key of ['intelligenceSha256','policySha256','featuresSha256']){
  const changed=structuredClone(complete);changed.flagship[key]='0'.repeat(64);assert.throws(()=>validateFlagshipRecord(changed),/flagship_evidence_digest_mismatch/,key);
 }
 const orphan=structuredClone(complete);delete orphan.presentation.artDirection;assert.throws(()=>validateFlagshipRecord(orphan),/incomplete_flagship_evidence/);
 const changedText=structuredClone(complete);changedText.features.stories[0].title='A different saved title';assert.throws(()=>validateFlagshipRecord(changedText),/flagship_evidence_digest_mismatch/);
});

test('rehashing cannot authorize changed sources or hide freshness and publication-time violations',()=>{
 const complete=prepareFlagship(args);
 const changedPolicy=structuredClone(complete);changedPolicy.policyRecords.sources[0].url='https://unapproved.example/rss';changedPolicy.flagship.policySha256=digest(changedPolicy.policyRecords);assert.throws(()=>validateFlagshipRecord(changedPolicy),/invalid_policy_source_identity/);
 const changedMarket=structuredClone(complete);changedMarket.intelligence.markets[0].collateral.address='0x'+'1'.repeat(40);changedMarket.flagship.intelligenceSha256=digest(changedMarket.intelligence);assert.throws(()=>validateFlagshipRecord(changedMarket),/Wrong pinned market identity/);
 const unevaluated=structuredClone(complete);unevaluated.preparedAt='2026-10-05T14:16:00.000Z';assert.throws(()=>validateFlagshipRecord(unevaluated),/flagship_freshness_not_evaluated_at_preparation/);
 const futureSource=structuredClone(complete);futureSource.features.sources[0].publishedAt='2026-10-05T14:00:01.000Z';futureSource.flagship.featuresSha256=digest(futureSource.features);assert.throws(()=>validateFlagshipRecord(futureSource),/future_feature_source_publication/);
});

test('the old preparer cannot publish an incomplete v2 issue, including on an existing-ID rerun',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-flagship-gate-'));
 try{
  const old=prepareEdition(snapshot,registry,policy,{now});assert.equal(old.presentation.artDirection.version,2);
  await assert.rejects(()=>publishEdition(old,{directory,policy}),/incomplete_flagship_evidence/);assert.deepEqual(await readdir(directory),[]);
  const complete=prepareFlagship(args);await publishEdition(complete,{directory,policy});
  const before=await readFile(path.join(directory,'index.json'),'utf8');
  await assert.rejects(()=>publishEdition(old,{directory,policy}),/incomplete_flagship_evidence/);
  const tampered=structuredClone(complete);tampered.features.stories[0].title='Changed after preparation';
  await assert.rejects(()=>publishEdition(tampered,{directory,policy}),/flagship_evidence_digest_mismatch/);
  assert.equal(await readFile(path.join(directory,'index.json'),'utf8'),before);
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('archive reads and reruns reject tampered immutable records before rebuilding the index',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-flagship-archive-'));
 try{
  const complete=prepareFlagship(args);await publishEdition(complete,{directory,policy});
  const before=await readFile(path.join(directory,'index.json'),'utf8');
  const changed=structuredClone(complete);changed.flagship.featuresSha256='f'.repeat(64);
  await writeFile(path.join(directory,`${complete.id}.json`),JSON.stringify(changed));
  await assert.rejects(()=>readEditionArchive(directory),/flagship_evidence_digest_mismatch/);
  await assert.rejects(()=>publishEdition(complete,{directory,policy}),/flagship_evidence_digest_mismatch/);
  assert.equal(await readFile(path.join(directory,'index.json'),'utf8'),before);
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('the static validation hook rejects index divergence even when both copies validate individually',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'ltc-flagship-index-'));
 try{
  const complete=prepareFlagship(args);await publishEdition(complete,{directory,policy});
  assert.equal((await validateLtcArchive({directory}))[0].id,complete.id);
  const changed=structuredClone(complete);changed.features.stories[0].title='Different but structurally valid';changed.flagship.featuresSha256=digest(changed.features);
  assert.equal(validateFlagshipRecord(changed),true);
  await writeFile(path.join(directory,'index.json'),JSON.stringify([changed]));
  await assert.rejects(()=>validateLtcArchive({directory}),/edition_index_archive_mismatch/);
 }finally{await rm(directory,{recursive:true,force:true})}
});
