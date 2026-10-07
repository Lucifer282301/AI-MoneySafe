import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, HelperText, TextInput, useTheme } from 'react-native-paper';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { clearError, login } from '../store/slices/authSlice';
import type { AuthStackParamList } from '../navigation/types';
import AuthHeader from '../components/AuthHeader';
import { APP_NAME } from '../config/brand';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector(s => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;
  const submit = () =>
    dispatch(login({ email: email.trim().toLowerCase(), password }));

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
            title={APP_NAME}
            subtitle="Sign in to track your spending"
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
            autoComplete="password"
            onSubmitEditing={() => canSubmit && submit()}
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

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={submit}
            loading={loading}
            disabled={!canSubmit}
            contentStyle={styles.btn}
          >
            Sign in
          </Button>
          <Button
            onPress={() => navigation.navigate('Signup')}
            style={{ marginTop: 8 }}
          >
            New here? Create an account
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { alignSelf: 'center', marginBottom: 12 },
  title: { textAlign: 'center', fontWeight: '700' },
  subtitle: { textAlign: 'center', marginBottom: 28 },
  input: { marginBottom: 12 },
  btn: { paddingVertical: 6 },
});
