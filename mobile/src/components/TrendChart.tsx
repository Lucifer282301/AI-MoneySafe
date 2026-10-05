import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from 'react-native-paper';
import { useColors } from '../theme/useColors';

export interface TrendBar {
  label: string;
  income: number;
  expense: number;
  current: boolean;
}

export default function TrendChart({
  data,
  height = 150,
}: {
  data: TrendBar[];
  height?: number;
}) {
  const theme = useTheme();
  const colors = useColors();
  const [width, setWidth] = useState(0);

  const max = Math.max(1, ...data.flatMap(d => [d.income, d.expense]));
  const plotH = height - 24;
  const slot = data.length ? width / data.length : 0;
  const barW = Math.min(14, slot / 3);

  return (
    <View
      style={{ height }}
      onLayout={e => setWidth(e.nativeEvent.layout.width)}
    >
      {width > 0 && (
        <Svg width={width} height={height}>
          {[0.5, 1].map(t => (
            <Line
              key={t}
              x1={0}
              x2={width}
              y1={plotH - plotH * t}
              y2={plotH - plotH * t}
              stroke={theme.colors.outlineVariant}
              strokeDasharray="3 4"
              strokeWidth={1}
            />
          ))}
          {data.map((d, i) => {
            const x = slot * i + slot / 2;
            const hi = (d.income / max) * plotH;
            const he = (d.expense / max) * plotH;
            const opacity = d.current ? 1 : 0.4;
            return (
              <G key={d.label}>
                <Rect
                  x={x - barW - 1}
                  y={plotH - hi}
                  width={barW}
                  height={hi}
                  rx={4}
                  fill={colors.accent}
                  opacity={opacity}
                />
                <Rect
                  x={x + 1}
                  y={plotH - he}
                  width={barW}
                  height={he}
                  rx={4}
                  fill={colors.spent}
                  opacity={opacity}
                />
                <SvgText
                  x={x}
                  y={height - 6}
                  fontSize={11}
                  textAnchor="middle"
                  fill={theme.colors.onSurfaceVariant}
                  fontWeight={d.current ? '700' : '400'}
                >
                  {d.label}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      )}
    </View>
  );
}
