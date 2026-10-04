import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, getErrorMessage } from '../../api/client';
import { deleteAccount, logout } from './authSlice';
import type { Budget, Category } from '../../types';

interface BudgetsState {
  items: Budget[];
  loading: boolean;
  error: string | null;
}

const initialState: BudgetsState = { items: [], loading: false, error: null };

export const fetchBudgets = createAsyncThunk<
  Budget[],
  void,
  { rejectValue: string }
>('budgets/fetch', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<Budget[]>('/budgets');
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const saveBudget = createAsyncThunk<
  Budget,
  { category: Category; limit: number },
  { rejectValue: string }
>('budgets/save', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post<Budget>('/budgets', body);
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteBudget = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('budgets/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/budgets/${id}`);
    return id;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const budgetsSlice = createSlice({
  name: 'budgets',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchBudgets.pending, state => {
        state.loading = true;
      })
      .addCase(fetchBudgets.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBudgets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Failed to load budgets';
      })
      .addCase(saveBudget.fulfilled, (state, action) => {
        const i = state.items.findIndex(
          b => b.category === action.payload.category,
        );
        if (i >= 0) state.items[i] = action.payload;
        else state.items.push(action.payload);
      })
      .addCase(deleteBudget.fulfilled, (state, action) => {
        state.items = state.items.filter(b => b.id !== action.payload);
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(deleteAccount.fulfilled, () => initialState);
  },
});

export default budgetsSlice.reducer;
