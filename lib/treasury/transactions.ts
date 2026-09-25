import { encodeFunctionData, erc20Abi, type Address, type Hex } from 'viem';
import { CHAIN_ID, EXECUTION_ENABLED, MORPHO, USDC, findMarket, morphoAbi, paramsFromSnapshot } from './config';
import { readMarket, publicClient } from './chain';
import { parseAmount, validateAction, type Action } from './risk';

export type PreparedAction = {
  account: Address; chainId: number; market: string; action: Action; amount: string;
  to: Address; data: Hex; value: '0x0'; createdAt: number;
  approval: null | { to: Address; data: Hex; spender: Address; amount: string };
  postCollateral: string; postDebt: string; postLtv: string | null;
  simulation: 'passed' | 'approval-required'; gas: string | null;
};
export async function prepareAction(key: string, action: Action, amountText: string, account: Address, chainId: number): Promise<PreparedAction> {
  const market=findMarket(key);
  const amount=parseAmount(amountText,action==='supply'||action==='withdraw'?market.decimals:6);
  // Re-read independently from the display API. A cached UI response cannot authorize a transaction.
  const snapshot=await readMarket(key,account);
  const p=snapshot.position;
  if (!p) throw new Error('Connect your signing wallet.');
  const after=validateAction({action,amount,collateral:BigInt(p.collateral),debt:BigInt(p.debt),price:BigInt(snapshot.price),balance:BigInt(action==='supply'?p.tokenBalance:p.usdcBalance),liquidity:BigInt(snapshot.liquidity),chainId,expectedChainId:CHAIN_ID,fetchedAt:snapshot.fetchedAt,blockTime:snapshot.blockTime,now:Date.now(),lltv:BigInt(snapshot.params.lltv)});
  const params=paramsFromSnapshot(snapshot);
  let data: Hex;
  switch(action) {
    case 'supply':data=encodeFunctionData({abi:morphoAbi,functionName:'supplyCollateral',args:[params,amount,account,'0x']});break;
    case 'borrow':data=encodeFunctionData({abi:morphoAbi,functionName:'borrow',args:[params,amount,0n,account,account]});break;
    case 'repay':data=encodeFunctionData({abi:morphoAbi,functionName:'repay',args:[params,amount,0n,account,'0x']});break;
    case 'withdraw':data=encodeFunctionData({abi:morphoAbi,functionName:'withdrawCollateral',args:[params,amount,account,account]});break;
  }
  const needsApproval=(action==='supply'&&BigInt(p.tokenAllowance)<amount)||(action==='repay'&&BigInt(p.usdcAllowance)<amount);
  const approval=needsApproval?{to:action==='supply'?market.token:USDC,spender:MORPHO,amount:amount.toString(),data:encodeFunctionData({abi:erc20Abi,functionName:'approve',args:[MORPHO,amount]})}:null;
  let gas: string|null=null;
  if (!approval) {
    await publicClient.call({account,to:MORPHO,data});
    gas=(await publicClient.estimateGas({account,to:MORPHO,data})).toString();
  }
  return {account,chainId:CHAIN_ID,market:key,action,amount:amount.toString(),to:MORPHO,data,value:'0x0',createdAt:Date.now(),approval,postCollateral:after.collateral.toString(),postDebt:after.debt.toString(),postLtv:after.ltv?.toString()??null,simulation:approval?'approval-required':'passed',gas};
}
export function assertExecutionEnabled() {
  if (!EXECUTION_ENABLED) throw new Error('Signing is locked until wallet testing and the release security review are complete.');
}
// This review build deliberately exposes no eth_sendTransaction, wallet_sendCalls,
// permit signing, or private-key path. Prepared calldata is inspectable but cannot be sent.
