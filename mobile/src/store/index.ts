import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import settingsReducer from './slices/settingsSlice';
import transactionsReducer from './slices/transactionsSlice';
import budgetsReducer from './slices/budgetsSlice';
import chatReducer from './slices/chatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    settings: settingsReducer,
    transactions: transactionsReducer,
    budgets: budgetsReducer,
    chat: chatReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
