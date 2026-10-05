import type { Transaction } from '../types';

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type TabParamList = {
  Home: undefined;
  Transactions: undefined;
  Budgets: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  // Optionally open a specific tab (used when tapping a notification)
  Tabs: { screen?: keyof TabParamList } | undefined;
  // Pass a transaction to edit it; omit to create a new one
  TransactionForm: { tx?: Transaction } | undefined;
  EditProfile: undefined;
};
