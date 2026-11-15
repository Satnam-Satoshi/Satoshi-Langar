import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const page = readFileSync(new URL('../app/donate/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/donate/fundraising.module.css', import.meta.url), 'utf8');
test('support stays connected to canonical payment data and copy behavior',()=>{
 assert.match(page,/import donations from '\.\.\/\.\.\/config\/donations.json'/);
 for(const hook of ['data-address-copy','data-receiving-address','data-copy-button','data-copy-status','data-payment-link'])assert.ok(page.includes(hook));
 assert.ok(!page.includes('bc1q')); assert.ok(!page.includes('ltc1q'));
});
test('fundraising story distinguishes actual work, proposals and financial limits',()=>{
 for(const phrase of ['Gyan Kaur Memorial Foundation','founder-controlled','not represented as Foundation-owned','not an operating kitchen','Proposed services','not represented as tax-deductible','does not imply their sponsorship','No campaign target'])assert.ok(page.includes(phrase),phrase);
});
test('every chapter has a target, support includes accessible copy status',()=>{
 for(const id of ['story','priorities','agents','partner','support'])assert.ok(page.includes(`id="${id}"`),id);
 assert.match(page,/aria-live="polite"/); assert.match(page,/aria-labelledby="support-title"/);
 assert.ok(css.includes('@media(max-width:800px)')); assert.ok(css.includes('overflow-wrap:anywhere'));
});
