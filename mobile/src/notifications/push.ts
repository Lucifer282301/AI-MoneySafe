import { PermissionsAndroid, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AuthorizationStatus,
  getMessaging,
  getToken,
  hasPermission,
  requestPermission,
} from '@react-native-firebase/messaging';

import { api } from '../api/client';
import { navigationRef } from '../navigation/navigationRef';

const TOKEN_KEY = 'moneysafe_push_token';
const ENABLED_KEY = 'moneysafe_push_enabled';
const ASKED_KEY = 'moneysafe_push_asked';

type RemoteMessage = {
  data?: Record<string, string | object> | undefined;
};

// Does the phone currently allow notifications for this app?
export async function hasSystemPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    return PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
  }
  const status = await hasPermission(getMessaging());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

// Show the system permission dialog
async function askSystemPermission(): Promise<boolean> {
  if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await requestPermission(getMessaging());
  return (
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL
  );
}

// Tell the backend about this phone's token
export async function registerToken(token: string): Promise<void> {
  await api.post('/devices', { token, platform: Platform.OS });
  await Promise.all([
    AsyncStorage.setItem(TOKEN_KEY, token),
    AsyncStorage.setItem(ENABLED_KEY, '1'),
  ]);
}

export async function enablePush(): Promise<'enabled' | 'denied' | 'error'> {
  try {
    if (!(await askSystemPermission())) return 'denied';
    const token = await getToken(getMessaging());
    if (__DEV__) console.log('FCM token:', token);
    await registerToken(token);
    return 'enabled';
  } catch (e) {
    console.warn('Could not enable push notifications:', e);
    return 'error';
  }
}

export async function disablePush(): Promise<void> {
  const saved = await AsyncStorage.getItem(TOKEN_KEY);
  if (saved) {
    await api
      .delete('/devices', { data: { token: saved } })
      .catch(() => undefined);
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.setItem(ENABLED_KEY, '0');
}

// After the account is deleted the server has already removed the tokens
export async function clearPushState(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.setItem(ENABLED_KEY, '0');
}

export async function isPushEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(ENABLED_KEY)) === '1';
}

// True only the first time: used for the one-off "Get budget alerts?" prompt
export async function shouldAskForPush(): Promise<boolean> {
  if (await isPushEnabled()) return false;
  if ((await AsyncStorage.getItem(ASKED_KEY)) === '1') return false;
  await AsyncStorage.setItem(ASKED_KEY, '1');
  return true;
}

// Open the right screen when the user taps a notification
export function openFromNotification(message: RemoteMessage | null): void {
  if (!message) return;
  const screenValue = message.data?.screen;
  const target =
    typeof screenValue === 'string' && screenValue === 'Budgets' ? 'Budgets' : 'Home';

  let attempts = 0;
  const tryNavigate = () => {
    if (navigationRef.isReady()) {
      navigationRef.navigate('Tabs', { screen: target });
    } else if (attempts++ < 10) {
      setTimeout(tryNavigate, 250); // the app may still be starting
    }
  };
  tryNavigate();
}
