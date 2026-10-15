import React, { useCallback, useState } from 'react';
import {
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Icon,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { api, getErrorMessage } from '../api/client';
import Screen from '../components/Screen';
import SectionCard from '../components/SectionCard';
import { useMoney } from '../utils/useMoney';

type AccountType = 'CHECKING' | 'SAVINGS';

interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
}

export default function AccountsScreen() {
  const theme = useTheme();
  const money = useMoney();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('CHECKING');
  const [balance, setBalance] = useState('0');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const { data } = await api.get<Account[]>('/accounts');
      setAccounts(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openForm = (account?: Account) => {
    setEditing(account ?? null);
    setName(account?.name ?? '');
    setType(account?.type ?? 'CHECKING');
    setBalance(String(account?.balance ?? 0));
    setFormError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    const cleanName = name.trim();
    const amount = Number(balance);
    if (!cleanName || cleanName.length > 40) {
      setFormError('Enter an account name up to 40 characters.');
      return;
    }
    if (!Number.isFinite(amount) || Math.abs(amount) > 1e10) {
      setFormError('Enter a valid balance.');
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const payload = { name: cleanName, type, balance: amount };
      if (editing) await api.patch(`/accounts/${editing.id}`, payload);
      else await api.post('/accounts', payload);
      setDialogOpen(false);
      await load(true);
    } catch (e) {
      setFormError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = (account: Account) => {
    Alert.alert(
      `Remove ${account.name}?`,
      'Its transactions will stay in your history, but will no longer be linked to this account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove account',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/accounts/${account.id}`);
              await load(true);
            } catch (e) {
              setError(getErrorMessage(e));
            }
          },
        },
      ],
    );
  };

  const checking = accounts
    .filter(account => account.type === 'CHECKING')
    .reduce((sum, account) => sum + account.balance, 0);
  const savings = accounts
    .filter(account => account.type === 'SAVINGS')
    .reduce((sum, account) => sum + account.balance, 0);

  return (
    <Screen
      title="Accounts & balances"
      right={
        <Button
          mode="contained"
          compact
          icon="plus"
          disabled={accounts.length >= 10}
          onPress={() => openForm()}
        >
          Add
        </Button>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
          />
        }
      >
        <SectionCard style={styles.summary}>
          <Text variant="labelLarge" style={styles.eyebrow}>
            ACCOUNTS YOU TRACK
          </Text>
          <Text variant="headlineMedium" style={styles.total}>
            {money(checking + savings)}
          </Text>
          <View style={styles.totalsRow}>
            <View style={styles.totalItem}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Checking
              </Text>
              <Text variant="titleMedium" style={styles.totalAmount}>
                {money(checking)}
              </Text>
            </View>
            <View style={styles.totalItem}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Savings
              </Text>
              <Text variant="titleMedium" style={styles.totalAmount}>
                {money(savings)}
              </Text>
            </View>
          </View>
        </SectionCard>

        <View style={styles.heading}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Your accounts
          </Text>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {accounts.length}/10
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} />
        ) : error ? (
          <SectionCard style={styles.empty}>
            <Text variant="titleMedium">Accounts didn’t load</Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
            >
              {error}
            </Text>
            <Button onPress={() => load()} style={styles.emptyAction}>
              Try again
            </Button>
          </SectionCard>
        ) : accounts.length === 0 ? (
          <SectionCard style={styles.empty}>
            <Icon
              source="bank-outline"
              size={28}
              color={theme.colors.secondary}
            />
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Start with an account
            </Text>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 6 }}
            >
              Add the balances you want MoneySafe to consider in your
              safe-to-spend view.
            </Text>
            <Button
              mode="contained"
              icon="plus"
              onPress={() => openForm()}
              style={styles.emptyAction}
            >
              Add your first account
            </Button>
          </SectionCard>
        ) : (
          accounts.map(account => (
            <SectionCard key={account.id} style={styles.accountCard}>
              <View style={styles.accountRow}>
                <View
                  style={[
                    styles.accountIcon,
                    { backgroundColor: theme.colors.secondaryContainer },
                  ]}
                >
                  <Icon
                    source={
                      account.type === 'CHECKING'
                        ? 'bank-outline'
                        : 'piggy-bank-outline'
                    }
                    size={21}
                    color={theme.colors.secondary}
                  />
                </View>
                <View style={styles.accountInfo}>
                  <Text variant="titleMedium" style={styles.accountName}>
                    {account.name}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {account.type === 'CHECKING' ? 'Checking' : 'Savings'}
                  </Text>
                </View>
                <Text variant="titleMedium" style={styles.balance}>
                  {money(account.balance)}
                </Text>
              </View>
              <View style={styles.actions}>
                <Button
                  compact
                  mode="text"
                  icon="pencil-outline"
                  onPress={() => openForm(account)}
                >
                  Edit
                </Button>
                <Button
                  compact
                  mode="text"
                  textColor={theme.colors.error}
                  icon="delete-outline"
                  onPress={() => remove(account)}
                >
                  Remove
                </Button>
              </View>
            </SectionCard>
          ))
        )}
      </ScrollView>

      <Portal>
        <Dialog
          visible={dialogOpen}
          onDismiss={() => !saving && setDialogOpen(false)}
        >
          <Dialog.Title>
            {editing ? 'Update account' : 'Add an account'}
          </Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Account name"
              mode="outlined"
              value={name}
              onChangeText={setName}
              maxLength={40}
              autoFocus
            />
            <SegmentedButtons
              style={styles.accountType}
              value={type}
              onValueChange={value => setType(value as AccountType)}
              buttons={[
                { value: 'CHECKING', label: 'Checking' },
                { value: 'SAVINGS', label: 'Savings' },
              ]}
            />
            <TextInput
              label="Current balance"
              mode="outlined"
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
            />
            {formError ? (
              <Text style={[styles.formError, { color: theme.colors.error }]}>
                {formError}
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onPress={save} loading={saving} disabled={saving}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 36 },
  summary: { padding: 20, borderRadius: 24 },
  eyebrow: { color: '#21836B', letterSpacing: 0.7, fontWeight: '700' },
  total: { fontWeight: '800', marginTop: 6 },
  totalsRow: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DCE4DC',
    marginTop: 16,
    paddingTop: 14,
  },
  totalItem: { flex: 1 },
  totalAmount: { fontWeight: '700', marginTop: 3 },
  heading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 10,
  },
  sectionTitle: { fontWeight: '700' },
  loader: { marginTop: 36 },
  empty: { padding: 20, borderRadius: 22, alignItems: 'flex-start' },
  emptyTitle: { fontWeight: '700', marginTop: 10 },
  emptyAction: { marginTop: 14 },
  accountCard: { marginBottom: 12, borderRadius: 20 },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  accountIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: { flex: 1, marginLeft: 12 },
  accountName: { fontWeight: '700' },
  balance: { fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E1E8E1',
    paddingTop: 4,
  },
  accountType: { marginVertical: 16 },
  formError: { marginTop: 10 },
});
