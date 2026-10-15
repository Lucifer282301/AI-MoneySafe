import { useTheme } from 'react-native-paper';

export function useColors() {
  const { dark, colors } = useTheme();
  return {
    accent: dark ? '#6CC5A2' : '#21836B',
    income: dark ? '#78D0A2' : '#21836B',
    spent: dark ? '#B9C9BF' : '#52665C',
    danger: colors.error,
    warning: dark ? '#F3C579' : '#A96A1D',
    heroBg: dark ? '#10271F' : '#102A24',
    onHero: '#FFFFFF',
    heroMuted: 'rgba(255,255,255,0.65)',
    heroDivider: 'rgba(255,255,255,0.14)',
    heroTrack: 'rgba(255,255,255,0.18)',
  };
}
