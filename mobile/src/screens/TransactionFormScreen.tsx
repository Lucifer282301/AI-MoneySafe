import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
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
import CategoryIcon from '../components/CategoryIcon';
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

  const dark = theme.dark;
  const surface = dark ? '#1D2A23' : '#FFFEFA';
  const border = dark ? '#34483B' : '#E6E5DA';

  return (
    <KeyboardAvoidingView
      style={{
        flex: 1,
        backgroundColor: dark ? '#111B16' : '#F6F5EF',
      }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="titleLarge" style={styles.pageTitle}>
          {editing ? 'Update the details' : 'Make it count'}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}
        >
          {editing
            ? 'A quick edit keeps your money picture up to date.'
            : 'Add a purchase or income to keep your money picture clear.'}
        </Text>

        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Add from a receipt
          </Text>
          <Text
            variant="bodySmall"
            style={[
              styles.supportingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            We’ll fill in the details for you to review.
          </Text>
          {receiptUrl && (
            <Image
              source={{ uri: receiptUrl }}
              style={styles.receipt}
              resizeMode="cover"
              accessibilityLabel="Receipt image"
            />
          )}
          <View style={styles.row}>
            <Button
              mode="outlined"
              icon="camera"
              onPress={() => scan('camera')}
              disabled={scanning}
              style={styles.flex}
              contentStyle={styles.buttonContent}
              accessibilityLabel="Capture receipt with camera"
            >
              Camera
            </Button>
            <Button
              mode="outlined"
              icon="image"
              onPress={() => scan('gallery')}
              disabled={scanning}
              style={styles.flex}
              contentStyle={styles.buttonContent}
              accessibilityLabel="Choose a receipt from gallery"
            >
              Gallery
            </Button>
          </View>
          {scanning && (
            <HelperText type="info" visible>
              Reading your receipt with AI…
            </HelperText>
          )}
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Transaction details
          </Text>
          <SegmentedButtons
            value={type}
            onValueChange={v => setType(v as TransactionType)}
            buttons={[
              { value: 'DEBIT', label: 'Expense', icon: 'arrow-top-right' },
              { value: 'CREDIT', label: 'Income', icon: 'arrow-bottom-left' },
            ]}
            style={styles.segment}
          />
          <TextInput
            label="Merchant or source"
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
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <Text variant="titleSmall" style={styles.sectionTitle}>
            Choose a category
          </Text>
          <Text
            variant="bodySmall"
            style={[
              styles.supportingText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            This helps you understand where your money goes.
          </Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map(c => {
              const selected = category === c;
              return (
                <Pressable
                  key={c}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={CATEGORY_META[c].label}
                  onPress={() => setCategory(c)}
                  style={[
                    styles.categoryCard,
                    {
                      backgroundColor: selected
                        ? dark
                          ? '#2C4938'
                          : '#E7EFE5'
                        : surface,
                      borderColor: selected
                        ? dark
                          ? '#71977A'
                          : '#93B398'
                        : border,
                    },
                  ]}
                >
                  <CategoryIcon category={c} size={34} />
                  <Text
                    variant="labelSmall"
                    numberOfLines={1}
                    style={[
                      styles.categoryLabel,
                      selected && [
                        styles.selectedCategoryLabel,
                        { color: dark ? '#D7EBDD' : '#315F49' },
                      ],
                    ]}
                  >
                    {CATEGORY_META[c].label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: surface, borderColor: border },
          ]}
        >
          <Text variant="titleSmall" style={styles.sectionTitle}>
            A few more details
          </Text>
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
        </View>

        <HelperText type="error" visible={!!error}>
          {error}
        </HelperText>

        <Button
          mode="contained"
          onPress={save}
          loading={saving}
          disabled={saving || scanning}
          contentStyle={styles.saveContent}
          style={styles.saveButton}
          buttonColor={dark ? '#456B56' : '#315F49'}
          textColor="#FFFFFF"
          accessibilityLabel={
            editing ? 'Save transaction changes' : 'Save transaction'
          }
        >
          {editing ? 'Save changes' : 'Save transaction'}
        </Button>

        {editing && (
          <Button
            mode="text"
            textColor={theme.colors.error}
            icon="delete-outline"
            onPress={remove}
            style={styles.deleteButton}
          >
            Delete transaction
          </Button>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 40 },
  pageTitle: { fontWeight: '800' },
  intro: { marginTop: 4, marginBottom: 18 },
  card: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: { fontWeight: '700' },
  supportingText: { marginTop: 3, marginBottom: 10 },
  receipt: { height: 180, borderRadius: 16, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  flex: { flex: 1 },
  buttonContent: { minHeight: 46 },
  segment: { marginTop: 14 },
  input: { marginTop: 12 },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  categoryCard: {
    width: '31.5%',
    minHeight: 82,
    borderWidth: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  categoryLabel: { marginTop: 5, fontWeight: '500' },
  selectedCategoryLabel: { color: '#315F49', fontWeight: '700' },
  saveContent: { minHeight: 52 },
  saveButton: { borderRadius: 16 },
  deleteButton: { marginTop: 8 },
});
