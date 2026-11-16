import test from 'node:test';import assert from 'node:assert/strict';import {inputs} from './test-cloud-newsroom-v2-marketing-adapter.mjs';
import {prepareV2StoryCovers as prepare,bindRenderedV2Assets as bind,rendererInputSha256} from './cloud-newsroom-v2-marketing-adapter.mjs';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import {spawnSync} from 'node:child_process';
test('actual cloud renderer normalized PNG and canonical manifest enter strict nonpublishing admission',()=>{
 const x=inputs(),p=prepare({...x,batchSize:1}),c=p.covers[0],d=mkdtempSync(join(tmpdir(),'ltc-v21-e2e-'));mkdirSync(join(d,'evidence'));
 writeFileSync(join(d,'metadata.json'),JSON.stringify(c.coverMetadata));writeFileSync(join(d,'evidence.json'),c.rendererEvidenceJson);
 for(const f of c.evidenceFiles)writeFileSync(join(d,f.relativePath),Buffer.from(f.base64,'base64'));
 const py="import sys,json,datetime;from pathlib import Path;sys.path.insert(0,sys.argv[1]);from renderer import render;m=json.loads(Path(sys.argv[2]).read_text());render(m,sys.argv[3],sys.argv[4],today=datetime.date(2026,11,17))";
 const r=spawnSync(process.env.LTC_MARKETING_PYTHON??'python3',['-c',py,resolve('tools/cloud-marketing'),join(d,'metadata.json'),join(d,'output'),join(d,'evidence.json')],{timeout:90000,encoding:'utf8'});assert.equal(r.status,0,r.stderr);
 const m=JSON.parse(readFileSync(join(d,'output',c.storyId+'.manifest.json'))),bytes=readFileSync(m.artifact.png);assert.equal(m.input_sha256,rendererInputSha256(c.coverMetadata));
 assert.match(readFileSync(m.artifact.svg,'utf8'),/Read the full edition/);assert.doesNotMatch(readFileSync(m.artifact.svg,'utf8'),/Read the ecosystem special/);
 const result=bind({...x,preparation:p,renderedByStory:new Map([[c.storyId,{bytes,visualQa:'passed',inputMetadataSha256:m.input_sha256}]])});
 assert.equal(result.admission.status,'nonpublishing-marketing-asset-plan');assert.equal(result.admission.publishAllowed,false);assert.equal(result.admission.assetCopies[0].sha256,m.artifact.sha256);assert.equal(result.admission.assetCopies[0].bytes,bytes.length);
 console.log('SYNTHETIC_E2E_PASSED',JSON.stringify({directory:d,sha256:m.artifact.sha256,bytes:bytes.length,rendererVersion:m.renderer_version,publishAllowed:false}));
});
