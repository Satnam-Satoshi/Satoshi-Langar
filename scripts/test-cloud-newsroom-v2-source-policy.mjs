import test from 'node:test';
import assert from 'node:assert/strict';
import {checkTrustedSourcePolicies,sourcePolicyKey} from './cloud-newsroom-v2-source-policy.mjs';
function fixture(kind='venue-quote'){
 const s={id:'metric',url:'https://api.exchange.coinbase.com/products/BTC-USD/ticker',metricKind:kind,classification:'current',status:'verified',claimVerified:true,retrievedAt:'2026-11-16T18:59:00Z',effectiveAt:'2026-11-16T18:59:00Z',maxRetrievalAgeSeconds:100,maxEffectiveAgeSeconds:100,snapshotSha256:'a'.repeat(64),publisherId:'coinbase',parserId:'ticker',parserVersion:'1',evidence:{kind:'snapshot',path:'evidence/ticker.json',sha256:'a'.repeat(64),retrievedAt:'2026-11-16T18:59:00Z'}};
 const key=sourcePolicyKey(s),cap=kind==='morpho'?900:7200;
 return {sources:[s],now:'2026-11-16T19:00:00Z',trustedSourcePolicies:{[key]:{classification:'current',maxRetrievalAgeSeconds:cap,maxEffectiveAgeSeconds:cap,publisherId:'coinbase',parserId:'ticker',parserVersion:'1'}},trustedEvidence:{[key]:{kind:'snapshot',bytesObserved:true,sourceId:s.id,url:s.url,snapshotSha256:s.snapshotSha256,path:s.evidence.path,retrievedAt:s.retrievedAt,publisherId:s.publisherId,parserId:s.parserId,parserVersion:s.parserVersion}}};
}
test('external exact source policy and observed snapshot permit matched source',()=>assert.equal(checkTrustedSourcePolicies(fixture()).status,'trusted-source-evidence-matched'));
test('24h bundle windows cannot relax quote2h or Morpho15min',()=>{
 for(const kind of ['venue-quote','morpho']){const x=fixture(kind);x.sources[0].maxRetrievalAgeSeconds=86400;x.sources[0].maxEffectiveAgeSeconds=86400;assert.ok(checkTrustedSourcePolicies(x).errors.includes('source_age_cap_exceeded'));}
 for(const [kind,time]of [['venue-quote','2026-11-16T16:59:59Z'],['morpho','2026-11-16T18:44:59Z']]){const x=fixture(kind);x.sources[0].effectiveAt=time;assert.ok(checkTrustedSourcePolicies(x).errors.includes('source_effective_value_stale'));}
});
test('unknown URL, absent trust, historical relabel and forged evidence hold',()=>{
 for(const mutate of [x=>delete x.trustedSourcePolicies,x=>x.sources[0].url='https://github.com/arbitrary/repo',x=>x.sources[0].classification='historical',x=>x.sources[0].snapshotSha256='b'.repeat(64),x=>x.sources[0].parserVersion='2',x=>Object.values(x.trustedEvidence)[0].bytesObserved=false,x=>x.sources[0].evidence.path='evidence/../escape']){const x=fixture();mutate(x);assert.equal(checkTrustedSourcePolicies(x).status,'hold');}
});
test('trusted caps themselves cannot exceed hard ceilings; explicit historical policy required',()=>{
 const x=fixture();Object.values(x.trustedSourcePolicies)[0].maxEffectiveAgeSeconds=86400;assert.equal(checkTrustedSourcePolicies(x).status,'hold');
 const y=fixture();y.sources[0].classification='historical';y.sources[0].effectiveAt='2020-01-01';Object.values(y.trustedSourcePolicies)[0].classification='historical';Object.values(y.trustedSourcePolicies)[0].maxEffectiveAgeSeconds=null;y.sources[0].maxEffectiveAgeSeconds=null;y.sources[0].label='Dated historical observation; not current';assert.equal(checkTrustedSourcePolicies(y).status,'trusted-source-evidence-matched');
});

import {readFileSync} from 'node:fs';
import {PRIMARY_HOSTS} from './cloud-newsroom-v2-plan.mjs';
import {inspectCloudNewsroomV2Html} from './cloud-newsroom-v2-html-safety.mjs';
test('reviewed registry URL hosts align with shared planner, manifest and HTML restriction',()=>{
 const registry=JSON.parse(readFileSync(new URL('../config/cloud-newsroom-v2-sources.json',import.meta.url),'utf8'));
 assert.ok(registry.sources.length>0);assert.equal(new Set(PRIMARY_HOSTS).size,PRIMARY_HOSTS.length);
 for(const source of registry.sources){const url=new URL(source.url);assert.equal(url.protocol,'https:');assert.equal(url.username,'');assert.equal(url.password,'');assert.ok(PRIMARY_HOSTS.includes(url.hostname),source.url);
  // Host gate is shared with HTML; a canonical origin anchor tests that same set.
  const html=`<!doctype html><html><head><title>Sources</title></head><body><a href="${url.origin}/">Source</a></body></html>`;
  assert.equal(inspectCloudNewsroomV2Html(Buffer.from(html)).status,'accepted-inert-subset',source.url);
 }
 for(const host of ['api.exchange.coinbase.com','api.blockcypher.com','litecoin.org','www.sec.gov'])assert.ok(PRIMARY_HOSTS.includes(host));
});
test('allowlisted GitHub host never grants arbitrary publisher/source policy authority',()=>{
 const x=fixture();x.sources[0].url='https://github.com/attacker/forged-release';x.sources[0].primary=true;
 assert.ok(PRIMARY_HOSTS.includes(new URL(x.sources[0].url).hostname));
 assert.ok(checkTrustedSourcePolicies(x).errors.includes('unknown_or_mismatched_source_policy'));
 for(const url of ['http://github.com/litecoin-project/litecoin','https://user:secret@github.com/litecoin-project/litecoin']){
  const y=fixture();y.sources[0].url=url;assert.equal(checkTrustedSourcePolicies(y).status,'hold');
 }
});
