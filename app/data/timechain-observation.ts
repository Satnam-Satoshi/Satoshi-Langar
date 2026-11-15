export type ChainObservation={height:number;hash:string;observedAt:string;checkedAt:string;blockTimestamp:string;status:'fresh'};
export function acceptChainObservation(value:unknown,now=Date.now()):ChainObservation {
 const d=value as Record<string,unknown>;
 if(!d||d.schemaVersion!==1||d.status!=='fresh'||d.chain!=='LTC.main'||!Number.isSafeInteger(d.height)||Number(d.height)<=0||Number(d.height)>53_760_000||typeof d.hash!=='string'||!/^[a-f0-9]{64}$/.test(d.hash))throw Error('Invalid chain observation');
 for(const [key,max] of [['observedAt',1_200_000],['checkedAt',180_000],['blockTimestamp',7_200_000]] as const){
  const t=typeof d[key]==='string'?Date.parse(d[key] as string):NaN;
  if(!Number.isFinite(t)||t>now+60_000||now-t>max)throw Error('Chain observation is stale or unavailable');
 }
 if(Date.parse(d.observedAt as string)>Date.parse(d.checkedAt as string)+60_000||Date.parse(d.blockTimestamp as string)>Date.parse(d.checkedAt as string)+60_000)throw Error('Inconsistent chain timestamps');
 return {height:Number(d.height),hash:d.hash,observedAt:d.observedAt as string,checkedAt:d.checkedAt as string,blockTimestamp:d.blockTimestamp as string,status:'fresh'};
}
