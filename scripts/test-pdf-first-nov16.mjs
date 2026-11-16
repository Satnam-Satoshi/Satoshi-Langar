import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const pdf='public/magazine/daily/LTC-2026-11-16-v1.0.pdf';
assert.equal(createHash('sha256').update(readFileSync(pdf)).digest('hex'),'e10b9d8bfa55259d09b95419f82bef88e9e64e5569a7b386a6a58b8651d84f5a');
for(const route of ['index.html','conversations/index.html','conversations/archive/index.html','conversations/daily/index.html','conversations/editions/2026-11-16/index.html']){
 const html=readFileSync(`dist/${route}`,'utf8');assert.ok(html.includes('The Next Build'),route);assert.ok(html.includes('magazine/daily/LTC-2026-11-16-v1.0.pdf'),route);
 const links=[...html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)].map(m=>new URL(m[1],`https://example.test/${route}`).pathname).filter(p=>p.includes('LTC-2026-11-16')||p==='/conversations/editions/2026-11-16/');
 assert.ok(links.length>=2,`Expected actual PDF issue links on ${route}`);
 for(const path of links) assert.ok(existsSync(`dist${path}${path.endsWith('/')?'index.html':''}`),path);
 assert.ok(html.includes('Latest published · November 16, 2026'),route);

}
assert.equal(createHash('sha256').update(readFileSync('dist/magazine/daily/LTC-2026-11-16-v1.0.pdf')).digest('hex'),'e10b9d8bfa55259d09b95419f82bef88e9e64e5569a7b386a6a58b8651d84f5a');
assert.ok(readFileSync('app/components/LtcPdfIssue.module.css','utf8').includes('@media(max-width:640px)'));
console.log('PASS: immutable PDF hash, five routes, asset/dated links, responsive breakpoint.');
const deploymentConfig=JSON.parse(readFileSync('vercel.json','utf8'));
assert.equal(deploymentConfig.buildCommand,'pnpm build && pnpm release:prepare');
for(const name of ['litecoin-chain','litecoin-register','market-prices','morpho-markets'])assert.ok(existsSync(`.vercel/output/functions/api/${name}.func/.vc-config.json`),`Missing API function ${name}`);
console.log('PASS: Git deployment command prepares all four API functions.');

assert.ok(readFileSync('dist/conversations/editions/2026-11-15/index.html','utf8').includes('The Evidence Issue'));
assert.equal(createHash('sha256').update(readFileSync('dist/magazine/daily/LTC-2026-11-15-v1.0.pdf')).digest('hex'),'66ee76923773b2b718ff0b957bdd4df982e471f4c21b76630bcdfca12efdb3ac');
