import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Chip, Searchbar, Text, useTheme } from 'react-native-paper';

import Screen from '../components/Screen';
import TransactionItem from '../components/TransactionItem';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  deleteTransaction,
  fetchSummary,
  fetchTransactions,
} from '../store/slices/transactionsSlice';
import { CATEGORIES, CATEGORY_META } from '../utils/categories';
import type { Category, Transaction } from '../types';
import type { MainStackParamList } from '../navigation/types';

export default function TransactionsScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { items, loading, loadingMore, hasMore, page, error } = useAppSelector(
    s => s.transactions,
  );

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category | null>(null);

  // Reload from page 1 on focus and whenever filters change (debounced)
  useFocusEffect(
    useCallback(() => {
      const t = setTimeout(() => {
        dispatch(fetchTransactions({ search, category, page: 1 }));
      }, 300);
      return () => clearTimeout(t);
    }, [dispatch, search, category]),
  );

  const loadMore = () => {
    if (hasMore && !loading && !loadingMore && items.length > 0) {
      dispatch(fetchTransactions({ search, category, page: page + 1 }));
    }
  };

  const confirmDelete = (tx: Transaction) => {
    Alert.alert('Delete transaction', `Remove ${tx.merchant}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deleteTransaction(tx.id));
          dispatch(fetchSummary());
        },
      },
    ]);
  };

  return (
    <Screen
  title="Transactions"
  right={
    <Button
      mode="contained"
      icon="plus"
      compact
      accessibilityLabel="Add transaction"
      onPress={() => navigation.navigate('TransactionForm')}>
      Add
    </Button>
  }>
      <View style={styles.search}>
        <Searchbar
          placeholder="Search merchant"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          <Chip
            selected={category === null}
            onPress={() => setCategory(null)}
            style={styles.chip}
          >
            All
          </Chip>
          {CATEGORIES.map(c => (
            <Chip
              key={c}
              icon={CATEGORY_META[c].icon}
              selected={category === c}
              onPress={() => setCategory(category === c ? null : c)}
              style={styles.chip}
            >
              {CATEGORY_META[c].label}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={items}
        keyExtractor={t => t.id}
        renderItem={({ item }) => (
          <TransactionItem
            tx={item}
            onPress={tx => navigation.navigate('TransactionForm', { tx })}
            onLongPress={confirmDelete}
          />
        )}
        refreshing={loading}
        onRefresh={() =>
          dispatch(fetchTransactions({ search, category, page: 1 }))
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined
        }
        ListEmptyComponent={
          loading ? undefined : (
            <Text
              style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}
            >
              {error ?? 'No transactions found.'}
            </Text>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: 20, paddingBottom: 8 },
  chips: { paddingHorizontal: 20, paddingVertical: 8 },
  chip: { marginRight: 8 },
  empty: { textAlign: 'center', marginTop: 40 },
});
