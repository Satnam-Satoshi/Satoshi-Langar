import { createPublicClient, defineChain, http, fallback, erc20Abi, encodeAbiParameters, keccak256, type Address } from 'viem';
import { CHAIN_ID, MORPHO, USDC, findMarket, morphoAbi, oracleAbi, irmAbi, type MarketSnapshot } from './config';
import { accrueInterest, debtFromShares, WAD } from './risk';

// Fixed provider URLs: user input cannot turn the server into an arbitrary RPC proxy.
export const base = defineChain({ id: CHAIN_ID, name: 'Base', nativeCurrency: { name:'Ether', symbol:'ETH', decimals:18 }, rpcUrls: { default: { http:['https://mainnet.base.org'] } }, blockExplorers:{ default:{ name:'Basescan',url:'https://basescan.org' } } });
export const publicClient = createPublicClient({ chain: base, transport: fallback([
  http('https://mainnet.base.org', { timeout: 12000, retryCount: 1 }),
  http('https://base-rpc.publicnode.com', { timeout: 12000, retryCount: 1 }),
]) });

export async function readMarket(key: string, account?: Address): Promise<MarketSnapshot> {
  const config = findMarket(key);
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('RPC chain verification failed.');
  const block = await publicClient.getBlock();
  const blockNumber = block.number;
  if (Math.abs(Date.now() - Number(block.timestamp) * 1000) > 60000) throw new Error('RPC block is stale.');
  const [params, raw, code] = await Promise.all([
    publicClient.readContract({ address: MORPHO, abi: morphoAbi, functionName: 'idToMarketParams', args: [config.id], blockNumber }),
    publicClient.readContract({ address: MORPHO, abi: morphoAbi, functionName: 'market', args: [config.id], blockNumber }),
    publicClient.getCode({ address: MORPHO, blockNumber }),
  ]);
  const computedId = keccak256(encodeAbiParameters([{ type:'address' },{ type:'address' },{ type:'address' },{ type:'address' },{ type:'uint256' }], [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]));
  if (!code || code === '0x' || computedId !== config.id || params.loanToken.toLowerCase() !== USDC.toLowerCase() || params.collateralToken.toLowerCase() !== config.token.toLowerCase() || params.lltv !== config.expectedLltv) throw new Error('Market identity verification failed.');
  const state = { totalSupplyAssets:raw[0], totalSupplyShares:raw[1], totalBorrowAssets:raw[2], totalBorrowShares:raw[3], lastUpdate:raw[4], fee:raw[5] };
  const [price, rate, collateralDecimals, loanDecimals] = await Promise.all([
    publicClient.readContract({ address:params.oracle, abi:oracleAbi, functionName:'price', blockNumber }),
    publicClient.readContract({ address:params.irm, abi:irmAbi, functionName:'borrowRateView', args:[params,state], blockNumber }),
    publicClient.readContract({ address:config.token, abi:erc20Abi, functionName:'decimals', blockNumber }),
    publicClient.readContract({ address:USDC, abi:erc20Abi, functionName:'decimals', blockNumber }),
  ]);
  if (price <= 0n || collateralDecimals !== config.decimals || loanDecimals !== 6) throw new Error('Token precision or oracle validation failed.');
  const interest = accrueInterest(state.totalBorrowAssets,rate,block.timestamp-state.lastUpdate);
  const totalBorrow = state.totalBorrowAssets+interest;
  const totalSupply = state.totalSupplyAssets+interest;
  let position: MarketSnapshot['position'] = null;
  if (account) {
    const [p, tokenBalance, usdcBalance, gasBalance, tokenAllowance, usdcAllowance] = await Promise.all([
      publicClient.readContract({ address:MORPHO,abi:morphoAbi,functionName:'position',args:[config.id,account],blockNumber }),
      publicClient.readContract({ address:config.token,abi:erc20Abi,functionName:'balanceOf',args:[account],blockNumber }),
      publicClient.readContract({ address:USDC,abi:erc20Abi,functionName:'balanceOf',args:[account],blockNumber }),
      publicClient.getBalance({ address:account,blockNumber }),
      publicClient.readContract({ address:config.token,abi:erc20Abi,functionName:'allowance',args:[account,MORPHO],blockNumber }),
      publicClient.readContract({ address:USDC,abi:erc20Abi,functionName:'allowance',args:[account,MORPHO],blockNumber }),
    ]);
    position={ collateral:p[2].toString(), debt:debtFromShares(p[1],totalBorrow,state.totalBorrowShares).toString(), borrowShares:p[1].toString(), tokenBalance:tokenBalance.toString(),usdcBalance:usdcBalance.toString(),gasBalance:gasBalance.toString(),tokenAllowance:tokenAllowance.toString(),usdcAllowance:usdcAllowance.toString() };
  }
  const apr = Number(rate)/Number(WAD)*31536000;
  return { key:config.key,block:blockNumber.toString(),blockTime:Number(block.timestamp)*1000,fetchedAt:Date.now(),params:{ ...params,lltv:params.lltv.toString() },price:price.toString(),liquidity:(totalSupply-totalBorrow).toString(),totalSupply:totalSupply.toString(),totalBorrow:totalBorrow.toString(),borrowApr:apr,borrowApy:Math.expm1(apr),utilization:totalSupply===0n?0:Number(totalBorrow)/Number(totalSupply),position };
}
