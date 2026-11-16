import {pdfDisplayIssues} from './lib/ltc-pdf-registry.mjs';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const pdf='public/magazine/daily/LTC-2026-11-16-v1.0.pdf';
assert.equal(createHash('sha256').update(readFileSync(pdf)).digest('hex'),'e10b9d8bfa55259d09b95419f82bef88e9e64e5569a7b386a6a58b8651d84f5a');
const current=pdfDisplayIssues(JSON.parse(readFileSync('content/ltc-pdf/issues.json','utf8')))[0];
for(const route of ['index.html','conversations/index.html','conversations/archive/index.html','conversations/daily/index.html',current.page.slice(1)+'index.html']){
 const html=readFileSync(`dist/${route}`,'utf8');assert.ok(html.includes(current.title),route);assert.ok(html.includes(current.pdf.slice(1)),route);
 const links=[...html.matchAll(/(?:href|src)="([^"#?]+)(?:[?#][^"]*)?"/g)].map(m=>new URL(m[1],`https://example.test/${route}`).pathname).filter(p=>p===current.pdf||p===current.cover||p===current.page||p===current.page+'index.html');
 assert.ok(links.length>=2,`Expected actual PDF issue links on ${route}`);
 for(const path of links) assert.ok(existsSync(`dist${path}${path.endsWith('/')?'index.html':''}`),path);
}
for(const date of ['2026-11-15','2026-11-16']){
 const issue=pdfDisplayIssues(JSON.parse(readFileSync('content/ltc-pdf/issues.json','utf8'))).find(issue=>issue.date===date&&issue.revision===1);
 const html=readFileSync(`dist/conversations/editions/${date}/index.html`,'utf8');assert.ok(html.includes(issue.title));assert.ok(html.includes(issue.pdf.slice(1)));
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
