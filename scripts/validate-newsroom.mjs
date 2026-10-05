import {readFile,readdir} from 'node:fs/promises';
import {validateNewsroom} from './prepare-ltc-newsroom.mjs';
import {validateCommunitySnapshot} from './lib/ltc-community.mjs';
const dir=new URL('../content/ltc-newsroom/',import.meta.url);
const files=(await readdir(dir)).filter(f=>f.endsWith('.json'));
for(const name of files)validateNewsroom(JSON.parse(await readFile(new URL(name,dir),'utf8')));
const community=JSON.parse(await readFile(new URL('../content/ltc-community/latest.json',import.meta.url),'utf8'));
validateCommunitySnapshot(community,{now:community.collectedAt});
console.log(`PASS: ${files.length} newsroom records and community snapshot at their saved validation clocks.`);
