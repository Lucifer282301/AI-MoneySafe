import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  Button,
  HelperText,
  Icon,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearError, signup } from '../store/slices/authSlice';

import type { AuthStackParamList } from '../navigation/types';
import { APP_NAME } from '../config/brand';
import BrandGlyph from '../components/BrandGlyph';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

// FIX 1: Validate email format
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen({ navigation }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();

  const { loading, error } = useAppSelector(state => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // FIX 2: Track local validation messages
  const [validationError, setValidationError] = useState('');

  // FIX 3: Prevent duplicate signup requests
  const submittingRef = useRef(false);

  const colors = {
    background: theme.dark ? theme.colors.background : '#F5F5F0',
    ink: theme.colors.onSurface,
    muted: theme.colors.onSurfaceVariant,
    field: theme.colors.surface,
    border: theme.colors.outlineVariant,
    hero: theme.dark ? '#18372F' : '#102A24',
    accent: theme.dark ? '#9ADFC0' : '#B9E3CF',
  };

  // FIX 4: Clear stale authentication errors
  useEffect(() => {
    dispatch(clearError());

    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);

  const emailInvalid = email.trim().length > 0 && !isEmailValid;

  const tooShort = password.length > 0 && password.length < 8;

  const tooLong = password.length > 72;

  // FIX 5: Validate all fields before enabling signup
  const canSubmit =
    normalizedName.length > 0 &&
    normalizedEmail.length > 0 &&
    isEmailValid &&
    password.length >= 8 &&
    password.length <= 72 &&
    !loading;

  // FIX 6: Clear errors when the user edits fields
  const handleNameChange = (value: string) => {
    setName(value.slice(0, 80));
    setValidationError('');

    if (error) {
      dispatch(clearError());
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setValidationError('');

    if (error) {
      dispatch(clearError());
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setValidationError('');

    if (error) {
      dispatch(clearError());
    }
  };

  // FIX 7: Safe async signup submission
  const submit = async () => {
    if (loading || submittingRef.current) {
      return;
    }

    if (!normalizedName) {
      setValidationError('Please enter your name.');
      return;
    }

    if (!normalizedEmail) {
      setValidationError('Please enter your email address.');
      return;
    }

    if (!isEmailValid) {
      setValidationError('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setValidationError('Password must be at least 8 characters.');
      return;
    }

    if (password.length > 72) {
      setValidationError('Password must be 72 characters or fewer.');
      return;
    }

    submittingRef.current = true;
    setValidationError('');
    dispatch(clearError());

    Keyboard.dismiss();

    try {
      await dispatch(
        signup({
          name: normalizedName,
          email: normalizedEmail,
          password,
        }),
      ).unwrap();

      // Keep successful-authentication navigation in your
      // existing auth flow, if it is already handled there.
    } catch {
      // The authSlice rejected handler should store the API error.
    } finally {
      submittingRef.current = false;
    }
  };

  // FIX 8: Combine local and API errors
  const displayedError = validationError || error;

  const passwordHelperMessage = displayedError
    ? displayedError
    : tooLong
    ? 'Password must be 72 characters or fewer.'
    : tooShort
    ? 'Password must be at least 8 characters.'
    : 'Use 8–72 characters.';

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* BRAND HEADER */}

            <View style={styles.brandBar}>
              <View style={styles.brand}>
                <View
                  style={[styles.brandMark, { backgroundColor: colors.hero }]}
                >
                  <BrandGlyph size={20} color={colors.accent} strokeWidth={7} />
                </View>

                <Text
                  variant="titleSmall"
                  style={[styles.brandName, { color: colors.ink }]}
                >
                  {APP_NAME}
                </Text>
              </View>

              <Icon source="lock-outline" size={17} color={colors.muted} />
            </View>

            {/* HEADING */}

            <View style={styles.heading}>
              <Text
                variant="labelSmall"
                style={[styles.eyebrow, { color: colors.muted }]}
              >
                A CLEARER START
              </Text>

              <Text
                variant="headlineSmall"
                style={[styles.title, { color: colors.ink }]}
              >
                Make room for your plans.
              </Text>

              <Text
                variant="bodySmall"
                style={[styles.subtitle, { color: colors.muted }]}
              >
                Create your {APP_NAME} account.
              </Text>
            </View>

            {/* PROMISE CARD */}

            <View
              style={[styles.promiseCard, { backgroundColor: colors.hero }]}
            >
              <Icon source="creation" size={28} color={colors.accent} />

              <View style={styles.promiseCopy}>
                <Text variant="bodySmall" style={styles.promiseLine}>
                  Small steps today.
                </Text>

                <Text variant="bodySmall" style={styles.promiseLine}>
                  More confidence tomorrow.
                </Text>
              </View>
            </View>

            {/* SIGNUP FORM */}

            <View style={styles.form}>
              {/* NAME */}

              <AuthLabel label="Name" color={colors.ink} />

              <TextInput
                mode="outlined"
                accessibilityLabel="Name"
                placeholder="Enter your full name"
                placeholderTextColor={colors.muted}
                value={name}
                onChangeText={handleNameChange}
                autoCapitalize="words"
                autoCorrect={false}
                autoComplete="name"
                textContentType="name"
                outlineStyle={[
                  styles.fieldOutline,
                  { borderColor: colors.border },
                ]}
                style={[styles.input, { backgroundColor: colors.field }]}
                textColor={colors.ink}
                dense
              />

              <Text
                variant="labelSmall"
                style={[styles.hint, { color: colors.muted }]}
              >
                How you’d like us to greet you · up to 80 characters
              </Text>

              {/* EMAIL */}

              <AuthLabel label="Email address" color={colors.ink} />

              <TextInput
                mode="outlined"
                accessibilityLabel="Email address"
                placeholder="Enter your email address"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={handleEmailChange}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                keyboardType="email-address"
                returnKeyType="next"
                error={emailInvalid}
                outlineStyle={[
                  styles.fieldOutline,
                  {
                    borderColor: emailInvalid
                      ? theme.colors.error
                      : colors.border,
                  },
                ]}
                style={[styles.input, { backgroundColor: colors.field }]}
                textColor={colors.ink}
                dense
              />

              {/* FIX 9: Show email-specific validation */}
              <HelperText
                type="error"
                visible={emailInvalid}
                style={styles.fieldError}
              >
                Please enter a valid email address.
              </HelperText>

              {/* PASSWORD */}

              <AuthLabel label="Password" color={colors.ink} />

              <TextInput
                mode="outlined"
                accessibilityLabel="Password"
                placeholder="Create a password"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoComplete="new-password"
                textContentType="newPassword"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={() => {
                  void submit();
                }}
                error={!!displayedError || tooShort || tooLong}
                outlineStyle={[
                  styles.fieldOutline,
                  {
                    borderColor:
                      displayedError || tooShort || tooLong
                        ? theme.colors.error
                        : colors.border,
                  },
                ]}
                style={[styles.input, { backgroundColor: colors.field }]}
                textColor={colors.ink}
                // FIX 10: Use an icon for password visibility
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => {
                      setShowPassword(previous => !previous);
                    }}
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    forceTextInputFocus={false}
                    color={colors.muted}
                  />
                }
                dense
              />

              {/* FIX 11: Preserve password guidance and errors */}
              <HelperText
                type={displayedError || tooShort || tooLong ? 'error' : 'info'}
                visible
                style={styles.helper}
              >
                {passwordHelperMessage}
              </HelperText>

              {/* TERMS AND PRIVACY */}

              <Text
                variant="labelSmall"
                style={[styles.terms, { color: colors.muted }]}
              >
                By creating an account, you agree to our{' '}
                <Text
                  style={[styles.termsLink, { color: theme.colors.secondary }]}
                >
                  Terms of service
                </Text>{' '}
                and{' '}
                <Text
                  style={[styles.termsLink, { color: theme.colors.secondary }]}
                >
                  Privacy policy
                </Text>
                .
              </Text>

              {/* CREATE ACCOUNT BUTTON */}

              <Button
                mode="contained"
                onPress={() => {
                  void submit();
                }}
                loading={loading}
                disabled={!canSubmit}
                icon="arrow-right"
                buttonColor={colors.hero}
                textColor="#FFFFFF"
                contentStyle={styles.primaryContent}
                style={styles.primaryButton}
                labelStyle={styles.primaryLabel}
                accessibilityLabel="Create your MoneySafe account"
              >
                Create account
              </Button>
            </View>

            {/* LOGIN NAVIGATION */}

            <View style={styles.switchAccount}>
              <Text variant="bodySmall" style={{ color: colors.muted }}>
                Already have an account?{' '}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Log in to your account"
                onPress={() => {
                  dispatch(clearError());
                  navigation.navigate('Login');
                }}
                hitSlop={8}
              >
                <Text
                  variant="labelMedium"
                  style={{
                    color: theme.colors.secondary,
                    fontWeight: '700',
                  }}
                >
                  Log In
                </Text>
              </Pressable>
            </View>

            {/* FOOTER */}

            <Text
              variant="labelSmall"
              style={[styles.footer, { color: colors.muted }]}
            >
              Built for a little more clarity, every day.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// CHANGED: Left-aligned, slightly bolder field labels
function AuthLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text variant="labelMedium" style={[styles.fieldLabel, { color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },

  keyboard: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 24,
  },

  content: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    flexGrow: 1,
  },

  brandBar: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  brand: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandName: {
    marginLeft: 8,
    fontWeight: '600',
  },

  heading: {
    marginTop: 23,
    marginBottom: 16,
  },

  eyebrow: {
    fontSize: 9,
    letterSpacing: 0.7,
    fontWeight: '700',
  },

  title: {
    fontWeight: '700',
    marginTop: 6,
  },

  subtitle: {
    marginTop: 5,
  },

  promiseCard: {
    minHeight: 70,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 17,
  },

  promiseCopy: {
    marginLeft: 14,
  },

  promiseLine: {
    color: '#FFFFFF',
    lineHeight: 19,
  },

  form: {
    width: '100%',
  },

  // CHANGED: Slightly larger and bolder labels
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
    marginTop: 4,
    textAlign: 'left',
  },

  input: {
    height: 46,
    marginBottom: 3,
    fontSize: 13,
  },

  fieldOutline: {
    borderRadius: 12,
    borderWidth: 1,
  },

  hint: {
    fontSize: 9,
    marginBottom: 10,
    marginTop: 1,
  },

  fieldError: {
    marginTop: -2,
    marginBottom: 4,
    paddingHorizontal: 0,
  },

  helper: {
    marginTop: -1,
    marginBottom: 1,
    paddingHorizontal: 0,
  },

  terms: {
    fontSize: 10,
    lineHeight: 16,
    marginTop: 2,
    marginBottom: 14,
  },

  termsLink: {
    fontWeight: '700',
  },

  primaryButton: {
    borderRadius: 12,
  },

  primaryContent: {
    minHeight: 46,
    flexDirection: 'row-reverse',
  },

  primaryLabel: {
    fontWeight: '800',
    fontSize: 13,
  },

  switchAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 13,
  },

  footer: {
    textAlign: 'center',
    marginTop: 17,
    fontSize: 9,
  },
});
