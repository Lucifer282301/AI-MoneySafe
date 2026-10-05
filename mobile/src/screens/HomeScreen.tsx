import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Icon, IconButton, Text, useTheme } from 'react-native-paper';

import Screen from '../components/Screen';
import HeroCard from '../components/HeroCard';
import SectionCard from '../components/SectionCard';
import DonutChart, { Slice } from '../components/DonutChart';
import TrendChart, { TrendBar } from '../components/TrendChart';
import TransactionItem from '../components/TransactionItem';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchSummary,
  fetchTransactions,
} from '../store/slices/transactionsSlice';
import { fetchBudgets } from '../store/slices/budgetsSlice';
import { fetchTrend } from '../store/slices/insightsSlice';
import { CATEGORY_META } from '../utils/categories';
import { formatCompact, monthLabel, shortMonth } from '../utils/format';
import { useColors } from '../theme/useColors';
import { useMoney } from '../utils/useMoney';
import type { Category } from '../types';
import type { MainStackParamList } from '../navigation/types';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

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
  const trend = useAppSelector(s => s.insights.trend);

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
    dispatch(fetchTrend());
  }, [dispatch, period]);

  useFocusEffect(load);

  const shiftMonth = (delta: number) =>
    setPeriod(p => {
      const d = new Date(p.year, p.month - 1 + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    });

  const total = summary?.total ?? 0;
  const income = summary?.income ?? 0;
  const net = income - total;

  const categories = Object.entries(summary?.byCategory ?? {})
    .map(([c, amount]) => ({ category: c as Category, amount: amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);

  const slices: Slice[] = categories.map(c => ({
    key: c.category,
    value: c.amount,
    color: CATEGORY_META[c.category].color,
  }));

  const bars: TrendBar[] = trend.map(p => ({
    label: shortMonth(p.month),
    income: p.income,
    expense: p.expense,
    current: p.year === period.year && p.month === period.month,
  }));

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
        <View style={styles.topRow}>
          <View>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {greeting()}
            </Text>
            <Text variant="headlineSmall" style={{ fontWeight: '800' }}>
              {user?.name?.split(' ')[0]}
            </Text>
          </View>
          <Button
            mode="contained"
            icon="plus"
            compact
            accessibilityLabel="Add transaction"
            onPress={() => navigation.navigate('TransactionForm')}
          >
            Add
          </Button>
        </View>

        <View style={styles.monthRow}>
          <IconButton
            icon="chevron-left"
            size={20}
            accessibilityLabel="Previous month"
            onPress={() => shiftMonth(-1)}
          />
          <Text variant="titleMedium" style={{ fontWeight: '700' }}>
            {monthLabel(period.year, period.month)}
          </Text>
          <IconButton
            icon="chevron-right"
            size={20}
            accessibilityLabel="Next month"
            disabled={isCurrentMonth}
            onPress={() => shiftMonth(1)}
          />
        </View>

        <HeroCard>
          <Text variant="labelLarge" style={{ color: colors.heroMuted }}>
            Spent this month
          </Text>
          <Text
            variant="displaySmall"
            style={[styles.amount, { color: colors.onHero }]}
          >
            {money(total)}
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text variant="labelMedium" style={{ color: colors.heroMuted }}>
                Income
              </Text>
              <Text
                variant="titleMedium"
                style={{ color: colors.accent, fontWeight: '700' }}
              >
                {money(income)}
              </Text>
            </View>
            <View
              style={[
                styles.heroStat,
                styles.heroStatRight,
                { borderLeftColor: colors.heroDivider },
              ]}
            >
              <Text variant="labelMedium" style={{ color: colors.heroMuted }}>
                Net
              </Text>
              <Text
                variant="titleMedium"
                style={{ color: colors.onHero, fontWeight: '700' }}
              >
                {net >= 0 ? '+' : '-'}
                {money(Math.abs(net))}
              </Text>
            </View>
          </View>
        </HeroCard>

        {alerts.length > 0 && (
          <View
            style={[styles.alert, { backgroundColor: colors.warning + '1F' }]}
          >
            <Icon
              source="alert-circle-outline"
              size={20}
              color={colors.warning}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              {alerts.map(({ b, ratio }) => (
                <Text
                  key={b.id}
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {CATEGORY_META[b.category].label} is{' '}
                  <Text style={{ fontWeight: '700', color: colors.warning }}>
                    {ratio >= 1
                      ? 'over budget'
                      : `at ${Math.round(ratio * 100)}% of budget`}
                  </Text>
                </Text>
              ))}
            </View>
          </View>
        )}

        <SectionCard title="Spending" style={styles.section}>
          {categories.length === 0 ? (
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              No spending this month.
            </Text>
          ) : (
            <View style={styles.donutRow}>
              <DonutChart
                data={slices}
                label="Total"
                value={formatCompact(total)}
              />
              <View style={styles.legend}>
                {categories.slice(0, 5).map(c => (
                  <View key={c.category} style={styles.legendRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: CATEGORY_META[c.category].color },
                      ]}
                    />
                    <Text
                      variant="bodySmall"
                      style={{ flex: 1 }}
                      numberOfLines={1}
                    >
                      {CATEGORY_META[c.category].label}
                    </Text>
                    <Text
                      variant="labelMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {total > 0 ? Math.round((c.amount / total) * 100) : 0}%
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </SectionCard>

        <SectionCard title="Last 6 months" style={styles.section}>
          <TrendChart data={bars} />
          <View style={styles.trendLegend}>
            <View style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: colors.accent }]} />
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Income
              </Text>
            </View>
            <View style={[styles.legendRow, { marginLeft: 16 }]}>
              <View style={[styles.dot, { backgroundColor: colors.spent }]} />
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Spent
              </Text>
            </View>
          </View>
        </SectionCard>

        <SectionCard
          title="Recent"
          style={[styles.section, { paddingHorizontal: 0 }]}
        >
          {items.slice(0, 5).map(tx => (
            <TransactionItem
              key={tx.id}
              tx={tx}
              onPress={t => navigation.navigate('TransactionForm', { tx: t })}
            />
          ))}
          {items.length === 0 && (
            <Text
              style={{
                color: theme.colors.onSurfaceVariant,
                paddingHorizontal: 16,
              }}
            >
              Tap + to add your first transaction.
            </Text>
          )}
        </SectionCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  amount: { fontWeight: '800', marginTop: 4, marginBottom: 16 },
  heroStats: { flexDirection: 'row' },
  heroStat: { flex: 1 },
  heroStatRight: { borderLeftWidth: 1, paddingLeft: 16 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    marginTop: 14,
  },
  section: { marginTop: 14 },
  donutRow: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, marginLeft: 16 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  trendLegend: { flexDirection: 'row', marginTop: 4 },
});
