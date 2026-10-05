import type { Category } from '../types';

export const CATEGORIES: Category[] = [
  'FOOD',
  'TRANSPORT',
  'SHOPPING',
  'ENTERTAINMENT',
  'BILLS',
  'HEALTH',
  'EDUCATION',
  'OTHER',
];

export const CATEGORY_META: Record<
  Category,
  { label: string; icon: string; color: string }
> = {
  FOOD: { label: 'Food', icon: 'silverware-fork-knife', color: '#E8875B' },
  TRANSPORT: { label: 'Transport', icon: 'bus', color: '#5B8DEF' },
  SHOPPING: { label: 'Shopping', icon: 'shopping', color: '#D16BA5' },
  ENTERTAINMENT: {
    label: 'Entertainment',
    icon: 'movie-open',
    color: '#8B7CF6',
  },
  BILLS: { label: 'Bills', icon: 'receipt-text', color: '#E5B53C' },
  HEALTH: { label: 'Health', icon: 'heart-pulse', color: '#E5646E' },
  EDUCATION: { label: 'Education', icon: 'school', color: '#3FB8A5' },
  OTHER: { label: 'Other', icon: 'dots-horizontal-circle', color: '#9CA3AF' },
};
