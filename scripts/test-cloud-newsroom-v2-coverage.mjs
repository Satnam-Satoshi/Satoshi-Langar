import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCoverage, digest, bytesDigest} from './cloud-newsroom-v2-coverage.mjs';
const now = '2026-11-16T12:00:00.000Z';
const past = '2026-11-16T11:00:00.000Z';
const hash = bytesDigest('story');
function fixture() {
 const registry={desks:[{id:'core'},{id:'ecosystem'},{id:'uncovered'}],sources:[{id:'core',deskId:'core',maxAgeMs:7200000},{id:'vm',deskId:'ecosystem',maxAgeMs:7200000},{id:'network',deskId:'ecosystem',maxAgeMs:7200000},{id:'extra',deskId:'uncovered',maxAgeMs:7200000}]};
 const pin=digest(registry);
 const outline={registryDigest:pin,platforms:['x','instagram'],stories:Array.from({length:5},(_,i)=>({id:`story${i}`,deskId:'core',storyDigest:hash,sourceIds:['core'],editorialState:'prepared'}))};
 const material={version:'0.21.4'};
 return {now,registry,expectedRegistryDigest:pin,expectedOutlineDigest:digest(outline),outline,
 scan:{registryDigest:pin,sources:[{id:'core',attemptedAt:past,retrievalExpiresAt:'2026-11-17T11:00:00.000Z',outcome:'retrieved',contentDigest:bytesDigest('actual bytes')},{id:'vm',attemptedAt:past,retrievalExpiresAt:'2026-11-17T11:00:00.000Z',outcome:'retrieved',contentDigest:bytesDigest('opaque')},{id:'network',attemptedAt:past,outcome:'unavailable'}]},
 extractions:{registryDigest:pin,sources:[{id:'core',verification:'independently-verified',parserId:'core-release-v1',evidenceLocator:'archive/raw/core',observedBytes:'actual bytes',contentDigest:bytesDigest('actual bytes'),retrievedAt:past,observedAt:past,verifiedAt:now,expiresAt:'2026-11-17T11:00:00.000Z',material,materialDigest:digest(material)}]},
 marketing:{registryDigest:pin,batches:[]}};
}
const rep=(id,platform='x')=>({id,platform,storyDigest:hash,assetState:'prepared',assetDigest:hash,postState:'published',receiptId:'receipt-1',reportedAt:now});
test('every declared desk/source/story and platform survives; explicit gaps and no operational claim',()=>{
 const f=fixture(), out=compileCoverage(f);
 assert.equal(out.desks.length,3); assert.equal(out.sources.length,4);assert.equal(out.stories.length,5);
 assert.deepEqual(out.sources.map(s=>s.status),['verified-current','needs-extraction','unavailable','not-attempted']);
 assert.equal(out.desks[0].editorialReady,true); assert.equal(out.desks[1].editorialReady,false);
 assert.deepEqual(out.desks[1].gaps,['vm','network']);
 assert.equal(out.publishAllowed,false);assert.equal(out.operational,false);assert.deepEqual(out.effects,[]);
 assert.ok(out.stories.every(s=>s.campaigns.length===2 && s.campaigns.every(c=>c.assetState==='pending'&&c.postState==='pending')));
 assert.equal(out.sources[0].change,'first-observation');
});
test('two-item batches preserve all five stories and missing platforms, with reported not verified publication',()=>{
 const f=fixture();f.marketing.batches=[{stories:[rep('story0'),rep('story1')]},{stories:[rep('story2'),rep('story3')]}];
 const out=compileCoverage(f);assert.equal(out.stories.length,5);
 assert.equal(out.stories[0].campaigns[0].postState,'published-reported');
 assert.equal(out.stories[0].campaigns[0].publicationVerified,false);
 assert.equal(out.stories[0].campaigns[1].postState,'pending');assert.equal(out.stories[4].campaigns[0].postState,'pending');
});
test('same story across platforms is allowed, duplicate pair across batches fails',()=>{
 const f=fixture();f.marketing.batches=[{stories:[rep('story0'),rep('story0','instagram')]}];compileCoverage(f);
 f.marketing.batches.push({stories:[rep('story0')]});assert.throws(()=>compileCoverage(f),/duplicate/);
});
test('material and retrieval-only independent of content digest',()=>{
 const f=fixture(), r=f.extractions.sources[0];r.previousMaterialDigest=r.materialDigest;
 assert.equal(compileCoverage(f).sources[0].change,'retrieval-only');r.previousMaterialDigest=hash;
 assert.equal(compileCoverage(f).sources[0].change,'material-change');
});
test('fresh retrieval cannot rescue old observation; boundary expires precisely',()=>{
 const f=fixture(),r=f.extractions.sources[0];r.observedAt='2026-11-16T10:00:00.001Z';
 assert.equal(compileCoverage(f).sources[0].status,'verified-current');
 r.observedAt='2026-11-16T10:00:00.000Z';const out=compileCoverage(f);
 assert.equal(out.sources[0].status,'verified-stale');assert.equal(out.stories[0].storyState,'pending');assert.equal(out.desks[0].editorialReady,false);
});
test('retrieved uninterpreted never becomes verified or ready',()=>{const f=fixture();f.extractions.sources=[];const out=compileCoverage(f);assert.equal(out.sources[0].status,'needs-extraction');assert.equal(out.stories[0].storyState,'pending');});
test('input is not mutated and output deep frozen',()=>{const f=fixture(),before=JSON.stringify(f),out=compileCoverage(f);assert.equal(JSON.stringify(f),before);assert.ok(Object.isFrozen(out.stories[0].campaigns[0]));});
const invalid={
 'wrong registry pin':f=>{f.expectedRegistryDigest=hash},
 'registry tampered':f=>{f.registry.sources[0].maxAgeMs=9},
 'scan envelope pin':f=>{f.scan.registryDigest=hash},
 'extraction envelope pin':f=>{f.extractions.registryDigest=hash},
 'outline envelope pin':f=>{f.outline.registryDigest=hash},
 'marketing envelope pin':f=>{f.marketing.registryDigest=hash},
 'unknown scan source':f=>{f.scan.sources[0].id='unknown'},
 'duplicate scan source':f=>{f.scan.sources.push(f.scan.sources[0])},
 'unknown extraction source':f=>{f.extractions.sources[0].id='unknown'},
 'duplicate extraction source':f=>{f.extractions.sources.push(f.extractions.sources[0])},
 'missing bytes':f=>{delete f.extractions.sources[0].observedBytes},
 'different observed bytes':f=>{f.extractions.sources[0].observedBytes='changed'},
 'missing content digest':f=>{delete f.scan.sources[0].contentDigest},
 'missing evidence locator':f=>{delete f.extractions.sources[0].evidenceLocator},
 'missing parser':f=>{delete f.extractions.sources[0].parserId},
 'self verified claim':f=>{f.extractions.sources[0].verification='verified'},
 'missing material':f=>{delete f.extractions.sources[0].material},
 'empty material':f=>{f.extractions.sources[0].material={}},
 'material mismatch':f=>{f.extractions.sources[0].material.version='fake'},
 'future observed':f=>{f.extractions.sources[0].observedAt='2026-11-17T12:00:00.000Z'},
 'future retrieved':f=>{f.extractions.sources[0].retrievedAt='2026-11-17T12:00:00.000Z'},
 'future verified':f=>{f.extractions.sources[0].verifiedAt='2026-11-17T12:00:00.000Z'},
 'future attempted':f=>{f.scan.sources[0].attemptedAt='2026-11-17T12:00:00.000Z'},
 'impossible date':f=>{f.scan.sources[0].attemptedAt='2026-02-30T12:00:00.000Z'},
 'unbound retrieval':f=>{f.extractions.sources[0].retrievedAt='2026-11-16T10:00:00.000Z'},
 'extraction without attempt':f=>{f.scan.sources.shift()},
 'unavailable with record':f=>{f.scan.sources[0].outcome='unavailable'},
 'outline digest mismatch':f=>{f.outline.stories[0].storyDigest=bytesDigest('other')},
 'unknown marketing story':f=>{f.marketing.batches=[{stories:[rep('unknown')]}]},
 'unknown marketing platform':f=>{f.marketing.batches=[{stories:[rep('story0','other')]}]},
 'marketing story digest mismatch':f=>{const r=rep('story0');r.storyDigest=bytesDigest('wrong');f.marketing.batches=[{stories:[r]}]},
 'published no receipt':f=>{const r=rep('story0');delete r.receiptId;f.marketing.batches=[{stories:[r]}]},
 'prepared no asset digest':f=>{const r=rep('story0');delete r.assetDigest;f.marketing.batches=[{stories:[r]}]},
 'future marketing report':f=>{const r=rep('story0');r.reportedAt='2026-11-17T12:00:00.000Z';f.marketing.batches=[{stories:[r]}]}
};
for(const [name,mutate] of Object.entries(invalid)) test(`fail closed: ${name}`,()=>{const f=fixture();mutate(f);assert.throws(()=>compileCoverage(f),/Coverage contract/)});
for(const [name,mutate] of Object.entries({
 'duplicate story':f=>f.outline.stories.push(f.outline.stories[0]),
 'unknown story source':f=>f.outline.stories[0].sourceIds=['unknown'],
 'missing story sources':f=>f.outline.stories[0].sourceIds=[],
 'duplicate story sources':f=>f.outline.stories[0].sourceIds=['core','core'],
 'unknown story desk':f=>f.outline.stories[0].deskId='unknown',
 'duplicate platform':f=>f.outline.platforms.push('x')
}))test(`fail closed trusted outline: ${name}`,()=>{const f=fixture();mutate(f);f.expectedOutlineDigest=digest(f.outline);assert.throws(()=>compileCoverage(f),/Coverage contract/)});

