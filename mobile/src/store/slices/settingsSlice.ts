import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const KEY = 'moneysafe_theme_mode';

interface SettingsState {
  mode: ThemeMode;
  loaded: boolean;
}

const initialState: SettingsState = { mode: 'system', loaded: false };

export const loadSettings = createAsyncThunk(
  'settings/load',
  async (): Promise<ThemeMode> => {
    const value = await AsyncStorage.getItem(KEY);
    return value === 'light' || value === 'dark' || value === 'system'
      ? value
      : 'system';
  },
);

export const setThemeMode = createAsyncThunk(
  'settings/setThemeMode',
  async (mode: ThemeMode) => {
    await AsyncStorage.setItem(KEY, mode);
    return mode;
  },
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(loadSettings.fulfilled, (state, action) => {
        state.mode = action.payload;
        state.loaded = true;
      })
      .addCase(loadSettings.rejected, state => {
        state.loaded = true;
      })
      .addCase(setThemeMode.fulfilled, (state, action) => {
        state.mode = action.payload;
      });
  },
});

export default settingsSlice.reducer;
