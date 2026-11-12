import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=p=>readFile(new URL('../'+p,import.meta.url),'utf8');
test('custom magazine interiors implement the approved design, not only shell tokens',async()=>{
 const files=['app/conversations/desks/desks.module.css','app/conversations/magazine.module.css','app/conversations/issue.module.css','app/conversations/about/about.module.css','app/conversations/community/wire.module.css','app/conversations/litecoin/litecoin.module.css','app/conversations/litecoin-distribution/distribution.module.css','app/conversations/daily/daily.module.css','app/components/OpenMoney.module.css'];
 for(const file of files){const css=await read(file);assert.match(css,/Approved interior design/);assert.match(css,/font-family:var\(--font-sans\);font-weight:(850|900)/);assert.match(css,/#f7931a/);}
});
