import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';
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
import type { Category } from '../types';

export default function BudgetsScreen() {
  const theme = useTheme();
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
  };

  const remove = async () => {
    if (existing) await dispatch(deleteBudget(existing.id));
    setEditing(null);
  };

  return (
    <Screen title="Budgets">
      <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
        Tap a category to set its monthly limit.
      </Text>
      <FlatList
        data={CATEGORIES}
        keyExtractor={c => c}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Set ${CATEGORY_META[item].label} budget`}
            onPress={() => open(item)}
            style={styles.item}
          >
            <CategoryBar
              category={item}
              spent={summary?.byCategory[item] ?? 0}
              limit={budgets.find(b => b.category === item)?.limit}
            />
          </Pressable>
        )}
      />

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
  hint: { paddingHorizontal: 20, marginBottom: 8 },
  list: { padding: 20 },
  item: { paddingVertical: 12 },
});
