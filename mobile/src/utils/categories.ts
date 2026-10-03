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
  FOOD: { label: 'Food', icon: 'silverware-fork-knife', color: '#F97316' },
  TRANSPORT: { label: 'Transport', icon: 'bus', color: '#3B82F6' },
  SHOPPING: { label: 'Shopping', icon: 'shopping', color: '#EC4899' },
  ENTERTAINMENT: {
    label: 'Entertainment',
    icon: 'movie-open',
    color: '#8B5CF6',
  },
  BILLS: { label: 'Bills', icon: 'receipt-text', color: '#EAB308' },
  HEALTH: { label: 'Health', icon: 'heart-pulse', color: '#EF4444' },
  EDUCATION: { label: 'Education', icon: 'school', color: '#14B8A6' },
  OTHER: { label: 'Other', icon: 'dots-horizontal-circle', color: '#64748B' },
};
