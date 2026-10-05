import { useEffect } from 'react';
import { Alert } from 'react-native';
import {
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
} from '@react-native-firebase/messaging';

import {
  hasSystemPermission,
  isPushEnabled,
  openFromNotification,
  registerToken,
} from './push';

export function usePushSetup(signedIn: boolean) {
  useEffect(() => {
    if (!signedIn) return;

    const messaging = getMessaging();
    let cancelled = false;

    // If alerts are on, make sure the server has this phone's current token
    (async () => {
      if (!(await isPushEnabled())) return;
      if (!(await hasSystemPermission())) return;
      try {
        const token = await getToken(messaging);
        if (!cancelled) await registerToken(token);
      } catch (e) {
        console.warn('Could not refresh the push token:', e);
      }
    })();

    // A notification arrived while the app is open
    const unsubscribeMessage = onMessage(messaging, async message => {
      Alert.alert(
        message.notification?.title ?? 'MoneySafe',
        message.notification?.body ?? '',
      );
    });

    // Firebase changed this phone's token
    const unsubscribeRefresh = onTokenRefresh(messaging, async token => {
      if (await isPushEnabled()) {
        registerToken(token).catch(() => undefined);
      }
    });

    // The user tapped a notification (app was in the background, or was closed)
    const unsubscribeOpened = onNotificationOpenedApp(messaging, message =>
      openFromNotification(message),
    );
    getInitialNotification(messaging).then(message =>
      openFromNotification(message),
    );

    return () => {
      cancelled = true;
      unsubscribeMessage();
      unsubscribeRefresh();
      unsubscribeOpened();
    };
  }, [signedIn]);
}
