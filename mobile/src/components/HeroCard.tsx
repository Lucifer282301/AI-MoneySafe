import React from 'react';
import { View, ViewStyle } from 'react-native';
import { useColors } from '../theme/useColors';

export default function HeroCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: colors.heroBg,
          borderRadius: 24,
          padding: 20,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          right: -40,
          top: -40,
          width: 140,
          height: 140,
          borderRadius: 70,
          backgroundColor: colors.accent,
          opacity: 0.14,
        }}
      />
      {children}
    </View>
  );
}
