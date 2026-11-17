import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {planRouteFreshness} from './route-freshness.mjs';
const hash = s => createHash('sha256').update(s).digest('hex');
function input() {
 const registry={schemaVersion:1,generation:'cloud-newsroom-v2',sources:[{id:'core',desk:'core',url:'https://example.test/core'}]};
 return {registry,expectedRegistryDigest:hash(JSON.stringify(registry)),sourceCommit:'a'.repeat(40),observedAt:'2026-11-17T00:00:00.000Z',admittedPaths:['content/ltc-pdf/issues.json'],files:[
 {path:'app/page.tsx',text:"import data from '../content/ltc-pdf/issues.json';"},
 {path:'app/layout.tsx',text:"import x from './shared';"},
 {path:'app/shared.ts',text:'// November 16, 2026'},
 {path:'content/ltc-pdf/issues.json',text:'{}'},
 {path:'app/conversations/litecoin/page.tsx',text:"import x from '@/content/research.json';\n// New reporting November 16; nov16-field-notes"},
 {path:'content/research.json',text:'{"date":"2026-10-15","source":"https://example.test/core"}'},
 {path:'app/archive/[id]/page.tsx',text:"import x from './missing'; fetch(url);"}
 ],bindings:[{route:'/conversations/litecoin/',intent:'mixed',rationale:'Retains historical research and maintained reporting.',data:[{path:'content/research.json',sourceIds:['core']}]}]};
}
test('all templates and all source IDs retained; none called refreshed',()=>{const p=planRouteFreshness(input());assert.equal(p.routes.length,3);assert.equal(p.sources.length,1);assert.ok(p.routes.every(r=>!r.verifiedRefreshed));assert.deepEqual(p.effects,[]);assert.equal(p.operational,false);assert.equal(p.publishAllowed,false);});
test('admitted issue reachability not whole-site freshness',()=>{const p=planRouteFreshness(input());assert.equal(p.routes.find(r=>r.route==='/').admittedDependencies.length,1);const r=p.routes.find(r=>r.route.includes('litecoin'));assert.equal(r.admittedDependencies.length,0);assert.deepEqual(r.outsideAdmissionData,['content/research.json']);});
test('date candidates preserve literal and line, including shared layout',()=>{const r=planRouteFreshness(input()).routes.find(r=>r.route.includes('litecoin'));assert.ok(r.datedLiterals.some(d=>d.literal==='November 16'&&d.line===2));assert.ok(r.datedLiterals.some(d=>d.path==='app/shared.ts'));});
test('dynamic paths and unresolved runtime reads are gaps',()=>{const r=planRouteFreshness(input()).routes.find(r=>r.template);assert.ok(r.gaps.includes('dynamic-route-instances-not-enumerated'));assert.ok(r.gaps.includes('runtime-data-access-needs-review'));assert.equal(r.unresolvedImports.length,1);});
test('literal URLs are candidates, not declared bindings',()=>{const i=input();i.bindings=[];const p=planRouteFreshness(i);assert.deepEqual(p.sources[0].declaredRoutes,[]);assert.deepEqual(p.sources[0].candidateRoutes,['/conversations/litecoin/']);});
test('historical label does not mutate dates',()=>{const i=input();i.bindings[0].intent='historical';const before=JSON.stringify(i);const p=planRouteFreshness(i);assert.match(p.routes.find(r=>r.intent==='historical').nextAction,/preserve/);assert.equal(JSON.stringify(i),before);assert.ok(Object.isFrozen(p.routes));});
test('import cycles terminate',()=>{const i=input();i.files.find(f=>f.path==='app/shared.ts').text="import './layout';";assert.equal(planRouteFreshness(i).routes.length,3);});
for(const [name,edit] of [
 ['duplicate source',i=>{i.registry.sources.push(i.registry.sources[0]);i.expectedRegistryDigest=hash(JSON.stringify(i.registry));}],
 ['digest mismatch',i=>i.expectedRegistryDigest='0'.repeat(64)],
 ['duplicate file',i=>i.files.push(i.files[0])],
 ['path traversal',i=>i.files[0].path='../app/page.tsx'],
 ['invalid date',i=>i.observedAt='2026-02-30T00:00:00.000Z'],
 ['missing commit',i=>delete i.sourceCommit],
 ['duplicate admitted path',i=>i.admittedPaths.push(i.admittedPaths[0])],
 ['unknown binding route',i=>i.bindings[0].route='/missing/'],
 ['unknown source',i=>i.bindings[0].data[0].sourceIds=['unregistered']],
 ['unreachable binding',i=>i.bindings[0].data[0].path='content/ltc-pdf/issues.json'],
 ['duplicate binding',i=>i.bindings.push(i.bindings[0])],
 ['empty source bindings',i=>i.bindings[0].data[0].sourceIds=[]],
 ['route group collision',i=>i.files.push({path:'app/(group)/page.tsx',text:''})]
]) test(`rejects ${name}`,()=>{const i=input();edit(i);assert.throws(()=>planRouteFreshness(i));});
test('shared layout admission is not page-body admission',()=>{const i=input();i.files.find(f=>f.path==='app/shared.ts').text="import data from '../content/ltc-pdf/issues.json';";const r=planRouteFreshness(i).routes.find(r=>r.route.includes('litecoin'));assert.deepEqual(r.pageOnlyAdmittedDependencies,[]);assert.deepEqual(r.sharedLayoutOnlyAdmittedDependencies,['content/ltc-pdf/issues.json']);});
