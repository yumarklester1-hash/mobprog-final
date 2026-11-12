import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '../theme/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
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
      <Text style={styles.title}>Password reset unavailable</Text>
      <Text style={styles.subtitle}>
        This local demo does not have an email service to verify your identity or send a reset link.
        No email has been sent.
      </Text>
      <TouchableOpacity style={styles.action} onPress={() => router.replace('/login')}>
        <Text style={styles.actionText}>Back to sign in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xl, backgroundColor: colors.background },
  back: { marginBottom: spacing.lg },
  icon: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, marginBottom: spacing.lg },
  title: { ...typography.h1, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted },
  action: { marginTop: spacing.xl, alignSelf: 'flex-start' },
  error: { color: colors.danger, marginTop: spacing.sm },
  actionText: { ...typography.body, color: colors.primary, fontWeight: '700' },
});
