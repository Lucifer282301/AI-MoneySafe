import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text, useTheme } from 'react-native-paper';
import CategoryIcon from './CategoryIcon';
import { CATEGORY_META } from '../utils/categories';
import { useColors } from '../theme/useColors';
import { useMoney } from '../utils/useMoney';
import type { Category } from '../types';

interface Props {
  category: Category;
  spent: number;
  limit?: number;
  total?: number;
}

export default function CategoryBar({ category, spent, limit, total }: Props) {
  const theme = useTheme();
  const colors = useColors();
  const money = useMoney();
  const meta = CATEGORY_META[category];

  const ratio = limit ? spent / limit : total ? spent / total : 0;
  const color = limit
    ? ratio >= 1
      ? colors.danger
      : ratio >= 0.8
      ? colors.warning
      : meta.color
    : meta.color;

  return (
    <View style={styles.row}>
      <CategoryIcon category={category} size={36} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {meta.label}
          </Text>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface }}>
            {money(spent)}
            {limit ? ` / ${money(limit)}` : ''}
          </Text>
        </View>
        <ProgressBar
          progress={Math.min(ratio, 1)}
          color={color}
          style={styles.bar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, marginLeft: 12 },
  flex: { flex: 1 },
  bar: { height: 8, borderRadius: 4, marginTop: 6 },
});
