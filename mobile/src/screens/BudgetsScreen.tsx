import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { enablePush, shouldAskForPush } from '../notifications/push';
import { useFocusEffect } from '@react-navigation/native';
import {
  Button,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import Screen from '../components/Screen';
import HeroCard from '../components/HeroCard';
import SectionCard from '../components/SectionCard';
import CategoryBar from '../components/CategoryBar';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  deleteBudget,
  fetchBudgets,
  saveBudget,
} from '../store/slices/budgetsSlice';
import { fetchSummary } from '../store/slices/transactionsSlice';
import { CATEGORIES, CATEGORY_META } from '../utils/categories';
import { useColors } from '../theme/useColors';
import { useMoney } from '../utils/useMoney';
import type { Category } from '../types';

export default function BudgetsScreen() {
  const theme = useTheme();
  const colors = useColors();
  const money = useMoney();
  const dispatch = useAppDispatch();
  const budgets = useAppSelector(s => s.budgets.items);
  const summary = useAppSelector(s => s.transactions.summary);

  const [editing, setEditing] = useState<Category | null>(null);
  const [value, setValue] = useState('');

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBudgets());
      dispatch(fetchSummary()); // current month
    }, [dispatch]),
  );

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);
  const totalUsed = budgets.reduce(
    (s, b) => s + (summary?.byCategory[b.category] ?? 0),
    0,
  );
  const ratio = totalLimit > 0 ? totalUsed / totalLimit : 0;
  const fillColor =
    ratio >= 1 ? colors.danger : ratio >= 0.8 ? colors.warning : colors.accent;

  const existing = editing
    ? budgets.find(b => b.category === editing)
    : undefined;

  const open = (c: Category) => {
    setEditing(c);
    setValue(String(budgets.find(b => b.category === c)?.limit ?? ''));
  };

  const save = async () => {
    const n = parseFloat(value);
    if (!editing || !(n > 0)) return;
    await dispatch(saveBudget({ category: editing, limit: n }));
    setEditing(null);

    // Ask once, right when alerts become useful
    if (await shouldAskForPush()) {
      Alert.alert(
        'Get budget alerts?',
        'We can notify you when you reach 80% and 100% of a budget.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Turn on',
            onPress: async () => {
              const result = await enablePush();
              if (result === 'denied') {
                Alert.alert(
                  'Notifications are off',
                  'You can allow them in your phone settings.',
                );
              }
            },
          },
        ],
      );
    }
  };

  const remove = async () => {
    if (existing) await dispatch(deleteBudget(existing.id));
    setEditing(null);
  };

  return (
    <Screen title="Budgets">
      <ScrollView contentContainerStyle={styles.content}>
        <HeroCard>
          <Text variant="labelLarge" style={{ color: colors.heroMuted }}>
            Used this month
          </Text>
          <Text
            variant="headlineMedium"
            style={{ color: colors.onHero, fontWeight: '800', marginTop: 2 }}
          >
            {money(totalUsed)}
            <Text variant="bodyMedium" style={{ color: colors.heroMuted }}>
              {totalLimit > 0 ? `  of ${money(totalLimit)}` : ''}
            </Text>
          </Text>
          <View style={[styles.track, { backgroundColor: colors.heroTrack }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.min(ratio, 1) * 100}%`,
                  backgroundColor: fillColor,
                },
              ]}
            />
          </View>
          {totalLimit === 0 && (
            <Text
              variant="bodySmall"
              style={{ color: colors.heroMuted, marginTop: 8 }}
            >
              Set a limit below to start tracking.
            </Text>
          )}
        </HeroCard>

        <Text
          variant="bodySmall"
          style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}
        >
          Tap a category to set its monthly limit.
        </Text>

        <SectionCard>
          {CATEGORIES.map(c => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`Set ${CATEGORY_META[c].label} budget`}
              onPress={() => open(c)}
              style={styles.item}
            >
              <CategoryBar
                category={c}
                spent={summary?.byCategory[c] ?? 0}
                limit={budgets.find(b => b.category === c)?.limit}
              />
            </Pressable>
          ))}
        </SectionCard>
      </ScrollView>

      <Portal>
        <Dialog visible={!!editing} onDismiss={() => setEditing(null)}>
          <Dialog.Title>
            {editing ? `${CATEGORY_META[editing].label} budget` : ''}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Monthly limit"
              mode="outlined"
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            {existing && <Button onPress={remove}>Remove</Button>}
            <Button onPress={() => setEditing(null)}>Cancel</Button>
            <Button onPress={save}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  hint: { marginTop: 14, marginBottom: 10 },
  item: { paddingVertical: 10 },
  track: { height: 6, borderRadius: 3, marginTop: 14 },
  fill: { height: '100%', borderRadius: 3 },
});
