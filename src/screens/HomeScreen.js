import React, { useCallback, useState } from 'react';
import { Image, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import { useAppointments } from '../context/AppointmentContext';
import { colors, radius, spacing, typography } from '../theme/theme';
import { clearCurrentUser, getCurrentUser } from '../components/authData';

export default function HomeScreen() {
  const router = useRouter();
  const { appointments } = useAppointments();
  const user = getCurrentUser();
  const [profilePhoto, setProfilePhoto] = useState(user?.profilePhoto || null);
  const firstName = user?.firstName || user?.name?.split(' ')[0];

  useFocusEffect(
    useCallback(() => {
      setProfilePhoto(getCurrentUser()?.profilePhoto || null);
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</Text>
            <Text style={styles.title}>Your care, made simple</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            {profilePhoto ? (
              <Image source={{ uri: profilePhoto }} style={styles.profilePhoto} />
            ) : (
              <Ionicons name="person-circle-outline" size={50} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.summary}>
          <View style={styles.summaryIcon}>
            <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryCount}>{appointments.length}</Text>
            <Text style={styles.summaryLabel}>
              {appointments.length === 1 ? 'appointment booked' : 'appointments booked'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.summaryLink}
            onPress={() => router.push('/appointments')}
            accessibilityRole="button"
          >
            <Text style={styles.summaryLinkText}>View</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <AppButton
          title="Book an appointment"
          icon={<Ionicons name="add" size={20} color={colors.white} />}
          onPress={() => router.push('/appointment-new')}
          style={styles.button}
        />
        <AppButton
          title="Log Out"
          variant="text"
          onPress={() => {
            clearCurrentUser();
            router.replace('/login');
          }}
          style={styles.logout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  profileButton: {
    padding: spacing.xs,
  },
  profilePhoto: {
    width: 50,
    height: 50,
    borderRadius: radius.pill,
  },
  greeting: {
    ...typography.caption,
    marginBottom: spacing.xs,
    color: colors.textMuted,
  },
  title: {
    ...typography.h1,
    fontSize: 24,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: radius.sm,
  },
  summaryText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  summaryCount: {
    ...typography.h2,
  },
  summaryLabel: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  summaryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm,
  },
  summaryLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  button: {
    width: '100%',
    marginTop: spacing.sm,
  },
  logout: {
    marginTop: spacing.xl,
  },
});