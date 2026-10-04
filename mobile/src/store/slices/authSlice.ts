import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getErrorMessage } from '../../api/client';
import {
  clearSession,
  getSession,
  loadSession,
  saveSession,
} from '../../api/session';
import type { AuthResponse, User } from '../../types';

const USER_KEY = 'moneysafe_user';

interface AuthState {
  user: User | null;
  signedIn: boolean;
  loading: boolean;
  bootstrapped: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  signedIn: false,
  loading: false,
  bootstrapped: false,
  error: null,
};

async function persist(data: AuthResponse) {
  await saveSession({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
  });
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export const restoreSession = createAsyncThunk(
  'auth/restore',
  async (): Promise<User | null> => {
    const session = await loadSession();
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!session || !raw) {
      if (session) await clearSession(); // keychain survives reinstall on iOS; start clean
      return null;
    }
    return JSON.parse(raw) as User;
  },
);

// Quietly refresh the cached user (e.g. currency changed on another device)
export const fetchMe = createAsyncThunk<User, void, { rejectValue: string }>(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<User>('/auth/me');
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
      return data;
    } catch (e) {
      return rejectWithValue(getErrorMessage(e));
    }
  },
);

export const login = createAsyncThunk<
  AuthResponse,
  { email: string; password: string },
  { rejectValue: string }
>('auth/login', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/login', body);
    await persist(data);
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const signup = createAsyncThunk<
  AuthResponse,
  { name: string; email: string; password: string },
  { rejectValue: string }
>('auth/signup', async (body, { rejectWithValue }) => {
  try {
    const { data } = await api.post<AuthResponse>('/auth/signup', body);
    await persist(data);
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  const session = getSession();
  if (session) {
    // Best effort: revoke the refresh token on the server
    await api
      .post('/auth/logout', { refreshToken: session.refreshToken })
      .catch(() => undefined);
  }
  await clearSession();
  await AsyncStorage.removeItem(USER_KEY);
});

export const updateCurrency = createAsyncThunk<
  User,
  string,
  { rejectValue: string }
>('auth/currency', async (currency, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<User>('/auth/currency', { currency });
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const updateProfile = createAsyncThunk<
  User,
  {
    name?: string;
    email?: string;
    avatarUrl?: string | null;
    avatarBase64?: string;
    avatarMimeType?: string;
  },
  { rejectValue: string }
>('auth/updateProfile', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.patch<User>('/auth/me', payload);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    return data;
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

export const deleteAccount = createAsyncThunk<
  void,
  string,
  { rejectValue: string }
>('auth/deleteAccount', async (password, { rejectWithValue }) => {
  try {
    await api.delete('/auth/me', { data: { password } });
    await clearSession();
    await AsyncStorage.removeItem(USER_KEY);
  } catch (e) {
    return rejectWithValue(getErrorMessage(e));
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.bootstrapped = true;
        if (action.payload) {
          state.user = action.payload;
          state.signedIn = true;
        }
      })
      .addCase(restoreSession.rejected, state => {
        state.bootstrapped = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateCurrency.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addMatcher(isAnyOf(logout.fulfilled, deleteAccount.fulfilled), state => {
        state.user = null;
        state.signedIn = false;
      })
      .addMatcher(isAnyOf(login.pending, signup.pending), state => {
        state.loading = true;
        state.error = null;
      })
      .addMatcher(
        isAnyOf(login.fulfilled, signup.fulfilled),
        (state, action) => {
          state.loading = false;
          state.user = action.payload.user;
          state.signedIn = true;
        },
      )
      .addMatcher(isAnyOf(login.rejected, signup.rejected), (state, action) => {
        state.loading = false;
        state.error = action.payload ?? 'Something went wrong';
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
