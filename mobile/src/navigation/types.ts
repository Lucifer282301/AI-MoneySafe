import type { Transaction } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type MainStackParamList = {
  Tabs: undefined;
  // Pass a transaction to edit it; omit to create a new one
  TransactionForm: { tx?: Transaction } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Chat: undefined;
  Profile: undefined;
};
