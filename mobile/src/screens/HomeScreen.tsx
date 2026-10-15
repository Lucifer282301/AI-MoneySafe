import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Button, Icon, Text, useTheme } from 'react-native-paper';

import Screen from '../components/Screen';
import BrandGlyph from '../components/BrandGlyph';
import CategoryIcon from '../components/CategoryIcon';
import SectionCard from '../components/SectionCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { api, getErrorMessage } from '../api/client';
import { fetchTransactions } from '../store/slices/transactionsSlice';
import { useColors } from '../theme/useColors';
import { useMoney } from '../utils/useMoney';
import { formatDate } from '../utils/format';
import { CATEGORY_META } from '../utils/categories';
import type { Transaction } from '../types';
import type { MainStackParamList } from '../navigation/types';

interface HomeOverview {
  today: string;
  safe: {
    safeToSpend: number;
    shortfall: number;
    checking: number;
    savings: number;
    buffer: number;
    upcomingBills: number;
    plannedSavings: number;
    through: string;
  };
  accounts: Array<{ id: string; name: string; type: string; balance: number }>;
  attention: {
    count: number;
    transactionId: string;
    merchant: string;
    amount: number;
  } | null;
  suggestion: {
    goalId: string;
    goalName: string;
    amount: number;
    stillHave: number;
    fundedAfterPct: number;
  } | null;
  recent: Transaction[];
}

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function initials(name?: string) {
  return (
    name
      ?.trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase() || '?'
  );
}

function formatHomeDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date
    .toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    .toUpperCase();
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysAgo = Math.round((today.getTime() - txDay.getTime()) / 86400000);
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  return formatDate(value);
}

