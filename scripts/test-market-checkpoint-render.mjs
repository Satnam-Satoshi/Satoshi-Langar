import test from 'node:test';import assert from 'node:assert/strict';
import {build} from 'esbuild';import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
const require=createRequire(import.meta.url);
async function render(sources){
 const result=await build({entryPoints:['app/components/MarketCheckpoint.tsx'],bundle:true,write:false,platform:'node',format:'cjs',jsx:'automatic',packages:'external',plugins:[{name:'fixture',setup(b){b.onLoad({filter:/ltc-snapshot\.json$/},()=>({contents:JSON.stringify({sources}),loader:'json'}));b.onLoad({filter:/\.css$/},()=>({contents:'export default {}',loader:'js'}));}}]});
 const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
 return renderToStaticMarkup(React.createElement(module.exports.default));
}
test('unavailable rendered snapshot retains real timestamp hooks for the first fresh quote',async()=>{
 const html=await render([]),nodes=new Map();
 for(const match of html.matchAll(/<[^>]+\b(data-market-[\w-]+)(?:="([^"]*)")?[^>]*>([^<]*)/g))nodes.set(`[${match[1]}${match[2]?`="${match[2]}"`:''}]`,{textContent:match[3]});
 for(const product of ['BTC-USD','LTC-USD'])assert.equal(nodes.get(`[data-market-time="${product}"]`)?.textContent,'No accepted source observation');
 assert.match(html,/Fresh quote unavailable/);assert.doesNotMatch(html,/<time[^>]*dateTime=/i);
 const root={querySelector:s=>nodes.get(s)??null,querySelectorAll:s=>nodes.has(s)?[nodes.get(s)]:[]};
 const now=Date.now(),stamp=new Date(now).toISOString(),payload={schemaVersion:1,status:'fresh',source:'Coinbase Exchange',checkedAt:stamp,quotes:[{product:'BTC-USD',price:90000,observedAt:stamp},{product:'LTC-USD',price:90,observedAt:stamp}]};
 runInNewContext(await readFile('scripts/browser/market-live.mjs','utf8'),{document:{querySelector:()=>root,hidden:false,addEventListener(){}},window:{addEventListener(){}},location:{hostname:'ltcmagazine.org'},Date,Intl,Number,Array,JSON,Error,AbortController,setTimeout,clearTimeout,setInterval:()=>1,clearInterval(){},fetch:async()=>Response.json(payload)});
 await new Promise(resolve=>setImmediate(resolve));
 for(const product of ['BTC-USD','LTC-USD']){assert.equal(nodes.get(`[data-market-time="${product}"]`).textContent,stamp);assert.equal(nodes.get(`[data-market-time="${product}"]`).dateTime,stamp);}
 assert.equal(nodes.get('[data-market-price="LTC-USD"]').textContent,'$90.00');
});
test('saved valid quote retains exact source date and is labeled nonlive',async()=>{
 const stamp='2026-11-18T12:00:00Z',html=await render([{id:'coinbase-btc-usd',status:'collected',sourceAsOf:stamp,observations:[{value:'90000'}]}]);
 assert.match(html,/Saved source observations/);assert.match(html,/are not live/);assert.match(html,/datetime="2026-11-18T12:00:00Z"/i);assert.match(html,/\$90,000.00/);assert.match(html,/No accepted source observation/);
});
