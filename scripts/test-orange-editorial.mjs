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
test('print-inspired reading map links evidence without importing PDF financial observations', async()=>{
 const map=await read('app/components/EditorialReadingMap.tsx');
 for(const desk of ['Market tape','Flows & funds','Litecoin Register','Morpho','Builders','Policy','Sourcebook']) assert.ok(map.includes(desk));
 assert.match(map,/holdings and flows are different/);
 assert.doesNotMatch(map,/83\.58|785,?000|3\.28/);
 const reader=await read('app/components/LtcFlagship.tsx');
 assert.match(reader,/<EditorialReadingMap sourcebookHref="#sourcebook"/);
 const css=await read('app/components/editorial-reading-map.module.css');
 assert.match(css,/@media\(max-width:600px\)/);assert.match(css,/:focus-visible/);
});
