import { marketPricesResponse } from '../lib/market-price-service.mjs';
// Standalone Build Output API Node handler; deliberately separate from Next export.
export default async function handler(req,res) {
 const response=await marketPricesResponse(new Request(new URL(req.url,'https://local.invalid'),{method:req.method||'GET'}));
 res.statusCode=response.status;
 for(const [name,value] of response.headers)res.setHeader(name,value);
 res.end(req.method==='HEAD'?undefined:await response.text());
}
