import React, { useEffect, useState } from 'react';
import { Appearance, StatusBar, View, useColorScheme } from 'react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/store';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { fetchMe, logout, restoreSession } from './src/store/slices/authSlice';
import { loadSettings } from './src/store/slices/settingsSlice';
import { setUnauthorizedHandler } from './src/api/client';
import { darkTheme, lightTheme } from './src/theme/theme';
import { BRAND_INK } from './src/config/brand';
import { usePushSetup } from './src/notifications/usePushSetup';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import AnimatedSplash from './src/components/AnimatedSplash';

function Root() {
  const dispatch = useAppDispatch();
  const system = useColorScheme();
  const mode = useAppSelector(s => s.settings.mode);
  const settingsLoaded = useAppSelector(s => s.settings.loaded);
  const { bootstrapped, signedIn } = useAppSelector(s => s.auth);
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    // Called by the API client when a refresh token is rejected
    setUnauthorizedHandler(() => {
      dispatch(logout());
    });
    dispatch(loadSettings());
    dispatch(restoreSession());
  }, [dispatch]);

  // Refresh the cached user in the background once we know someone is signed in
  useEffect(() => {
    if (signedIn) dispatch(fetchMe());
  }, [signedIn, dispatch]);

  // Push notifications: token refresh, foreground alerts and notification taps
  usePushSetup(signedIn);

  // Make native UI (alerts, keyboard, share sheet) follow the in-app choice
  useEffect(() => {
    const colorScheme = mode === 'system' ? system : mode;
    if (colorScheme === 'light' || colorScheme === 'dark') {
      Appearance.setColorScheme(colorScheme);
    }
  }, [mode, system]);

  const ready = settingsLoaded && bootstrapped;
  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const theme = dark ? darkTheme : lightTheme;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: ready ? theme.colors.background : BRAND_INK,
      }}
    >
      {ready && (
        <PaperProvider theme={theme}>
          <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
          <RootNavigator />
        </PaperProvider>
      )}

      {!splashDone && (
        <AnimatedSplash ready={ready} onFinish={() => setSplashDone(true)} />
      )}
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <Root />
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
