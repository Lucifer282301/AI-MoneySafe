import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Button,
  HelperText,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearError, signup } from '../store/slices/authSlice';
import type { AuthStackParamList } from '../navigation/types';
import AuthHeader from '../components/AuthHeader';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(s => s.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const tooShort = password.length > 0 && password.length < 8;
  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    password.length >= 8 &&
    !loading;

  const submit = () =>
    dispatch(
      signup({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      }),
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <AuthHeader
            title="Create account"
            subtitle="Start tracking in under a minute"
          />

          <TextInput
            label="Name"
            mode="outlined"
            value={name}
            onChangeText={setName}
            autoComplete="name"
            left={<TextInput.Icon icon="account-outline" />}
            style={styles.input}
          />
          <TextInput
            label="Email"
            mode="outlined"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            left={<TextInput.Icon icon="email-outline" />}
            style={styles.input}
          />
          <TextInput
            label="Password"
            mode="outlined"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoComplete="new-password"
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={show ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShow(s => !s)}
                forceTextInputFocus={false}
              />
            }
            style={styles.input}
          />
          <HelperText type={tooShort || error ? 'error' : 'info'} visible>
            {error ??
              (tooShort
                ? 'Password must be at least 8 characters'
                : 'At least 8 characters')}
          </HelperText>

          <Button
            mode="contained"
            onPress={submit}
            loading={loading}
            disabled={!canSubmit}
            contentStyle={styles.btn}
          >
            Sign up
          </Button>
          <Button
            onPress={() => navigation.navigate('Login')}
            style={{ marginTop: 8 }}
          >
            Already have an account? Sign in
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  title: { textAlign: 'center', fontWeight: '700' },
  subtitle: { textAlign: 'center', marginBottom: 28 },
  input: { marginBottom: 12 },
  btn: { paddingVertical: 6 },
});
