import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Card,
  FAB,
  Icon,
  IconButton,
  Text,
  useTheme,
} from 'react-native-paper';

import Screen from '../components/Screen';
import CategoryBar from '../components/CategoryBar';
import TransactionItem from '../components/TransactionItem';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSummary,
  fetchTransactions,
} from '../store/slices/transactionsSlice';
import { fetchBudgets } from '../store/slices/budgetsSlice';
import { CATEGORY_META } from '../utils/categories';
import { monthLabel } from '../utils/format';
import { useColors } from '../theme/useColors';
import { useMoney } from '../utils/useMoney';
import type { Category, Transaction } from '../types';
import type { MainStackParamList } from '../navigation/types';

export default function HomeScreen() {
  const theme = useTheme();
  const colors = useColors();
  const money = useMoney();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const user = useAppSelector(s => s.auth.user);
  const { items, summary, loading } = useAppSelector(s => s.transactions);
  const budgets = useAppSelector(s => s.budgets.items);

  const now = new Date();
  const [period, setPeriod] = useState({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  });
  const isCurrentMonth =
    period.year === now.getFullYear() && period.month === now.getMonth() + 1;

  const load = useCallback(() => {
    dispatch(fetchTransactions({ page: 1 }));
    dispatch(fetchSummary({ month: period.month, year: period.year }));
    dispatch(fetchBudgets());
  }, [dispatch, period]);

  useFocusEffect(load);

  const shiftMonth = (delta: number) =>
    setPeriod(p => {
      const d = new Date(p.year, p.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  const categories = Object.entries(summary?.byCategory ?? {})
    .map(([c, amount]) => ({ category: c as Category, amount: amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);

  // Budget alerts only make sense for the current month
  const alerts = isCurrentMonth
    ? budgets
        .map(b => ({
          b,
          ratio: (summary?.byCategory[b.category] ?? 0) / b.limit,
        }))
        .filter(a => a.ratio >= 0.8)
        .sort((a, b) => b.ratio - a.ratio)
    : [];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
      >
        <Text
          variant="titleMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          Hello, {user?.name?.split(' ')[0]} 👋
        </Text>

        <View style={styles.monthRow}>
          <IconButton
            icon="chevron-left"
            accessibilityLabel="Previous month"
            onPress={() => shiftMonth(-1)}
          />
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {monthLabel(period.year, period.month)}
          </Text>
          <IconButton
            icon="chevron-right"
            accessibilityLabel="Next month"
            disabled={isCurrentMonth}
            onPress={() => shiftMonth(1)}
          />
        </View>

        <Card
          mode="contained"
          style={[
            styles.hero,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Card.Content>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onPrimaryContainer }}
            >
              Spent
            </Text>
            <Text
              variant="displaySmall"
              style={[
                styles.amount,
                { color: theme.colors.onPrimaryContainer },
              ]}
            >
              {money(summary?.total ?? 0)}
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onPrimaryContainer }}
            >
              {summary?.count ?? 0} expenses · Income{' '}
              {money(summary?.income ?? 0)}
            </Text>
          </Card.Content>
        </Card>

        {alerts.length > 0 && (
          <Card
            mode="outlined"
            style={[styles.alertCard, { borderColor: colors.warning }]}
          >
            <Card.Content>
              <View style={styles.alertTitle}>
                <Icon source="alert-outline" size={20} color={colors.warning} />
                <Text
                  variant="titleSmall"
                  style={{ marginLeft: 8, color: colors.warning }}
                >
                  Budget alerts
                </Text>
              </View>
              {alerts.map(({ b, ratio }) => (
                <Text key={b.id} variant="bodyMedium" style={{ marginTop: 4 }}>
                  {CATEGORY_META[b.category].label}:{' '}
                  {ratio >= 1
                    ? 'over budget'
                    : `${Math.round(ratio * 100)}% used`}
                </Text>
              ))}
            </Card.Content>
          </Card>
        )}

        <Text variant="titleMedium" style={styles.section}>
          By category
        </Text>
        {categories.length === 0 ? (
          <Text style={{ color: theme.colors.onSurfaceVariant }}>
            No spending this month.
          </Text>
        ) : (
          categories.map(({ category, amount }) => (
            <View key={category} style={styles.barWrap}>
              <CategoryBar
                category={category}
                spent={amount}
                limit={
                  isCurrentMonth
                    ? budgets.find(b => b.category === category)?.limit
                    : undefined
                }
                total={summary?.total}
              />
            </View>
          ))
        )}

        <Text variant="titleMedium" style={styles.section}>
          Recent
        </Text>
        <View style={styles.recent}>
          {items.slice(0, 5).map((tx: Transaction) => (
            <TransactionItem
              key={tx.id}
              tx={tx}
              onPress={t => navigation.navigate('TransactionForm', { tx: t })}
            />
          ))}
          {items.length === 0 && (
            <Text style={{ color: theme.colors.onSurfaceVariant, padding: 20 }}>
              Tap + to add your first transaction.
            </Text>
          )}
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        label="Add"
        accessibilityLabel="Add transaction"
        style={styles.fab}
        onPress={() => navigation.navigate('TransactionForm')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  hero: { borderRadius: 24 },
  amount: { fontWeight: '800', marginVertical: 4 },
  alertCard: { marginTop: 16, borderRadius: 16 },
  alertTitle: { flexDirection: 'row', alignItems: 'center' },
  section: { marginTop: 24, marginBottom: 12, fontWeight: '700' },
  barWrap: { marginBottom: 16 },
  recent: { marginHorizontal: -20 },
  fab: { position: 'absolute', right: 20, bottom: 20 },
});
