import { parseAbi, type Address, type Hex } from 'viem';

export const MORPHO = '0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb' as Address;
export const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as Address;
export const CHAIN_ID = 8453;
// Release gate: change only after the documented wallet/fork/security review.
// No runtime URL, localStorage flag, or query parameter can enable execution.
export const EXECUTION_ENABLED: boolean = false;
export const MAX_LTV_BPS = 2000n;
export const MAX_AGE_MS = 60_000;
export const MARKETS = [
  { key: 'cbbtc', symbol: 'cbBTC', underlying: 'BTC', name: 'Bitcoin', decimals: 8, token: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf' as Address, id: '0x9103c3b4e834476c9a62ea009ba2c884ee42e94e6e314a26f04d312434191836' as Hex, expectedLltv: 860000000000000000n },
  { key: 'cbltc', symbol: 'cbLTC', underlying: 'LTC', name: 'Litecoin', decimals: 8, token: '0xcb17C9Db87B595717C857a08468793f5bAb6445F' as Address, id: '0x9125d0fa03c3137166df68bcc72283477830de2a4a5536512374c573ad4583c3' as Hex, expectedLltv: 625000000000000000n },
] as const;
export type MarketKey = typeof MARKETS[number]['key'];
export type MarketParams = { loanToken: Address; collateralToken: Address; oracle: Address; irm: Address; lltv: bigint };
export const marketTuple = '(address loanToken,address collateralToken,address oracle,address irm,uint256 lltv)';
export const stateTuple = '(uint128 totalSupplyAssets,uint128 totalSupplyShares,uint128 totalBorrowAssets,uint128 totalBorrowShares,uint128 lastUpdate,uint128 fee)';
export const morphoAbi = parseAbi([
  `function idToMarketParams(bytes32) view returns (${marketTuple})`,
  'function market(bytes32) view returns (uint128 totalSupplyAssets,uint128 totalSupplyShares,uint128 totalBorrowAssets,uint128 totalBorrowShares,uint128 lastUpdate,uint128 fee)',
  'function position(bytes32,address) view returns (uint256 supplyShares,uint128 borrowShares,uint128 collateral)',
  `function supplyCollateral(${marketTuple},uint256 assets,address onBehalf,bytes data)`,
  `function borrow(${marketTuple},uint256 assets,uint256 shares,address onBehalf,address receiver) returns (uint256,uint256)`,
  `function repay(${marketTuple},uint256 assets,uint256 shares,address onBehalf,bytes data) returns (uint256,uint256)`,
  `function withdrawCollateral(${marketTuple},uint256 assets,address onBehalf,address receiver)`,
]);
export const irmAbi = parseAbi([`function borrowRateView(${marketTuple},${stateTuple}) view returns (uint256)`]);
export const oracleAbi = parseAbi(['function price() view returns (uint256)']);
export type MarketSnapshot = {
  key: MarketKey; block: string; blockTime: number; fetchedAt: number;
  params: { loanToken: Address; collateralToken: Address; oracle: Address; irm: Address; lltv: string };
  price: string; liquidity: string; totalSupply: string; totalBorrow: string;
  borrowApr: number; borrowApy: number; utilization: number;
  position: null | { collateral: string; debt: string; borrowShares: string; tokenBalance: string; usdcBalance: string; gasBalance: string; tokenAllowance: string; usdcAllowance: string };
};
export function findMarket(key: string) {
  const market = MARKETS.find(m => m.key === key);
  if (!market) throw new Error('Unsupported market.');
  return market;
}
export function paramsFromSnapshot(snapshot: MarketSnapshot): MarketParams {
  return { ...snapshot.params, lltv: BigInt(snapshot.params.lltv) };
}
