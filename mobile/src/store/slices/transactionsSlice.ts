import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, getErrorMessage } from '../../api/client';
import { deleteAccount, logout } from './authSlice';
import type {
  Category,
  Summary,
  Transaction,
  TransactionInput,
} from '../../types';

export const PAGE_SIZE = 30;

interface TransactionsState {
  items: Transaction[];
  page: number;
  hasMore: boolean;
  summary: Summary | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  currentRequestId: string | null;
}

const initialState: TransactionsState = {
  items: [],
  page: 1,
  hasMore: true,
  summary: null,
  loading: false,
  loadingMore: false,
  error: null,
  currentRequestId: null,
};

interface ListArgs {
  search?: string;
  category?: Category | null;
  page?: number;
}

export const fetchTransactions = createAsyncThunk<
  Transaction[],
  ListArgs | undefined,
  { rejectValue: string }
>('transactions/fetch', async (args, { rejectWithValue }) => {
  try {
    const params: Record<string, string | number> = {
      page: args?.page ?? 1,
      limit: PAGE_SIZE,
    };
    if (args?.search) params.search = args.search;
    if (args?.category) params.category = args.category;
    const { data } = await api.get<Transaction[]>('/transactions', { params });
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const fetchSummary = createAsyncThunk<
  Summary,
  { month?: number; year?: number } | undefined,
  { rejectValue: string }
>('transactions/summary', async (args, { rejectWithValue }) => {
  try {
    const { data } = await api.get<Summary>('/transactions/summary', {
      params: args,
    });
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const addTransaction = createAsyncThunk<
  Transaction,
  TransactionInput,
  { rejectValue: string }
>('transactions/add', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post<Transaction>('/transactions', body);
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateTransaction = createAsyncThunk<
  Transaction,
  { id: string; data: TransactionInput },
  { rejectValue: string }
>('transactions/update', async ({ id, data: body }, { rejectWithValue }) => {
  try {
    const { data } = await api.put<Transaction>(`/transactions/${id}`, body);
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteTransaction = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('transactions/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/transactions/${id}`);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchTransactions.pending, (state, action) => {
        const isFirstPage = (action.meta.arg?.page ?? 1) === 1;
        state.currentRequestId = action.meta.requestId;
        state.loading = isFirstPage;
        state.loadingMore = !isFirstPage;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return; // stale response
        const page = action.meta.arg?.page ?? 1;
        state.loading = false;
        state.loadingMore = false;
        state.page = page;
        state.hasMore = action.payload.length === PAGE_SIZE;
        state.items =
          page === 1 ? action.payload : [...state.items, ...action.payload];
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        if (state.currentRequestId !== action.meta.requestId) return;
        state.loading = false;
        state.loadingMore = false;
        state.error = action.payload ?? 'Failed to load transactions';
      })
      .addCase(fetchSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      .addCase(addTransaction.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const i = state.items.findIndex(t => t.id === action.payload.id);
        if (i >= 0) state.items[i] = action.payload;
      })
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.items = state.items.filter(t => t.id !== action.payload);
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(deleteAccount.fulfilled, () => initialState);
  },
});

export default transactionsSlice.reducer;