test('existing scanner and registry contract preserves exact desk labels and raw JSON pin',()=>{
 const f=fixture();
 f.registry={schemaVersion:1,generation:'cloud-newsroom-v2',sources:[{id:'core',desk:'canton & ltc',url:'https://example.test/core',maxCheckAgeHours:24}]};
 f.expectedRegistryDigest=bytesDigest(JSON.stringify(f.registry));
 for(const envelope of [f.extractions,f.outline,f.marketing]) envelope.registryDigest=f.expectedRegistryDigest;
 f.outline.stories=f.outline.stories.map(s=>({...s,deskId:'canton & ltc'}));f.expectedOutlineDigest=digest(f.outline);
 f.scan={schemaVersion:1,generation:'cloud-newsroom-v2',mode:'read-only-source-scan',registrySha256:f.expectedRegistryDigest,observations:[{sourceId:'core',url:'https://example.test/core',checkedAt:past,retrievalExpiresAt:'2026-11-17T11:00:00.000Z',status:'retrieved-uninterpreted',sha256:bytesDigest('actual bytes')}]};
 const out=compileCoverage(f);assert.equal(out.desks[0].id,'canton & ltc');assert.equal(out.sources[0].status,'verified-current');
 f.scan.observations[0].retrievalExpiresAt=now;assert.equal(compileCoverage(f).sources[0].status,'verified-stale');
 delete f.scan.observations[0].retrievalExpiresAt;assert.throws(()=>compileCoverage(f),/retrieval expiry/);
 f.scan.observations[0].url='https://example.test/wrong';assert.throws(()=>compileCoverage(f),/URL\/source mismatch/);
});
test('JSON canonicalization cannot accept undefined or nonfinite material values',()=>{assert.throws(()=>digest({a:undefined}));assert.throws(()=>digest({a:Infinity}));});

