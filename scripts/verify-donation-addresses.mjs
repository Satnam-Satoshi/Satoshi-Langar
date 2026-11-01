import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
export function validateAddress(address, expectedHrp) {
 if (address !== address.toLowerCase() || address.length > 90) return false;
 const separator = address.lastIndexOf('1');
 if (address.slice(0,separator)!==expectedHrp) return false;
 const alphabet='qpzry9x8gf2tvdw0s3jn54khce6mua7l';
 const data=[...address.slice(separator+1)].map(c=>alphabet.indexOf(c));
 if(data.length<7||data.some(n=>n<0)||data[0]!==0) return false;
 const values=[...[...expectedHrp].map(c=>c.charCodeAt(0)>>5),0,...[...expectedHrp].map(c=>c.charCodeAt(0)&31),...data];
 let chk=1; const g=[0x3b6a57b2,0x26508e6d,0x1ea119fa,0x3d4233dd,0x2a1462b3];
 for(const v of values){const top=chk>>>25;chk=((chk&0x1ffffff)<<5)^v;for(let i=0;i<5;i++)if((top>>>i)&1)chk^=g[i];}
 if((chk>>>0)!==1) return false;
 let acc=0,bits=0,bytes=[];
 for(const v of data.slice(1,-6)){acc=(acc<<5)|v;bits+=5;while(bits>=8){bits-=8;bytes.push((acc>>bits)&255);}}
 return bits<5 && ((acc<<(8-bits))&255)===0 && [20,32].includes(bytes.length);
}
const data=JSON.parse(readFileSync(new URL('../config/donations.json',import.meta.url),'utf8'));
for(const item of data.destinations){assert(validateAddress(item.address,item.hrp),`Invalid ${item.asset} address`);assert(!validateAddress(item.address,item.hrp==='bc'?'ltc':'bc'));assert.equal(item.uri,`${item.scheme}:${item.address}`);assert(!validateAddress(item.address.slice(0,-1)+(item.address.endsWith('q')?'p':'q'),item.hrp));}
console.log('PASS: BTC/LTC network prefix, Bech32 checksum, witness length, URI match, corruption and wrong-network rejection. Format checks do not prove wallet control.');
