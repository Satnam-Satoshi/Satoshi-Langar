import { parseUnits } from 'viem';
import { MAX_AGE_MS, MAX_LTV_BPS } from './config';
export const WAD = 10n ** 18n;
export const ORACLE_SCALE = 10n ** 36n;
export function ceilDiv(a: bigint, b: bigint) { if (b <= 0n || a < 0n) throw new Error('Invalid ratio.'); return (a + b - 1n) / b; }
export function parseAmount(value: string, decimals: number) {
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(value) || (value.split('.')[1]?.length ?? 0) > decimals || value.length > 60) throw new Error(`Enter a positive amount with at most ${decimals} decimals.`);
  const amount = parseUnits(value, decimals);
  if (amount <= 0n || amount >= 2n ** 128n) throw new Error('Amount is outside the supported range.');
  return amount;
}
export function collateralValue(collateral: bigint, price: bigint) { return collateral * price / ORACLE_SCALE; }
export function debtFromShares(shares: bigint, assets: bigint, totalShares: bigint) { return ceilDiv(shares * (assets + 1n), totalShares + 1000000n); }
export function accrueInterest(assets: bigint, rate: bigint, elapsed: bigint) {
  if (elapsed < 0n || rate < 0n) throw new Error('Invalid accrual state.');
  const first = rate * elapsed;
  const second = first * first / (2n * WAD);
  const third = second * first / (3n * WAD);
  return assets * (first + second + third) / WAD;
}
export function ltvBps(collateral: bigint, debt: bigint, price: bigint) {
  const value = collateralValue(collateral, price);
  return debt === 0n ? 0n : value === 0n ? null : ceilDiv(debt * 10000n, value);
}
export function borrowingRoom(collateral: bigint, debt: bigint, price: bigint, liquidity: bigint) {
  const room = collateralValue(collateral, price) * MAX_LTV_BPS / 10000n - debt;
  return room <= 0n ? 0n : room < liquidity ? room : liquidity;
}
export type Action = 'supply' | 'borrow' | 'repay' | 'withdraw';
export function validateAction(input: {
  action: Action; amount: bigint; collateral: bigint; debt: bigint; price: bigint;
  balance: bigint; liquidity: bigint; chainId: number; expectedChainId: number;
  fetchedAt: number; blockTime: number; now: number; lltv: bigint;
}) {
  const p = input;
  if (!['supply', 'borrow', 'repay', 'withdraw'].includes(p.action)) throw new Error('Unsupported action.');
  if (p.chainId !== p.expectedChainId) throw new Error('Switch your wallet to Base.');
  if (p.now - p.fetchedAt > MAX_AGE_MS || p.now < p.fetchedAt || p.now - p.blockTime > MAX_AGE_MS || p.blockTime > p.now + 15000) throw new Error('Market data is stale. Refresh before continuing.');
  if (p.amount <= 0n || p.price <= 0n || p.collateral < 0n || p.debt < 0n) throw new Error('Invalid amount or oracle price.');
  if ((p.action === 'supply' || p.action === 'repay') && p.amount > p.balance) throw new Error('Insufficient wallet balance.');
  if (p.action === 'borrow' && p.amount > p.liquidity) throw new Error('Insufficient market liquidity.');
  if (p.action === 'repay' && p.amount > p.debt) throw new Error('Repayment exceeds the estimated debt.');
  if (p.action === 'withdraw' && p.amount > p.collateral) throw new Error('Withdrawal exceeds supplied collateral.');
  const collateral = p.collateral + (p.action === 'supply' ? p.amount : p.action === 'withdraw' ? -p.amount : 0n);
  const debt = p.debt + (p.action === 'borrow' ? p.amount : p.action === 'repay' ? -p.amount : 0n);
  const value = collateralValue(collateral, p.price);
  if (p.action === 'borrow' || p.action === 'withdraw') {
    if (debt * 10000n > value * MAX_LTV_BPS) throw new Error('This action exceeds your 20% LTV limit.');
    if (debt > 0n && debt * WAD >= value * p.lltv) throw new Error('This action reaches the liquidation threshold.');
  }
  return { collateral, debt, ltv: ltvBps(collateral, debt, p.price) };
}
