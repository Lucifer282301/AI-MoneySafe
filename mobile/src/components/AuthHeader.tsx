import React from 'react';
import { View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { useColors } from '../theme/useColors';

export default function AuthHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const theme = useTheme();
  const colors = useColors();
  return (
    <View style={{ alignItems: 'center', marginBottom: 32 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: colors.heroBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon source="shield-check" size={34} color={colors.accent} />
      </View>
      <Text
        variant="headlineSmall"
        style={{ fontWeight: '800', marginTop: 16 }}
      >
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
      >
        {subtitle}
      </Text>
    </View>
  );
}
