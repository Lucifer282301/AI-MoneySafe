import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import CategoryIcon from './CategoryIcon';
import { CATEGORY_META } from '../utils/categories';
import { formatDate } from '../utils/format';
import { useColors } from '../theme/useColors';
import { useMoney } from '../utils/useMoney';
import type { Transaction } from '../types';

interface Props {
  tx: Transaction;
  onPress?: (tx: Transaction) => void;
  onLongPress?: (tx: Transaction) => void;
}

export default function TransactionItem({ tx, onPress, onLongPress }: Props) {
  const theme = useTheme();
  const colors = useColors();
  const money = useMoney();
  const isDebit = tx.type === 'DEBIT';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tx.merchant}, ${money(tx.amount)}`}
      onPress={() => onPress?.(tx)}
      onLongPress={() => onLongPress?.(tx)}
      android_ripple={{ color: theme.colors.primaryContainer }}
      style={styles.row}
    >
      <CategoryIcon category={tx.category} />
      <View style={styles.body}>
        <Text variant="titleMedium" numberOfLines={1}>
          {tx.merchant}
        </Text>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {CATEGORY_META[tx.category].label} · {formatDate(tx.date)}
        </Text>
      </View>
      <Text
        variant="titleMedium"
        style={{
          color: isDebit ? theme.colors.onSurface : colors.income,
          fontWeight: '700',
        }}
      >
        {isDebit ? '-' : '+'}
        {money(tx.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  body: { flex: 1, marginHorizontal: 12 },
});
