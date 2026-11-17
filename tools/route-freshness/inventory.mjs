// Read-only snapshot adapter. Never executes the inspected application or creates a deployment.
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { planRouteFreshness } from './route-freshness.mjs';
import { readPinnedSnapshot } from './snapshot.mjs';
if(process.argv.length!==4||!process.argv[2]||!/^[a-f0-9]{40}$/.test(process.argv[3]??''))throw new Error('Usage: node inventory.mjs <repository-path> <exact-40hex-commit>');
const repo=resolve(process.argv[2]);
const {commit,files}=readPinnedSnapshot(repo,process.argv[3]);
const registry=JSON.parse(files.find(f=>f.path==='config/cloud-newsroom-v2-sources.json').text);
const bindings=[
 {route:'/conversations/litecoin/',intent:'mixed',rationale:'Source reviewed: dated research plus November 16 reporting; actual source-to-data binding still requires editorial mapping.',data:[]},
 {route:'/treasury/',intent:'maintained',rationale:'Source explicitly states historical registry and public daily dataset not live; no current dataset binding asserted.',data:[]},
 ...['/conversations/editions/2026-11-15/','/conversations/editions/2026-11-16/','/conversations/litecoin/research/2026-10-04/','/conversations/specials/2026-11-16-ecosystem/'].map(route=>({route,intent:'historical',rationale:'Explicitly dated edition/research snapshot; preserve evidence dates, not rollover targets.',data:[]}))
];
const p=planRouteFreshness({files,registry,sourceCommit:commit,observedAt:new Date().toISOString(),expectedRegistryDigest:createHash('sha256').update(JSON.stringify(registry)).digest('hex'),admittedPaths:['content/ltc-pdf/issues.json'],bindings});
console.log(JSON.stringify({...p,admissionScopeNote:'Only shared issues registry represented as an admitted code dependency. Four issue-specific static PDF/HTML/cover/promo assets are not imported code and remain outside this graph. No broader admission authority implied.'},null,2));
