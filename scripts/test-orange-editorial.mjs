import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('community front door links newcomers, published magazine and independent evidence', async()=>{
 const [home,journey]=await Promise.all([read('app/components/HomeFront.tsx'),read('app/components/CommunityJourney.tsx')]);
 assert.match(home,/CommunityJourney/);assert.match(home,/RegisterInvitation/);
 for(const href of ['/conversations/start/','/conversations/','/join/','https://litecoinregister.com/']) assert.ok(journey.includes(href));
 assert.match(journey,/Independent third-party tracker/);assert.match(journey,/Protocol context \/ Not register totals/);
 assert.match(home,/No wallet or purchase required/);
});
test('magazine front door renders the saved headline jacket instead of bare art', async()=>{
 const magazine=await read('app/conversations/page.tsx');
 assert.match(magazine,/<LtcEditionCover edition=\{issue\} mode="thumbnail"\/>/);
 assert.match(magazine,/data-site="magazine"/);assert.match(magazine,/RegisterInvitation/);
 assert.doesNotMatch(magazine,/const issueArtwork=/);
});
test('orange hero links have contrasting keyboard focus', async()=>{
 const css=await read('app/components/HomeFront.module.css');
 assert.match(css,/\.communityLinks a:focus-visible\s*\{\s*outline:3px solid #102638/);
});
