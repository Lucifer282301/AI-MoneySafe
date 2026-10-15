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
      dispatch(fetchSummary());
    }, [dispatch]),
  );

  const totalLimit = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const totalUsed = budgets.reduce(
    (sum, budget) => sum + (summary?.byCategory[budget.category] ?? 0),
    0,
  );
  const ratio = totalLimit > 0 ? totalUsed / totalLimit : 0;
  const fillColor =
    ratio >= 1 ? colors.danger : ratio >= 0.8 ? colors.warning : '#A8C5AA';
  const existing = editing
    ? budgets.find(budget => budget.category === editing)
    : undefined;
  const dark = theme.dark;

  const open = (category: Category) => {
    setEditing(category);
    setValue(
      String(budgets.find(budget => budget.category === category)?.limit ?? ''),
    );
  };

  const save = async () => {
    const limit = parseFloat(value);
    if (!editing || !(limit > 0)) return;
    await dispatch(saveBudget({ category: editing, limit }));
    setEditing(null);

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
    if (existing) {
      const now = new Date();
      const period = `${now.getFullYear()}-${String(
        now.getMonth() + 1,
      ).padStart(2, '0')}`;
      await dispatch(deleteBudget({ category: existing.category, period }));
    }
    setEditing(null);
  };

  return (
    <Screen
      title="Budgets"
      style={{ backgroundColor: dark ? '#111B16' : '#F6F5EF' }}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.hero,
            { backgroundColor: dark ? '#20392D' : '#214A38' },
          ]}
        >
          <View style={styles.heroOrnament} />
          <Text variant="labelLarge" style={styles.heroLabel}>
            MONTHLY OVERVIEW
          </Text>
          <Text variant="bodyMedium" style={styles.heroSubhead}>
            Spent across your budgeted categories
          </Text>
          <Text variant="headlineMedium" style={styles.total}>
            {money(totalUsed)}
            {totalLimit > 0 && (
              <Text variant="titleSmall" style={styles.totalLimit}>
                {'  '}of {money(totalLimit)}
              </Text>
            )}
          </Text>
          <View style={styles.track}>
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
          <View style={styles.heroFoot}>
            <Text variant="bodySmall" style={styles.heroFootText}>
              {totalLimit === 0
                ? 'Set your first limit below to start tracking.'
                : `${Math.round(ratio * 100)}% of your total limit used`}
            </Text>
            {ratio >= 0.8 && totalLimit > 0 && (
              <Text variant="labelSmall" style={styles.alertTag}>
                {ratio >= 1 ? 'Over budget' : 'Almost there'}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Category limits
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Monthly · tap a card to edit
          </Text>
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map(category => (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={`Set ${CATEGORY_META[category].label} budget`}
              accessibilityHint="Opens the monthly budget limit editor"
              onPress={() => open(category)}
              style={({ pressed }) => [
                styles.categoryCard,
                {
                  backgroundColor: dark ? '#1D2A23' : '#FFFEFA',
                  borderColor: dark ? '#33463A' : '#E6E5DA',
                },
                pressed && styles.pressed,
              ]}
            >
              <CategoryBar
                category={category}
                spent={summary?.byCategory[category] ?? 0}
                limit={
                  budgets.find(budget => budget.category === category)?.limit
                }
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={!!editing} onDismiss={() => setEditing(null)}>
          <Dialog.Title>
            {editing ? `${CATEGORY_META[editing].label} budget` : ''}
          </Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodyMedium"
              style={[
                styles.dialogHint,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Choose a monthly limit to keep this category on track.
            </Text>
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
            {existing && (
              <Button
                onPress={remove}
                textColor={theme.colors.error}
                accessibilityLabel="Remove this budget"
              >
                Remove
              </Button>
            )}
            <Button onPress={() => setEditing(null)}>Cancel</Button>
            <Button onPress={save}>Save</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 40 },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 26,
    padding: 20,
  },
  heroOrnament: {
    position: 'absolute',
    right: -40,
    top: -50,
    width: 155,
    height: 155,
    borderRadius: 78,
    backgroundColor: '#A8C5AA',
    opacity: 0.11,
  },
  heroLabel: {
    color: '#D4E3D6',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  heroSubhead: { color: '#D4E3D6', marginTop: 3 },
  total: { color: '#FFFFFF', fontWeight: '800', marginTop: 12 },
  totalLimit: { color: '#D4E3D6', fontWeight: '500' },
  track: {
    height: 8,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginTop: 16,
  },
  fill: { height: '100%', borderRadius: 5 },
  heroFoot: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroFootText: { color: '#D4E3D6', flex: 1 },
  alertTag: {
    overflow: 'hidden',
    color: '#FFF4DB',
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  sectionHeading: { marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontWeight: '700' },
  grid: { gap: 10 },
  categoryCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pressed: { opacity: 0.78 },
  dialogHint: { marginBottom: 12 },
});
