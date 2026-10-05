import { useTheme } from 'react-native-paper';

export function useColors() {
  const { dark, colors } = useTheme();
  return {
    accent: dark ? '#4ADE80' : '#16A34A',
    income: dark ? '#4ADE80' : '#15803D',
    spent: dark ? '#CBD5E1' : '#334155',
    danger: colors.error,
    warning: dark ? '#FBBF24' : '#B45309',
    heroBg: dark ? '#1B2128' : '#0F172A',
    onHero: '#FFFFFF',
    heroMuted: 'rgba(255,255,255,0.65)',
    heroDivider: 'rgba(255,255,255,0.14)',
    heroTrack: 'rgba(255,255,255,0.18)',
  };
}