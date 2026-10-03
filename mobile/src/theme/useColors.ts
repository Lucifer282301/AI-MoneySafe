import { useTheme } from 'react-native-paper';

// Semantic colours that Paper's palette doesn't include
export function useColors() {
  const { dark, colors } = useTheme();
  return {
    income: dark ? '#4ADE80' : '#15803D',
    warning: dark ? '#FBBF24' : '#B45309',
    danger: colors.error,
  };
}
