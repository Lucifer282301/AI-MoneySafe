import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Text, useTheme } from 'react-native-paper';

export interface Slice {
  key: string;
  value: number;
  color: string;
}

interface Props {
  data: Slice[];
  label: string;
  value: string;
  size?: number;
  thickness?: number;
}

export default function DonutChart({
  data,
  label,
  value,
  size = 150,
  thickness = 18,
}: Props) {
  const theme = useTheme();
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const gap = data.length > 1 ? 3 : 0;

  let offset = 0;
  const arcs =
    total > 0
      ? data.map(d => {
          const length = (d.value / total) * circumference;
          const dash = Math.max(length - gap, 0.5);
          const arc = (
            <Circle
              key={d.key}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += length;
          return arc;
        })
      : null;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${c}, ${c}`}>
          <Circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={theme.colors.surfaceVariant}
            strokeWidth={thickness}
          />
          {arcs}
        </G>
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
        <Text
          variant="titleLarge"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontWeight: '800', maxWidth: size - thickness * 2 - 8 }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
