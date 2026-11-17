import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
import {deskDataSha256,planDeskRevisionAppend} from './desk-revisions.mjs';
import {observeDeskGitObjects} from './git-object-observer.mjs';
import {DESK_MODULE_PATH,planDeskDataAdmission} from './desk-data-admission.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
test('real committed empty baseline → actual append commit → full observer → admission',t=>{
 const repoRoot=mkdtempSync(join(tmpdir(),'desk-admission-e2e-'));t.after(()=>rmSync(repoRoot,{recursive:true,force:true}));
 const git=(...args)=>execFileSync('/usr/bin/git',['-C',repoRoot,...args],{encoding:'utf8'}).trim();
 git('init','-q');git('config','user.name','Local Test');git('config','user.email','test@example.invalid');mkdirSync(join(repoRoot,'content/desks'),{recursive:true});mkdirSync(join(repoRoot,'app'));
 const prior={schemaVersion:1,records:[]},emptyBytes=Buffer.from('{"records":[],"schemaVersion":1}');writeFileSync(join(repoRoot,DESK_MODULE_PATH),emptyBytes);writeFileSync(join(repoRoot,'app/page.tsx'),'unchanged reviewed template');writeFileSync(join(repoRoot,'asset.bin'),Buffer.from([0,255,13]));git('add','.');git('commit','-qm','Explicit fixture bootstrap');
 const observe=()=>observeDeskGitObjects({repoRoot,sourceCommit:git('rev-parse','HEAD'),treeGitSha:git('rev-parse','HEAD^{tree}')});const before=observe();
 const now='2026-11-17T12:00:00Z',url='https://example.org/issuer',sourceBytes=Buffer.from('independently read fixture issuer statement'),payload={value:12,unit:'LTC',limitations:['Synthetic fixture, not real research.']},provenance={materialDigest:sha('reviewed extraction'),evidenceLocator:'evidence/issuer.txt',parserId:'plain-text',parserVersion:'1',publisherId:'fixture-issuer'};
 const registry={schemaVersion:1,generation:'cloud-newsroom-v2',sources:[{id:'issuer',desk:'treasury desk',url}]};
 const r={id:'treasury-r1',deskId:'treasury desk',revision:1,parentSha256:null,preparedAt:now,kind:'historical',asOf:'2026-11-15',payload,evidence:[{sourceId:'issuer',url,sha256:sha(sourceBytes),retrievedAt:'2026-11-17T11:59:00Z',...provenance}]};
 const common={now,registry,trustedRegistrySha256:deskDataSha256(registry),sourcePolicies:{issuer:{sourceId:'issuer',url,kind:'historical',metricKind:'primary-current',maxRetrievalAgeSeconds:86400,maxEffectiveAgeSeconds:null,expiresAt:'2026-11-17T12:02:00Z',...provenance}},evidenceInventory:[{sourceId:'issuer',url,bytes:sourceBytes,sha256:sha(sourceBytes),retrievedAt:r.evidence[0].retrievedAt,asOf:r.asOf,kind:'historical',metricKind:'primary-current',reviewedDataSha256:deskDataSha256(payload),...provenance}]};
 const append=planDeskRevisionAppend({...common,prior,trustedPriorSha256:sha(emptyBytes),proposed:[r]});writeFileSync(join(repoRoot,DESK_MODULE_PATH),append.moduleJson);git('add',DESK_MODULE_PATH);git('commit','-qm','Fixture single data append');const candidate=observe();
 const input=observation=>({...common,priorObservation:before.observation,candidateObservation:observation.observation,priorModuleBytes:before.moduleBytes,candidateModuleBytes:observation.moduleBytes,trustedPriorModuleSha256:sha(emptyBytes),trustedPins:{priorSourceCommit:before.observation.sourceCommit,priorTreeGitSha:before.observation.treeGitSha,priorInventorySha256:before.inventorySha256,candidateSourceCommit:observation.observation.sourceCommit,candidateTreeGitSha:observation.observation.treeGitSha,candidateInventorySha256:observation.inventorySha256}});
 const accepted=planDeskDataAdmission(input(candidate));assert.equal(accepted.status,'eligible-for-nonproduction-review');assert.deepEqual(accepted.appendedIds,['treasury-r1']);assert.equal(accepted.writeAuthorized,false);assert.deepEqual(Buffer.from(candidate.moduleBytes),Buffer.from(append.moduleJson));
 assert.throws(()=>planDeskDataAdmission({...input(candidate),now:'2026-11-17T12:02:00Z'}),/stale source policy/);
 writeFileSync(join(repoRoot,'app/page.tsx'),'unreviewed code edit');git('add','app/page.tsx');git('commit','-qm','Fixture forbidden code change');const bad=observe();assert.throws(()=>planDeskDataAdmission(input(bad)),/unrelated file change/);
 // A dirty local file is not a commit and cannot alter the observed candidate.
 writeFileSync(join(repoRoot,DESK_MODULE_PATH),'bad working bytes');const pinnedAgain=observeDeskGitObjects({repoRoot,sourceCommit:candidate.observation.sourceCommit,treeGitSha:candidate.observation.treeGitSha});assert.equal(pinnedAgain.inventorySha256,candidate.inventorySha256);assert.equal(planDeskDataAdmission(input(pinnedAgain)).status,'eligible-for-nonproduction-review');
});
