export type Category =
  | 'FOOD'
  | 'TRANSPORT'
  | 'SHOPPING'
  | 'ENTERTAINMENT'
  | 'BILLS'
  | 'HEALTH'
  | 'EDUCATION'
  | 'OTHER';

export type TransactionType = 'DEBIT' | 'CREDIT';

export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  category: Category;
  type: TransactionType;
  note: string | null;
  date: string;
  receiptUrl: string | null;
  createdAt: string;
}

export interface TransactionInput {
  merchant: string;
  amount: number;
  category: Category;
  type: TransactionType;
  note?: string;
  date: string; // YYYY-MM-DD
  receiptUrl?: string | null;
}

export interface Budget {
  id: string;
  category: Category;
  limit: number;
}

export interface Summary {
  total: number;
  income: number;
  count: number;
  byCategory: Partial<Record<Category, number>>;
  month: number;
  year: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExtractedReceipt {
  merchant: string;
  amount: number;
  category: Category;
  date: string;
  note: string;
  receiptUrl?: string;
}