for (const bound of ['scanner','extraction-policy']) test(`${bound} expiry wins at exact boundary and cannot be extended by another source`,()=>{
 const f=fixture();
 const target=bound==='scanner'?f.scan.sources[0]:f.extractions.sources[0];
 const key=bound==='scanner'?'retrievalExpiresAt':'expiresAt';
 target[key]='2026-11-16T12:00:00.001Z';
 let out=compileCoverage(f);assert.equal(out.sources[0].status,'verified-current');assert.equal(out.sources[0].evidence.effectiveExpiresAt,target[key]);
 target[key]=now;out=compileCoverage(f);assert.equal(out.sources[0].status,'verified-stale');assert.equal(out.desks[0].editorialReady,false);assert.equal(out.stories[0].storyState,'pending');
 target[key]='2026-11-16T11:59:59.999Z';assert.equal(compileCoverage(f).sources[0].status,'verified-stale');
});
for (const [name,change] of Object.entries({
 'missing scanner expiry':f=>{delete f.scan.sources[0].retrievalExpiresAt},
 'malformed scanner expiry':f=>{f.scan.sources[0].retrievalExpiresAt='2026-11-31T11:00:00.000Z'},
 'scanner expiry before retrieval':f=>{f.scan.sources[0].retrievalExpiresAt=past},
 'missing extraction-policy expiry':f=>{delete f.extractions.sources[0].expiresAt},
 'malformed extraction-policy expiry':f=>{f.extractions.sources[0].expiresAt='tomorrow'},
 'extraction-policy expiry before observation':f=>{f.extractions.sources[0].expiresAt=past}
})) test(`fail closed: ${name}`,()=>{const f=fixture();change(f);assert.throws(()=>compileCoverage(f),/Coverage contract/)});
