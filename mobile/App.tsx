import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Appearance,
  StatusBar,
  View,
  useColorScheme,
} from 'react-native';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { store } from './src/store';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { fetchMe, logout, restoreSession } from './src/store/slices/authSlice';
import { loadSettings } from './src/store/slices/settingsSlice';
import { setUnauthorizedHandler } from './src/api/client';
import { darkTheme, lightTheme } from './src/theme/theme';
import RootNavigator from './src/navigation/RootNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';

function Root() {
  const dispatch = useAppDispatch();
  const system = useColorScheme() ?? 'light';
  const mode = useAppSelector(s => s.settings.mode);
  const settingsLoaded = useAppSelector(s => s.settings.loaded);
  const { bootstrapped, signedIn } = useAppSelector(s => s.auth);

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

  // Make native UI (alerts, keyboard, share sheet) follow the in-app choice.
  // Avoid passing null to Android's Appearance API because it crashes there.
  useEffect(() => {
    if (mode === 'system') return;
    Appearance.setColorScheme(mode);
  }, [mode]);

  const dark = mode === 'system' ? system === 'dark' : mode === 'dark';
  const theme = dark ? darkTheme : lightTheme;

  if (!settingsLoaded || !bootstrapped) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: system === 'dark' ? '#0E1514' : '#F5F8F7',
        }}
      >
        <ActivityIndicator size="large" color="#0F766E" />
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <RootNavigator />
    </PaperProvider>
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
