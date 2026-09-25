import { isAddress, type Address } from 'viem';
import { MARKETS } from '@/lib/treasury/config';
import { readMarket } from '@/lib/treasury/chain';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams.get('account');
  if (input && !isAddress(input)) return Response.json({error:'Enter a valid EVM wallet address.'},{status:400});
  const results=await Promise.allSettled(MARKETS.map(m=>readMarket(m.key,(input||undefined) as Address|undefined)));
  const markets=results.map((r,i)=>r.status==='fulfilled'?{key:MARKETS[i].key,data:r.value}:{key:MARKETS[i].key,error:'Live chain data is unavailable or failed verification. Retry shortly.'});
  return Response.json({markets,executionEnabled:false},{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
