import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api, getErrorMessage } from '../../api/client';
import { deleteAccount, logout } from './authSlice';
import type { TrendPoint } from '../../types';

interface InsightsState {
  trend: TrendPoint[];
}

const initialState: InsightsState = { trend: [] };

export const fetchTrend = createAsyncThunk<
  TrendPoint[],
  void,
  { rejectValue: string }
>('insights/trend', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get<TrendPoint[]>('/transactions/trend', {
      params: { months: 6 },
    });
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const insightsSlice = createSlice({
  name: 'insights',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchTrend.fulfilled, (state, action) => {
        state.trend = action.payload;
      })
      .addCase(logout.fulfilled, () => initialState)
      .addCase(deleteAccount.fulfilled, () => initialState);
  },
});

export default insightsSlice.reducer;
