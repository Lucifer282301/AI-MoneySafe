import React, { useCallback, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ActivityIndicator,
  Button,
  Chip,
  Searchbar,
  Text,
  useTheme,
} from 'react-native-paper';

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

  useFocusEffect(
    useCallback(() => {
      const timer = setTimeout(() => {
        dispatch(fetchTransactions({ search, category, page: 1 }));
      }, 300);
      return () => clearTimeout(timer);
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

  const dark = theme.dark;

  return (
    <Screen
      title="Transactions"
      style={{ backgroundColor: dark ? '#111B16' : '#F6F5EF' }}
      right={
        <Button
          mode="contained"
          icon="plus"
          compact
          accessibilityLabel="Add transaction"
          onPress={() => navigation.navigate('TransactionForm')}
          style={styles.addButton}
          buttonColor={dark ? '#456B56' : '#315F49'}
          textColor="#FFFFFF"
        >
          Add
        </Button>
      }
    >
      <View style={styles.search}>
        <Searchbar
          placeholder="Search a merchant"
          accessibilityLabel="Search transactions"
          value={search}
          onChangeText={setSearch}
          style={[
            styles.searchbar,
            {
              backgroundColor: dark ? '#1D2A23' : '#FFFEFA',
              borderColor: dark ? '#34483B' : '#E5E5D9',
            },
          ]}
          inputStyle={styles.searchInput}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          selected={category === null}
          onPress={() => setCategory(null)}
          style={[
            styles.chip,
            category === null && {
              backgroundColor: dark ? '#365341' : '#DFEADF',
            },
          ]}
          textStyle={
            category === null
              ? [
                  styles.selectedChipText,
                  { color: dark ? '#D7EBDD' : '#315F49' },
                ]
              : undefined
          }
          accessibilityLabel="Show all transaction categories"
        >
          All
        </Chip>
        {CATEGORIES.map(c => {
          const selected = category === c;
          return (
            <Chip
              key={c}
              icon={CATEGORY_META[c].icon}
              selected={selected}
              onPress={() => setCategory(selected ? null : c)}
              style={[
                styles.chip,
                selected && {
                  backgroundColor: dark ? '#365341' : '#DFEADF',
                },
              ]}
              textStyle={
                selected
                  ? [
                      styles.selectedChipText,
                      { color: dark ? '#D7EBDD' : '#315F49' },
                    ]
                  : undefined
              }
              accessibilityLabel={`Filter by ${CATEGORY_META[c].label}`}
            >
              {CATEGORY_META[c].label}
            </Chip>
          );
        })}
      </ScrollView>

      <View style={styles.listHeading}>
        <View>
          <Text variant="titleMedium" style={styles.headingText}>
            Recent activity
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            Tap to edit · press and hold to remove
          </Text>
        </View>
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
        ItemSeparatorComponent={TransactionSeparator}
        refreshing={loading}
        onRefresh={() =>
          dispatch(fetchTransactions({ search, category, page: 1 }))
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        contentContainerStyle={[
          styles.list,
          { backgroundColor: dark ? '#1D2A23' : '#FFFEFA' },
          items.length === 0 && styles.emptyList,
        ]}
        ListFooterComponent={
          loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : undefined
        }
        ListEmptyComponent={
          loading ? undefined : (
            <View
              style={[
                styles.empty,
                { backgroundColor: dark ? '#1D2A23' : '#FFFEFA' },
              ]}
            >
              <Text variant="titleMedium" style={styles.headingText}>
                Nothing to show yet
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.emptyHint,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {error ?? 'Add a transaction or try a different search.'}
              </Text>
            </View>
          )
        }
      />
    </Screen>
  );
}

function TransactionSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  addButton: { borderRadius: 14 },
  search: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  searchbar: { borderWidth: 1, borderRadius: 16, elevation: 0 },
  searchInput: { minHeight: 44 },
  chips: { paddingHorizontal: 20, paddingVertical: 10 },
  chip: { marginRight: 8, borderRadius: 14 },
  selectedChipText: { color: '#315F49', fontWeight: '700' },
  listHeading: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 12 },
  headingText: { fontWeight: '700' },
  list: {
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 4,
    borderRadius: 22,
    overflow: 'hidden',
  },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 72,
    backgroundColor: 'rgba(144, 163, 146, 0.24)',
  },
  empty: {
    marginHorizontal: 4,
    paddingHorizontal: 28,
    paddingVertical: 32,
    alignItems: 'center',
    borderRadius: 20,
  },
  emptyHint: { marginTop: 6, textAlign: 'center' },
});
