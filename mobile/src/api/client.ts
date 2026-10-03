import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from './config';
import { clearSession, getSession, saveSession } from './session';

export const api = axios.create({ baseURL: API_URL, timeout: 30000 });

// Injected from App.tsx to avoid a circular import with the Redux store
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

// Routes that never carry an access token
const PUBLIC_PATHS = [
  '/auth/login',
  '/auth/signup',
  '/auth/refresh',
  '/auth/logout',
];
const isPublic = (url?: string) =>
  !!url && PUBLIC_PATHS.some(p => url.startsWith(p));

api.interceptors.request.use(config => {
  const session = getSession();
  if (session && !isPublic(config.url)) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

// Returns the new access token, or null if the server rejected the refresh token.
// Throws on network errors so the caller keeps the session.
async function refreshTokens(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;

  try {
    const { data } = await axios.post<{
      accessToken: string;
      refreshToken: string;
    }>(
      `${API_URL}/auth/refresh`,
      { refreshToken: session.refreshToken },
      { timeout: 15000 },
    );
    await saveSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
    });
    return data.accessToken;
  } catch (e) {
    if (
      axios.isAxiosError(e) &&
      e.response &&
      [400, 401].includes(e.response.status)
    ) {
      return null;
    }
    throw e;
  }
}

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !isPublic(original.url)
    ) {
      original._retry = true;

      // Single flight: concurrent 401s share one refresh call
      if (!refreshPromise) {
        refreshPromise = refreshTokens().finally(() => {
          refreshPromise = null;
        });
      }

      let token: string | null;
      try {
        token = await refreshPromise;
      } catch {
        return Promise.reject(error); // network problem: keep the session
      }

      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }

      await clearSession();
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(e: unknown): string {
  if (axios.isAxiosError(e)) {
    const data = e.response?.data as { error?: string } | undefined;
    if (data?.error) return data.error;
    if (e.code === 'ECONNABORTED')
      return 'The request timed out. Please try again.';
    if (!e.response) return 'Cannot reach the server. Check your connection.';
  }
  return e instanceof Error ? e.message : 'Something went wrong';
}
