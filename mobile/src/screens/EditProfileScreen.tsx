import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Avatar,
  Button,
  HelperText,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import SectionCard from '../components/SectionCard';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { changePassword, updateProfile } from '../store/slices/authSlice';

export default function EditProfileScreen() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const user = useAppSelector(s => s.auth.user);

  // Your details
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [emailPassword, setEmailPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const nameChanged = cleanName !== (user?.name ?? '');
  const emailChanged = cleanEmail !== (user?.email ?? '');

  const canSaveProfile =
    (nameChanged || emailChanged) &&
    cleanName.length > 0 &&
    cleanEmail.length > 0 &&
    (!emailChanged || emailPassword.length > 0) &&
    !savingProfile;

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileError(null);
    try {
      await dispatch(
        updateProfile({
          name: cleanName,
          email: cleanEmail,
          currentPassword: emailChanged ? emailPassword : undefined,
        }),
      ).unwrap();
      setEmailPassword('');
      Alert.alert('Profile updated', 'Your changes have been saved.');
    } catch (e) {
      setProfileError(
        typeof e === 'string' ? e : 'Could not update your profile',
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const passwordTooShort = newPassword.length > 0 && newPassword.length < 8;
  const passwordMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;
  const canChangePassword =
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    confirmPassword === newPassword &&
    !savingPassword;

  const savePassword = async () => {
    setSavingPassword(true);
    setPasswordError(null);
    try {
      await dispatch(changePassword({ currentPassword, newPassword })).unwrap();
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert(
        'Password changed',
        'Your other devices have been signed out.',
      );
    } catch (e) {
      setPasswordError(
        typeof e === 'string' ? e : 'Could not change your password',
      );
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.screen,
        { backgroundColor: theme.dark ? theme.colors.background : '#F7F6F1' },
      ]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.hero,
            { backgroundColor: theme.dark ? '#18372F' : '#123B30' },
          ]}
        >
          <Avatar.Text
            label={(cleanName || user?.name || '?').slice(0, 1).toUpperCase()}
            size={64}
            color={theme.dark ? '#18372F' : '#123B30'}
            style={{ backgroundColor: theme.dark ? '#9ADFC0' : '#BDE8D0' }}
          />
          <Text variant="titleLarge" style={styles.heroTitle}>
            Your account
          </Text>
          <Text variant="bodyMedium" style={styles.heroCopy}>
            Keep your contact details current and manage your sign-in password.
          </Text>
        </View>

        <SectionCard title="Your details">
          <Text
            variant="bodySmall"
            style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
          >
            These details identify your MoneySafe account.
          </Text>
          <TextInput
            label="Name"
            mode="outlined"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            maxLength={80}
          />
          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            style={styles.input}
          />

          {emailChanged && (
            <>
              <Text
                variant="bodySmall"
                style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
              >
                To change your email, confirm it is you with your current
                password.
              </Text>
              <TextInput
                label="Current password"
                mode="outlined"
                value={emailPassword}
                onChangeText={setEmailPassword}
                secureTextEntry
                autoComplete="password"
              />
            </>
          )}

          <HelperText type="error" visible={!!profileError}>
            {profileError}
          </HelperText>

          <Button
            mode="contained"
            onPress={saveProfile}
            loading={savingProfile}
            disabled={!canSaveProfile}
            contentStyle={styles.btn}
          >
            Save changes
          </Button>
        </SectionCard>

        <SectionCard title="Change password" style={styles.second}>
          <Text
            variant="bodySmall"
            style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
          >
            Choose a password with at least 8 characters.
          </Text>
          <TextInput
            label="Current password"
            mode="outlined"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={!showPasswords}
            autoComplete="password"
            right={
              <TextInput.Icon
                icon={showPasswords ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShowPasswords(s => !s)}
                forceTextInputFocus={false}
              />
            }
          />
          <TextInput
            label="New password"
            mode="outlined"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPasswords}
            autoComplete="new-password"
            style={styles.input}
          />
          <HelperText type={passwordTooShort ? 'error' : 'info'} visible>
            {passwordTooShort
              ? 'Password must be at least 8 characters'
              : 'At least 8 characters'}
          </HelperText>
          <TextInput
            label="Confirm new password"
            mode="outlined"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showPasswords}
            autoComplete="new-password"
          />
          <HelperText
            type="error"
            visible={passwordMismatch || !!passwordError}
          >
            {passwordError ?? 'Passwords do not match'}
          </HelperText>

          <Button
            mode="contained"
            onPress={savePassword}
            loading={savingPassword}
            disabled={!canChangePassword}
            contentStyle={styles.btn}
          >
            Change password
          </Button>
          <Text
            variant="bodySmall"
            style={[styles.note, { color: theme.colors.onSurfaceVariant }]}
          >
            Changing your password signs you out on all your other devices.
          </Text>
        </SectionCard>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    borderRadius: 26,
    padding: 24,
    marginBottom: 18,
  },
  heroTitle: { color: '#FFFFFF', fontWeight: '700', marginTop: 14 },
  heroCopy: {
    color: 'rgba(255,255,255,0.76)',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 21,
  },
  second: { marginTop: 16 },
  input: { marginTop: 12 },
  note: { marginBottom: 12, lineHeight: 20 },
  btn: { paddingVertical: 6 },
});
