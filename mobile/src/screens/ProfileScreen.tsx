import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, View } from 'react-native';
import {
  CameraOptions,
  launchCamera,
  launchImageLibrary,
  MediaType,
} from 'react-native-image-picker';
import {
  Avatar,
  Button,
  Dialog,
  HelperText,
  List,
  Portal,
  RadioButton,
  SegmentedButtons,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import Screen from '../components/Screen';
import { api, getErrorMessage } from '../api/client';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  deleteAccount,
  logout,
  updateProfile,
  updateCurrency,
} from '../store/slices/authSlice';
import { setThemeMode, ThemeMode } from '../store/slices/settingsSlice';

const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (AED)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
];

export default function ProfileScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);
  const mode = useAppSelector(s => s.settings.mode);

  const [exporting, setExporting] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState(user?.name ?? '');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? '');
  const [profileImage, setProfileImage] = useState<string | null>(
    user?.avatarUrl ?? null,
  );
  const [profileImageBase64, setProfileImageBase64] = useState<string | null>(
    null,
  );
  const [profileMimeType, setProfileMimeType] = useState<string>('image/jpeg');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (profileOpen) {
      setProfileName(user?.name ?? '');
      setProfileEmail(user?.email ?? '');
      setProfileImage(user?.avatarUrl ?? null);
      setProfileImageBase64(null);
      setProfileError(null);
    }
  }, [profileOpen, user]);

  const pickProfilePhoto = async (source: 'camera' | 'gallery') => {
    const options: CameraOptions = {
      mediaType: 'photo' as MediaType,
      includeBase64: true,
      quality: 0.8,
      maxWidth: 1200,
      maxHeight: 1200,
    };

    const response =
      source === 'camera'
        ? await launchCamera(options)
        : await launchImageLibrary(options);

    if (response.didCancel) return;
    if (response.errorCode) {
      Alert.alert(
        'Image error',
        response.errorMessage ?? 'Could not load the image',
      );
      return;
    }

    const asset = response.assets?.[0];
    if (!asset?.base64) {
      Alert.alert('Image error', 'Could not read the selected photo');
      return;
    }

    setProfileMimeType(asset.type ?? 'image/jpeg');
    setProfileImageBase64(asset.base64);
    setProfileImage(
      `data:${asset.type ?? 'image/jpeg'};base64,${asset.base64}`,
    );
  };

  const saveProfile = async () => {
    const trimmedName = profileName.trim();
    const trimmedEmail = profileEmail.trim().toLowerCase();

    if (!trimmedName) {
      setProfileError('Name is required');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setProfileError('Enter a valid email address');
      return;
    }

    setProfileSaving(true);
    setProfileError(null);

    try {
      const payload: {
        name?: string;
        email?: string;
        avatarUrl?: string | null;
        avatarBase64?: string;
        avatarMimeType?: string;
      } = {
        name: trimmedName,
        email: trimmedEmail,
      };

      if (profileImageBase64) {
        payload.avatarBase64 = profileImageBase64;
        payload.avatarMimeType = profileMimeType;
      } else if (profileImage === null && user?.avatarUrl) {
        payload.avatarUrl = null;
      }

      const result = await dispatch(updateProfile(payload));
      if (updateProfile.rejected.match(result)) {
        setProfileError(result.payload ?? 'Could not update the profile');
        return;
      }

      setProfileOpen(false);
    } finally {
      setProfileSaving(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const { data } = await api.get<string>('/transactions/export', {
        responseType: 'text',
      });
      await Share.share({
        title: 'transactions.csv',
        message: data,
      });
    } catch (e) {
      Alert.alert('Export failed', getErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: () => dispatch(logout()),
      },
    ]);

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    const result = await dispatch(deleteAccount(password));
    setDeleting(false);
    if (deleteAccount.rejected.match(result)) {
      setDeleteError(result.payload ?? 'Could not delete the account');
    }
  };

  return (
    <Screen title="Profile">
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.header}>
          {user?.avatarUrl ? (
            <Avatar.Image size={72} source={{ uri: user.avatarUrl }} />
          ) : (
            <Avatar.Text
              label={(user?.name ?? '?').slice(0, 1).toUpperCase()}
              size={72}
            />
          )}
          <Text variant="titleLarge" style={styles.name}>
            {user?.name}
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {user?.email}
          </Text>
        </View>

        <List.Section title="Appearance">
          <View style={styles.padded}>
            <SegmentedButtons
              value={mode}
              onValueChange={v => dispatch(setThemeMode(v as ThemeMode))}
              buttons={[
                { value: 'system', label: 'System', icon: 'cellphone' },
                { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
                { value: 'dark', label: 'Dark', icon: 'weather-night' },
              ]}
            />
          </View>
        </List.Section>

        <List.Section title="Preferences">
          <List.Item
            title="Edit profile"
            description="Update your name, email and photo"
            left={p => <List.Icon {...p} icon="account-edit-outline" />}
            onPress={() => setProfileOpen(true)}
          />
          <List.Item
            title="Currency"
            description={user?.currency}
            left={p => <List.Icon {...p} icon="cash" />}
            onPress={() => setCurrencyOpen(true)}
          />
          <List.Item
            title="Export transactions (CSV)"
            description="Share or save all your data"
            left={p => <List.Icon {...p} icon="file-export-outline" />}
            onPress={exportCsv}
            disabled={exporting}
          />
        </List.Section>

        <List.Section title="Account">
          <List.Item
            title="Log out"
            left={p => <List.Icon {...p} icon="logout" />}
            onPress={confirmLogout}
          />
          <List.Item
            title="Delete account"
            description="Permanently remove your account and data"
            titleStyle={{ color: theme.colors.error }}
            left={p => (
              <List.Icon
                {...p}
                icon="delete-forever-outline"
                color={theme.colors.error}
              />
            )}
            onPress={() => setDeleteOpen(true)}
          />
        </List.Section>
      </ScrollView>

      <Portal>
        <Dialog visible={currencyOpen} onDismiss={() => setCurrencyOpen(false)}>
          <Dialog.Title>Currency</Dialog.Title>
          <Dialog.ScrollArea style={{ maxHeight: 320 }}>
            <ScrollView>
              <RadioButton.Group
                value={user?.currency ?? 'INR'}
                onValueChange={code => {
                  dispatch(updateCurrency(code));
                  setCurrencyOpen(false);
                }}
              >
                {CURRENCIES.map(c => (
                  <RadioButton.Item
                    key={c.code}
                    label={c.label}
                    value={c.code}
                  />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Content>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}
            >
              This changes how amounts are shown. Existing amounts are not
              converted.
            </Text>
          </Dialog.Content>
        </Dialog>

        <Dialog
          visible={profileOpen}
          onDismiss={() => !profileSaving && setProfileOpen(false)}
        >
          <Dialog.Title>Edit profile</Dialog.Title>
          <Dialog.Content>
            <View style={styles.profilePictureRow}>
              {profileImage ? (
                <Avatar.Image size={72} source={{ uri: profileImage }} />
              ) : (
                <Avatar.Text
                  label={(profileName || '?').slice(0, 1).toUpperCase()}
                  size={72}
                />
              )}
              <View style={styles.profileActions}>
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={() => pickProfilePhoto('camera')}
                  compact
                >
                  Camera
                </Button>
                <Button
                  mode="outlined"
                  icon="image"
                  onPress={() => pickProfilePhoto('gallery')}
                  compact
                >
                  Gallery
                </Button>
              </View>
            </View>
            {profileImage && (
              <Button
                mode="text"
                compact
                onPress={() => {
                  setProfileImage(null);
                  setProfileImageBase64(null);
                }}
                style={{ alignSelf: 'flex-start', marginTop: 8 }}
              >
                Remove photo
              </Button>
            )}

            <TextInput
              label="Name"
              mode="outlined"
              value={profileName}
              onChangeText={setProfileName}
              style={{ marginTop: 16 }}
            />
            <TextInput
              label="Email"
              mode="outlined"
              value={profileEmail}
              onChangeText={setProfileEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={{ marginTop: 12 }}
            />

            {profileError && (
              <HelperText type="error" visible>
                {profileError}
              </HelperText>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => setProfileOpen(false)}
              disabled={profileSaving}
            >
              Cancel
            </Button>
            <Button
              onPress={saveProfile}
              loading={profileSaving}
              disabled={profileSaving}
            >
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={deleteOpen}
          onDismiss={() => !deleting && setDeleteOpen(false)}
        >
          <Dialog.Title>Delete account?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This permanently deletes your account, transactions, budgets and
              receipts. It cannot be undone. Enter your password to confirm.
            </Text>
            <TextInput
              label="Password"
              mode="outlined"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={{ marginTop: 12 }}
            />
            <HelperText type="error" visible={!!deleteError}>
              {deleteError}
            </HelperText>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              textColor={theme.colors.error}
              onPress={confirmDelete}
              loading={deleting}
              disabled={!password || deleting}
            >
              Delete forever
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', paddingVertical: 24 },
  name: { marginTop: 12, fontWeight: '700' },
  padded: { paddingHorizontal: 20 },
  profilePictureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileActions: {
    flex: 1,
    gap: 8,
  },
});
