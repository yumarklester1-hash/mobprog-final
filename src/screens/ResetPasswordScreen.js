import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import ThemeModeToggle from '../components/ThemeModeToggle';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../lib/supabase';
import { spacing } from '../theme/theme';

function getRecoveryTokens(url) {
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const params = new URLSearchParams(fragment);
  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    type: params.get('type'),
  };
}

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const handledLink = useRef(false);
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const acceptRecoveryLink = async (url) => {
      if (handledLink.current) return;
      const { accessToken, refreshToken, type } = getRecoveryTokens(url);
      if (!accessToken || !refreshToken || type !== 'recovery') return;
      handledLink.current = true;
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) setError(sessionError.message);
      else {
        setError('');
        setReady(true);
      }
    };

    Linking.getInitialURL().then((url) => {
      if (url) return acceptRecoveryLink(url);
      setError('Open this screen from the password reset link in your email.');
      return undefined;
    }).catch((linkError) => {
      setError(linkError.message || 'Unable to open the password reset link.');
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      acceptRecoveryLink(url).catch((linkError) => {
        setError(linkError.message || 'Unable to validate the password reset link.');
      });
    });
    return () => subscription.remove();
  }, []);

  const savePassword = async () => {
    if (password.length < 6) {
      setError('Use at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { error: passwordError } = await supabase.auth.updateUser({ password });
      if (passwordError) throw passwordError;
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;
      router.replace('/login');
    } catch (saveError) {
      setError(saveError.message || 'Unable to update your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <ThemeModeToggle />
          <Text style={styles.title}>Choose a new password</Text>
          <Text style={styles.subtitle}>Enter your new password to secure your account.</Text>
          {ready ? (
            <>
              <InputField
                label="New password"
                icon="lock-closed-outline"
                placeholder="At least 6 characters"
                isPassword
                value={password}
                onChangeText={setPassword}
              />
              <InputField
                label="Confirm password"
                icon="lock-closed-outline"
                placeholder="Re-enter your password"
                isPassword
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <AppButton title="Update password" onPress={savePassword} loading={loading} />
            </>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoidingView: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  title: { ...typography.h1, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.lg },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  });
}
