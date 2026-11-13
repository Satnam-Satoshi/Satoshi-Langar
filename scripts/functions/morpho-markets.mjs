import { morphoMarketsResponse } from '../lib/morpho-market-service.mjs';
export default async function handler(req,res){
 const result=await morphoMarketsResponse(new Request(new URL(req.url,'https://local.invalid'),{method:req.method||'GET'}));
 res.statusCode=result.status;for(const[k,v]of result.headers)res.setHeader(k,v);res.end(req.method==='HEAD'?undefined:await result.text());
}
