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
  const over = !!limit && ratio >= 1;
  const warn = !!limit && ratio >= 0.8 && !over;
  const barColor = over ? colors.danger : warn ? colors.warning : meta.color;
  const tagColor = over ? colors.danger : colors.warning;

  return (
    <View style={styles.row}>
      <CategoryIcon category={category} size={40} />
      <View style={styles.body}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            {meta.label}
          </Text>
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {money(spent)}
            {limit ? ` / ${money(limit)}` : ''}
          </Text>
          {(over || warn) && (
            <View style={[styles.tag, { backgroundColor: tagColor + '26' }]}>
              <Text
                variant="labelSmall"
                style={{ color: tagColor, fontWeight: '700' }}
              >
                {over ? 'Over' : `${Math.round(ratio * 100)}%`}
              </Text>
            </View>
          )}
        </View>
        <ProgressBar
          progress={Math.min(ratio, 1)}
          color={barColor}
          style={[styles.bar, { backgroundColor: theme.colors.surfaceVariant }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, marginLeft: 12 },
  flex: { flex: 1 },
  bar: { height: 6, borderRadius: 3, marginTop: 6 },
  tag: {
    marginLeft: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
});
