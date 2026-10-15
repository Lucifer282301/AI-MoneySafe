import React, { PropsWithChildren } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider, useTheme as usePaperTheme } from 'react-native-paper';

import { useAppSelector } from '../store/hooks';
import { darkTheme, lightTheme } from './theme';

export function ThemeProvider({ children }: PropsWithChildren) {
  const mode = useAppSelector(state => state.settings.mode);
  const systemColorScheme = useColorScheme();
  const theme =
    mode === 'dark' || (mode === 'system' && systemColorScheme === 'dark')
      ? darkTheme
      : lightTheme;

  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

export function useTheme() {
  return usePaperTheme();
}
