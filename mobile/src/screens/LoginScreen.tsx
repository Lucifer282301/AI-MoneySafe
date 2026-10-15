import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  TextInput as RNTextInput,
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
import { clearError, login } from '../store/slices/authSlice';
import type { AuthStackParamList } from '../navigation/types';
import { APP_NAME } from '../config/brand';
import BrandGlyph from '../components/BrandGlyph';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

// FIX 1: Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(s => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // FIX 2: Local validation errors
  const [validationError, setValidationError] = useState('');

  // FIX 3: Password input reference
  // const passwordRef = useRef<RNTextInput>(null);

  // FIX 4: Prevent rapid duplicate submissions
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

  // Clear previous authentication errors on mount
  useEffect(() => {
    dispatch(clearError());

    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // FIX 5: Clear errors when editing email
  const handleEmailChange = (value: string) => {
    setEmail(value);
    setValidationError('');

    if (error) {
      dispatch(clearError());
    }
  };

  // FIX 6: Clear errors when editing password
  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setValidationError('');

    if (error) {
      dispatch(clearError());
    }
  };

  const normalizedEmail = email.trim().toLowerCase();

  // FIX 7: Validate before enabling the button
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail);

  const canSubmit = isEmailValid && password.length > 0 && !loading;

  // FIX 8: Safe async login submission
  const submit = async () => {
    if (loading || submittingRef.current) {
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

    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    submittingRef.current = true;

    setValidationError('');
    dispatch(clearError());

    Keyboard.dismiss();

    try {
      await dispatch(
        login({
          email: normalizedEmail,
          password,
        }),
      ).unwrap();

      // Navigation should be handled by the auth state listener.
    } catch {
      // The authSlice rejected handler should store the API error.
      // Avoid duplicating the error in local state.
    } finally {
      submittingRef.current = false;
    }
  };

  const displayedError = validationError || error;

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboard}
        // FIX 9: Improved keyboard handling
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
                YOUR MONEY, WITH CLARITY
              </Text>

              <Text
                variant="headlineSmall"
                style={[styles.title, { color: colors.ink }]}
              >
                Welcome back.
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.subtitle, { color: colors.muted }]}
              >
                Sign in to pick up where you left off.
              </Text>
            </View>

            {/* FEATURE CARD */}
            <View
              style={[styles.featureCard, { backgroundColor: colors.hero }]}
            >
              <View style={styles.featureIcon}>
                <BrandGlyph size={20} color={colors.accent} strokeWidth={7} />
              </View>
              <Text variant="headlineSmall" style={styles.featureTitle}>
                A calmer view of{'\n'}your money.
              </Text>
              <Text
                variant="bodySmall"
                style={[styles.featureSubtitle, { color: colors.accent }]}
              >
                Your spending, plans and next steps. Together.
              </Text>
            </View>

            {/* LOGIN FORM */}
            <View style={styles.form}>
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
                // FIX: No ref dependency
                returnKeyType="done"
                error={!!validationError && !isEmailValid}
                outlineStyle={[
                  styles.fieldOutline,
                  { borderColor: colors.border },
                ]}
                style={[styles.input, { backgroundColor: colors.field }]}
                textColor={colors.ink}
                dense
              />

              {/* PASSWORD */}
              <AuthLabel label="Password" color={colors.ink} />
              <TextInput
                // FIX: Removed ref={passwordRef}
                mode="outlined"
                accessibilityLabel="Password"
                placeholder="Enter your password" // ADDED
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={handlePasswordChange}
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="go"
                onSubmitEditing={() => {
                  void submit();
                }}
                error={!!displayedError && !validationError}
                outlineStyle={[
                  styles.fieldOutline,
                  { borderColor: colors.border },
                ]}
                style={[styles.input, { backgroundColor: colors.field }]}
                textColor={colors.ink}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword(prev => !prev)}
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    forceTextInputFocus={false}
                    color={colors.muted}
                  />
                }
                dense
              />

              {/* ERROR MESSAGE */}
              {!!displayedError && (
                <HelperText type="error" visible style={styles.error}>
                  {displayedError}
                </HelperText>
              )}

              {/* SIGN IN BUTTON */}
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
                accessibilityLabel="Log in to your account"
              >
                Log In
              </Button>
            </View>

            {/* CREATE ACCOUNT */}
            <View style={styles.switchAccount}>
              <Text variant="bodySmall" style={{ color: colors.muted }}>
                New to {APP_NAME}?{' '}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create a new account"
                onPress={() => {
                  dispatch(clearError());
                  navigation.navigate('Signup');
                }}
                hitSlop={8}
              >
                <Text
                  variant="labelMedium"
                  style={{ color: theme.colors.secondary, fontWeight: '700' }}
                >
                  Create account
                </Text>
              </Pressable>
            </View>

            {/* TRUST CARD */}
            <View
              style={[
                styles.trustCard,
                { backgroundColor: colors.field, borderColor: colors.border },
              ]}
            >
              <Icon source="lock-outline" size={16} color={colors.muted} />
              <Text
                variant="bodySmall"
                style={[styles.trustCopy, { color: colors.muted }]}
              >
                Your account stays yours. Nothing moves without your approval.
              </Text>
            </View>

            {/* FOOTER */}
            <Text
              variant="labelSmall"
              style={[styles.legalFooter, { color: colors.muted }]}
            >
              Privacy policy · Terms of service
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reusable form label
function AuthLabel({
  label,
  color,
  centered = false,
}: {
  label: string;
  color: string;
  centered?: boolean;
}) {
  return (
    <Text
      variant="labelMedium"
      style={[styles.fieldLabel, centered && styles.centeredLabel, { color }]}
    >
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
    fontWeight: '700',
  },
  heading: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 18,
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
    textAlign: 'center',
  },
  featureCard: {
    minHeight: 148,
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  featureIcon: {
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  featureTitle: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 28,
  },
  featureSubtitle: {
    fontSize: 13,
    marginTop: 9,
    textAlign: 'center',
  },
  form: {
    width: '100%',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 5,
    marginTop: 2,
  },
  centeredLabel: {
    textAlign: 'center',
  },
  input: {
    height: 46,
    marginBottom: 12,
    fontSize: 13,
  },
  fieldOutline: {
    borderRadius: 12,
    borderWidth: 1,
  },
  error: {
    marginTop: -5,
    marginBottom: 8,
    paddingHorizontal: 0,
  },
  primaryButton: {
    borderRadius: 12,
    marginTop: 2,
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
  trustCard: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    marginTop: 17,
  },
  trustCopy: {
    flex: 1,
    marginLeft: 10,
    lineHeight: 17,
    fontSize: 10,
  },
  legalFooter: {
    textAlign: 'center',
    marginTop: 17,
    fontSize: 9,
  },
});
