import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import BrandHeader from '../components/BrandHeader';
import InputField from '../components/InputField';
import AppButton from '../components/AppButton';
import { colors, spacing, typography } from '../theme/theme';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) next.email = 'Enter a valid email';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(email, password);
      if (!user) {
        setErrors({ credentials: 'Email or password is incorrect' });
        return;
      }
      router.replace(user.role === 'doctor' ? '/doctor' : '/home');
    } catch (error) {
      setErrors({ credentials: error.message || 'Unable to sign in. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <BrandHeader
            title="Welcome Back"
            subtitle="Sign in to manage your dental appointments"
          />

          <InputField
            label="Email"
            icon="mail-outline"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
            error={errors.email}
          />

          <InputField
            label="Password"
            icon="lock-closed-outline"
            placeholder="Enter your password"
            isPassword
            value={password}
            onChangeText={setPassword}
            error={errors.password}
          />

          {errors.credentials ? (
            <Text style={styles.errorText}>{errors.credentials}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.forgotWrapper}
            onPress={() => router.push('/forgot-password')}
          >
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <AppButton title="Log In" onPress={handleLogin} loading={loading} />

          <Text style={styles.doctorNote}>
            Doctor accounts are managed by the clinic.
          </Text>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Patient? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.footerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  forgotWrapper: {
    alignSelf: 'flex-end',
    marginBottom: spacing.lg,
  },
  forgotText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  doctorNote: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  footerText: {
    ...typography.body,
    color: colors.textMuted,
  },
  footerLink: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
});