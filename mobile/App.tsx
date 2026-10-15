import React, { useEffect, useState } from 'react';
import { StatusBar, View } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AnimatedSplash from './src/components/AnimatedSplash';
import ErrorBoundary from './src/components/ErrorBoundary';
import { setUnauthorizedHandler } from './src/api/client';
import { BRAND_INK } from './src/config/brand';
import RootNavigator from './src/navigation/RootNavigator';
import { usePushSetup } from './src/notifications/usePushSetup';
import { store } from './src/store';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { fetchMe, logout, restoreSession } from './src/store/slices/authSlice';
import { loadSettings } from './src/store/slices/settingsSlice';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';

function Root() {
  const dispatch = useAppDispatch();
  const { dark } = useTheme();
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

  useEffect(() => {
    if (signedIn) dispatch(fetchMe());
  }, [signedIn, dispatch]);

  // Push notifications: token refresh, foreground alerts and notification taps
  usePushSetup(signedIn);

  const ready = settingsLoaded && bootstrapped;

  return (
    <View style={{ flex: 1, backgroundColor: BRAND_INK }}>
      {ready && (
        <>
          <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
          <RootNavigator />
        </>
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
          <ThemeProvider>
            <Root />
          </ThemeProvider>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
