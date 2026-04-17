import type { Currency } from '../constants/poker';

export function formatCurrency(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  const absAmount = Math.abs(amount);
  const formatted = new Intl.NumberFormat('ko-KR').format(absAmount);
  const sign = amount < 0 ? '-' : '';
  return `${sign}₩${formatted}`;
}

export function formatProfit(amount: number, currency: Currency): string {
  const prefix = amount > 0 ? '+' : '';
  return `${prefix}${formatCurrency(amount, currency)}`;
}
