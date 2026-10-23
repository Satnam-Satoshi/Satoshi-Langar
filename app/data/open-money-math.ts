// Educational models only. No wallet, network calls or transaction construction.
export const HALVING_BLOCKS = 840_000;
export const RETARGET_BLOCKS = 2016;
export const TARGET_SECONDS = 150;
export function blockClock(height: number) {
 if (!Number.isSafeInteger(height) || height < 0 || height > 53_760_000) throw new Error('Enter a whole block height from 0 to 53,760,000.');
 const epoch = Math.floor(height / HALVING_BLOCKS);
 const subsidySats = epoch >= 64 ? 0n : 5_000_000_000n >> BigInt(epoch);
 let issuedSats=0n;
 for(let e=0;e<=Math.min(epoch,63);e++){
  const blocks=e<epoch?HALVING_BLOCKS:height%HALVING_BLOCKS+1;
  issuedSats+=(5_000_000_000n >> BigInt(e))*BigInt(blocks);
 }
 const issued=Number(issuedSats)/1e8;
 return {height,epoch,subsidy:Number(subsidySats)/1e8,issued,issuedSats:issuedSats.toString(),remainingSupply:84_000_000-issued,supplyProgress:issued/84_000_000,halvingProgress:(height%HALVING_BLOCKS)/HALVING_BLOCKS,nextHalving:(epoch+1)*HALVING_BLOCKS,blocksToHalving:HALVING_BLOCKS-height%HALVING_BLOCKS,blocksToRetarget:RETARGET_BLOCKS-height%RETARGET_BLOCKS,retargetProgress:(height%RETARGET_BLOCKS)/RETARGET_BLOCKS};
}
export function borrowingExample({collateral,debt,annualRate,days,decline,lltv=0.625}:{collateral:number;debt:number;annualRate:number;days:number;decline:number;lltv?:number}) {
 if (![collateral,debt,annualRate,days,decline,lltv].every(Number.isFinite) || collateral<=0 || collateral>1e12 || debt<0 || debt>1e12 || annualRate<0 || annualRate>100 || days<0 || days>3650 || decline<0 || decline>100 || lltv<=0 || lltv>=1) throw new Error('Use positive collateral and values within the labelled ranges.');
 const interest=debt*(annualRate/100)*(days/365);
 const totalDebt=debt+interest;
 const stressedCollateral=collateral*(1-decline/100);
 const ltv=totalDebt===0?0:stressedCollateral===0?Infinity:totalDebt/stressedCollateral;
 const health=totalDebt===0?Infinity:stressedCollateral*lltv/totalDebt;
 return {interest,totalDebt,stressedCollateral,ltv,health,thresholdValue:totalDebt/lltv,state:totalDebt===0?'No debt':health<1?'Beyond the example liquidation boundary':health===1?'At the example liquidation boundary':'Below the example liquidation boundary'};
}
