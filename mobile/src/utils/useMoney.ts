import { useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { formatMoney } from './format';

// Returns a formatter bound to the signed-in user's currency
export function useMoney() {
  const currency = useAppSelector(s => s.auth.user?.currency) ?? 'INR';
  return useCallback((n: number) => formatMoney(n, currency), [currency]);
}
