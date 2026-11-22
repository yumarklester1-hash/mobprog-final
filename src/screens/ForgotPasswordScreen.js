import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, typography } from '../theme/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendResetLink = async () => {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (resetError) {
      setError(resetError.message || 'Unable to send a password reset email.');
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <TouchableOpacity
            style={styles.back}
            onPress={() => router.replace('/login')}
            accessibilityRole="button"
            accessibilityLabel="Back to sign in"
          >
            <Ionicons name="arrow-back" size={22} color={colors.secondary} />
          </TouchableOpacity>

          <View style={styles.icon}>
            <Ionicons name="mail-unread-outline" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>Reset your password</Text>
          <Text style={styles.subtitle}>
            {sent
              ? 'If an account exists for that email, Supabase will send a reset link.'
              : 'Enter your account email and we will send you a secure reset link.'}
          </Text>
          {!sent ? (
            <>
              <InputField
                label="Email"
                icon="mail-outline"
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <AppButton title="Send reset link" onPress={sendResetLink} loading={loading} />
            </>
          ) : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <TouchableOpacity style={styles.action} onPress={() => router.replace('/login')}>
            <Text style={styles.actionText}>Back to sign in</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  keyboardAvoidingView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  back: { marginBottom: spacing.lg },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, marginBottom: spacing.lg },
  title: { ...typography.h1, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.md },
  action: { marginTop: spacing.xl, alignSelf: 'flex-start' },
  error: { color: colors.danger, marginTop: spacing.sm },
  actionText: { ...typography.body, color: colors.primary, fontWeight: '700' },
});
