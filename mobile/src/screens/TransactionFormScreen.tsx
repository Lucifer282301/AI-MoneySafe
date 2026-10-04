import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  Chip,
  HelperText,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import {
  CameraOptions,
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';

import { api, getErrorMessage } from '../api/client';
import { useAppDispatch } from '../store/hooks';
import {
  addTransaction,
  deleteTransaction,
  fetchSummary,
  updateTransaction,
} from '../store/slices/transactionsSlice';
import { CATEGORIES, CATEGORY_META } from '../utils/categories';
import { toDateInput, todayISO } from '../utils/format';
import type { MainStackParamList } from '../navigation/types';
import type { Category, ExtractedReceipt, TransactionType } from '../types';

type Props = NativeStackScreenProps<MainStackParamList, 'TransactionForm'>;

export default function TransactionFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const editing = route.params?.tx;

  const [merchant, setMerchant] = useState(editing?.merchant ?? '');
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '');
  const [category, setCategory] = useState<Category>(
    editing?.category ?? 'FOOD',
  );
  const [type, setType] = useState<TransactionType>(editing?.type ?? 'DEBIT');
  const [date, setDate] = useState(
    editing ? toDateInput(editing.date) : todayISO(),
  );
  const [note, setNote] = useState(editing?.note ?? '');
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    editing?.receiptUrl ?? null,
  );

  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({
      title: editing ? 'Edit transaction' : 'Add transaction',
    });
  }, [navigation, editing]);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera access required',
        message: 'This app needs camera access to scan receipts.',
        buttonNeutral: 'Ask me later',
        buttonNegative: 'Cancel',
        buttonPositive: 'Allow',
      },
    );

    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const scan = async (source: 'camera' | 'gallery') => {
    setError(null);

    if (source === 'camera') {
      const permissionGranted = await requestCameraPermission();
      if (!permissionGranted) {
        setError('Camera permission is required to scan receipts.');
        return;
      }
    }

    const options: CameraOptions = {
      mediaType: 'photo',
      includeBase64: true,
      quality: 0.7,
      maxWidth: 1600,
      maxHeight: 1600,
    };

    const res =
      source === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);
    if (res.didCancel) return;
    if (res.errorCode) {
      setError(res.errorMessage ?? 'Could not open the image');
      return;
    }
    const asset = res.assets?.[0];
    if (!asset?.base64) {
      setError('Could not read the image');
      return;
    }

    setScanning(true);
    try {
      const { data } = await api.post<ExtractedReceipt>('/ai/extract', {
        image: asset.base64,
        mimeType: asset.type ?? 'image/jpeg',
        today: todayISO(),
      });
      setMerchant(data.merchant ?? '');
      setAmount(data.amount != null ? String(data.amount) : '');
      if (CATEGORIES.includes(data.category)) setCategory(data.category);
      setDate(data.date || todayISO());
      setNote(data.note ?? '');
      setReceiptUrl(data.receiptUrl ?? null);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setScanning(false);
    }
  };

  const save = async () => {
    const value = parseFloat(amount);
    if (!merchant.trim()) return setError('Enter a merchant name');
    if (!(value > 0)) return setError('Enter an amount greater than 0');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
      return setError('Date must be YYYY-MM-DD');

    const payload = {
      merchant: merchant.trim(),
      amount: value,
      category,
      type,
      date,
      note: note.trim(),
      receiptUrl,
    };

    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await dispatch(
          updateTransaction({ id: editing.id, data: payload }),
        ).unwrap();
      } else {
        await dispatch(addTransaction(payload)).unwrap();
      }
      dispatch(fetchSummary());
      navigation.goBack();
    } catch (e) {
      setError(typeof e === 'string' ? e : 'Could not save the transaction');
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert('Delete transaction', `Remove ${editing.merchant}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await dispatch(deleteTransaction(editing.id));
          dispatch(fetchSummary());
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {receiptUrl && (
          <Image
            source={{ uri: receiptUrl }}
            style={styles.receipt}
            resizeMode="cover"
            accessibilityLabel="Receipt image"
          />
        )}

        <Text variant="titleMedium" style={styles.label}>
          Scan a receipt or payment screenshot
        </Text>
        <View style={styles.row}>
          <Button
            mode="outlined"
            icon="camera"
            onPress={() => scan('camera')}
            disabled={scanning}
            style={styles.flex}
          >
            Camera
          </Button>
          <Button
            mode="outlined"
            icon="image"
            onPress={() => scan('gallery')}
            disabled={scanning}
            style={styles.flex}
          >
            Gallery
          </Button>
        </View>
        {scanning && (
          <HelperText type="info" visible>
            Reading your receipt with AI…
          </HelperText>
        )}

        <SegmentedButtons
          value={type}
          onValueChange={v => setType(v as TransactionType)}
          buttons={[
            { value: 'DEBIT', label: 'Expense', icon: 'arrow-top-right' },
            { value: 'CREDIT', label: 'Income', icon: 'arrow-bottom-left' },
          ]}
          style={{ marginTop: 16 }}
        />

        <TextInput
          label="Merchant"
          mode="outlined"
          value={merchant}
          onChangeText={setMerchant}
          style={styles.input}
        />
        <TextInput
          label="Amount"
          mode="outlined"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={styles.input}
        />

        <Text variant="titleSmall" style={styles.label}>
          Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {CATEGORIES.map(c => {
            const selected = category === c;
            return (
              <Chip
                key={c}
                icon={CATEGORY_META[c].icon}
                selected={selected}
                onPress={() => setCategory(c)}
                mode={selected ? 'flat' : 'outlined'}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected
                      ? theme.colors.primaryContainer
                      : theme.colors.surface,
                    borderColor: selected
                      ? theme.colors.primary
                      : theme.colors.outline,
                    borderWidth: selected ? 1 : 1,
                  },
                ]}
                textStyle={{
                  color: selected
                    ? theme.colors.onPrimaryContainer
                    : theme.colors.onSurface,
                  fontWeight: selected ? '700' : '500',
                }}
              >
                {CATEGORY_META[c].label}
              </Chip>
            );
          })}
        </ScrollView>

        <TextInput
          label="Date (YYYY-MM-DD)"
          mode="outlined"
          value={date}
          onChangeText={setDate}
          style={styles.input}
        />
        <TextInput
          label="Note (optional)"
          mode="outlined"
          value={note}
          onChangeText={setNote}
          style={styles.input}
        />

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <Button
          mode="contained"
          onPress={save}
          loading={saving}
          disabled={saving || scanning}
          contentStyle={{ paddingVertical: 6 }}
        >
          {editing ? 'Save changes' : 'Save transaction'}
        </Button>

        {editing && (
          <Button
            mode="text"
            textColor={theme.colors.error}
            icon="delete-outline"
            onPress={remove}
            style={{ marginTop: 12 }}
          >
            Delete transaction
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  receipt: { height: 180, borderRadius: 16, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginTop: 8 },
  flex: { flex: 1 },
  label: { marginTop: 8, fontWeight: '600' },
  input: { marginTop: 12 },
  chip: { marginRight: 8, marginTop: 8 },
});