function HomeActivityRow({
  tx,
  onPress,
}: {
  tx: Transaction;
  onPress: (transaction: Transaction) => void;
}) {
  const theme = useTheme();
  const colors = useColors();
  const money = useMoney();
  const debit = tx.type === 'DEBIT';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${tx.merchant}, ${money(tx.amount)}`}
      onPress={() => onPress(tx)}
      style={styles.activityRow}
    >
      <CategoryIcon category={tx.category} size={40} />
      <View style={styles.activityBody}>
        <Text
          variant="titleSmall"
          numberOfLines={1}
          style={styles.activityName}
        >
          {tx.merchant}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {CATEGORY_META[tx.category].label} · {formatActivityDate(tx.date)}
        </Text>
      </View>
      <Text
        variant="titleSmall"
        style={[
          styles.activityAmount,
          { color: debit ? theme.colors.onSurface : colors.income },
        ]}
      >
        {debit ? '−' : '+'}
        {money(tx.amount)}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const theme = useTheme();
  const colors = useColors();
  const money = useMoney();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const user = useAppSelector(s => s.auth.user);
  const { items, loading } = useAppSelector(s => s.transactions);
  const [overview, setOverview] = useState<HomeOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const requestHomeData = useCallback(
    (isActive: () => boolean = () => true) => {
      dispatch(fetchTransactions({ page: 1 }));
      api
        .get<HomeOverview>('/overview')
        .then(({ data }) => {
          if (isActive()) {
            setOverview(data);
            setOverviewError(null);
          }
        })
        .catch(error => {
          if (isActive()) setOverviewError(getErrorMessage(error));
        });
    },
    [dispatch],
  );

  const load = useCallback(() => {
    let active = true;
    requestHomeData(() => active);
    return () => {
      active = false;
    };
  }, [requestHomeData]);

  const refresh = useCallback(() => requestHomeData(), [requestHomeData]);

  useFocusEffect(load);

  const recentItems = overview?.recent ?? items.slice(0, 2);

  return (
    <Screen style={{ backgroundColor: theme.dark ? '#0C1C17' : '#F3F5F0' }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
      >
        <View style={styles.topRow}>
          <View>
            <View style={styles.brandRow}>
              <View
                style={[styles.brandMark, { backgroundColor: colors.heroBg }]}
              >
                <BrandGlyph size={18} />
              </View>
              <Text variant="labelLarge" style={styles.brandName}>
                AI-MoneySafe
              </Text>
            </View>
            <Text
              variant="bodyMedium"
              style={[
                styles.dateLabel,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {formatHomeDate(overview?.today ?? new Date().toISOString())}
            </Text>
            <Text
              variant="headlineSmall"
              style={styles.greeting}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {greeting()}, {user?.name?.split(' ')[0] ?? 'there'}.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile and settings"
            onPress={() => navigation.navigate('Profile')}
            style={[
              styles.avatarButton,
              { borderColor: theme.colors.outlineVariant },
            ]}
          >
            <Avatar.Text
              size={38}
              label={initials(user?.name)}
              style={[{ backgroundColor: theme.colors.secondaryContainer }]}
              labelStyle={{ color: theme.colors.onSecondaryContainer }}
            />
          </Pressable>
        </View>

        <View style={[styles.safeCard, { backgroundColor: colors.heroBg }]}>
          <View style={styles.safeHeading}>
            <Text variant="labelLarge" style={{ color: colors.heroMuted }}>
              SAFE TO SPEND
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="About safe to spend"
              hitSlop={10}
              onPress={() =>
                Alert.alert(
                  'Safe to spend',
                  'This estimate accounts for your upcoming bills and safety buffer.',
                )
              }
            >
              <Icon
                source="information-outline"
                size={18}
                color={colors.heroMuted}
              />
            </Pressable>
          </View>
          {overview ? (
            <>
              <Text
                variant="displaySmall"
                style={styles.safeAmount}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {money(overview.safe.safeToSpend)}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.heroMuted }}>
                Through{' '}
                {new Date(overview.safe.through).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                · after bills &amp; your buffer
              </Text>
              <View style={styles.accountDivider} />
              <View style={styles.accountBalances}>
                <View style={styles.accountBalance}>
                  <Text
                    variant="labelSmall"
                    style={{ color: colors.heroMuted }}
                  >
                    Checking
                  </Text>
                  <Text variant="titleMedium" style={styles.accountAmount}>
                    {money(overview.safe.checking)}
                  </Text>
                </View>
                <View style={styles.accountBalance}>
                  <Text
                    variant="labelSmall"
                    style={{ color: colors.heroMuted }}
                  >
                    Savings
                  </Text>
                  <Text variant="titleMedium" style={styles.accountAmount}>
                    {money(overview.safe.savings)}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <Text variant="bodyMedium" style={styles.heroMessage}>
              {overviewError ?? 'Loading your account overview…'}
            </Text>
          )}
        </View>

        {overview?.attention && (
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Tabs', { screen: 'Safety' })}
            style={[
              styles.attention,
              { backgroundColor: theme.dark ? '#3A2B17' : '#F5EBD9' },
            ]}
          >
            <Icon
              source="shield-alert-outline"
              size={20}
              color={colors.warning}
            />
            <View style={styles.attentionCopy}>
              <Text
                variant="labelLarge"
                style={[
                  styles.attentionTitle,
                  { color: theme.dark ? theme.colors.onSurface : '#18312B' },
                ]}
              >
                {overview.attention.count === 1
                  ? 'One payment needs a closer look'
                  : `${overview.attention.count} payments need a closer look`}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.warning }}>
                {money(overview.attention.amount)} ·{' '}
                {overview.attention.merchant}
              </Text>
            </View>
            <Icon source="chevron-right" size={21} color={colors.warning} />
          </Pressable>
        )}

        {overview?.suggestion && (
          <SectionCard style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Icon source="creation-outline" size={19} color={colors.accent} />
              <Text
                variant="labelMedium"
                style={[styles.eyebrow, { color: colors.accent }]}
              >
                A LITTLE ROOM TO SAVE
              </Text>
            </View>
            <Text variant="titleSmall" style={styles.suggestionText}>
              Consider moving {money(overview.suggestion.amount)} into your{' '}
              {overview.suggestion.goalName}. Your upcoming bills are covered.
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.suggestionHint,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Based on your linked accounts
            </Text>
            <Pressable
              accessibilityRole="button"
              style={styles.suggestionAction}
              onPress={() =>
                navigation.navigate('Tabs', { screen: 'Assistant' })
              }
            >
              <Text variant="labelLarge" style={{ color: colors.accent }}>
                Ask AI why ↗
              </Text>
            </Pressable>
          </SectionCard>
        )}

        <View style={styles.activitySection}>
          <View style={styles.activityHeading}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Recent activity
            </Text>
            <Button
              compact
              mode="text"
              onPress={() =>
                navigation.navigate('Tabs', { screen: 'Activity' })
              }
            >
              View all
            </Button>
          </View>
          {recentItems.slice(0, 2).map((tx, index, rows) => (
            <View
              key={tx.id}
              style={[
                styles.activityItem,
                index < rows.length - 1 && {
                  borderBottomColor: theme.colors.outlineVariant,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <HomeActivityRow
                tx={tx}
                onPress={t => navigation.navigate('TransactionForm', { tx: t })}
              />
            </View>
          ))}
          {recentItems.length === 0 && (
            <Text
              style={[
                styles.emptyHint,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Nothing here yet. Add a transaction when you’re ready.
            </Text>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 24 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandName: { fontWeight: '700', letterSpacing: 0.1 },
  dateLabel: { fontSize: 9, letterSpacing: 0.3, fontWeight: '600' },
  greeting: { fontWeight: '800', marginTop: 2 },
  avatarButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  sectionTitle: { fontWeight: '700' },
  safeCard: { borderRadius: 18, padding: 20, overflow: 'hidden' },
  safeHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  safeAmount: {
    color: '#FFFFFF',
    fontWeight: '700',
    marginTop: 7,
    marginBottom: 3,
  },
  heroMessage: { color: '#FFFFFF', marginTop: 20, marginBottom: 10 },
  accountDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginVertical: 16,
  },
  accountBalances: { flexDirection: 'row' },
  accountBalance: { flex: 1 },
  accountAmount: { color: '#FFFFFF', fontWeight: '700', marginTop: 3 },
  attention: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    marginTop: 18,
    borderRadius: 15,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  attentionCopy: { flex: 1, marginHorizontal: 10 },
  attentionTitle: { fontWeight: '700' },
  suggestionCard: { marginTop: 18, padding: 15, borderRadius: 19 },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center' },
  eyebrow: {
    marginLeft: 8,
    letterSpacing: 0.5,
    fontWeight: '700',
  },
  suggestionText: { fontWeight: '600', marginTop: 8, lineHeight: 20 },
  suggestionHint: { marginTop: 8 },
  suggestionAction: {
    alignSelf: 'flex-end',
    marginTop: 6,
    paddingVertical: 3,
    paddingLeft: 12,
  },
  activitySection: { marginTop: 12 },
  activityHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  activityItem: { paddingVertical: 2 },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingVertical: 7,
  },
  activityBody: { flex: 1, marginHorizontal: 11 },
  activityName: { fontWeight: '700' },
  activityAmount: { fontWeight: '700', marginLeft: 6 },
  emptyHint: { paddingVertical: 14 },
});
