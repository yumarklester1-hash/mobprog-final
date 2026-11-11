import React, { useEffect } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import { clearCurrentUser, getCurrentUser } from '../components/authData';
import { useAppointments } from '../context/AppointmentContext';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function DoctorDashboardScreen() {
  const router = useRouter();
  const { appointments, updateAppointmentStatus } = useAppointments();
  const isDoctor = getCurrentUser()?.role === 'doctor';
  const completedCount = appointments.filter((item) => item.status === 'Completed').length;
  const pendingCount = appointments.length - completedCount;

  useEffect(() => {
    if (!isDoctor) router.replace('/login');
  }, [isDoctor, router]);

  const handleLogout = () => {
    clearCurrentUser();
    router.replace('/login');
  };

  if (!isDoctor) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={appointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, appointments.length === 0 && styles.emptyContent]}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <View style={styles.headerIcon}>
                <Ionicons name="medical" size={24} color={colors.primary} />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.greeting}>Doctor workspace</Text>
                <Text style={styles.title}>Appointments</Text>
              </View>
              <TouchableOpacity
                onPress={handleLogout}
                accessibilityRole="button"
                accessibilityLabel="Log out"
                style={styles.logoutButton}
              >
                <Ionicons name="log-out-outline" size={23} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            <View style={styles.summary}>
              <SummaryItem label="Total visits" value={appointments.length} />
              <View style={styles.summaryDivider} />
              <SummaryItem label="To review" value={pendingCount} />
              <View style={styles.summaryDivider} />
              <SummaryItem label="Completed" value={completedCount} />
            </View>
            <Text style={styles.sectionTitle}>Patient schedule</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCompleted = item.status === 'Completed';
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.patientIcon}>
                  <Ionicons name="person-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.cardHeading}>
                  <Text style={styles.patientName}>{item.patientName || 'Patient'}</Text>
                  <Text style={styles.service}>{item.service}</Text>
                </View>
                <Text style={[styles.status, isCompleted && styles.completedStatus]}>
                  {isCompleted ? 'Completed' : 'Confirmed'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={17} color={colors.textMuted} />
                <Text style={styles.detailText}>{item.date} at {item.time}</Text>
              </View>
              {item.notes ? (
                <View style={styles.note}>
                  <Text style={styles.noteLabel}>Patient notes</Text>
                  <Text style={styles.noteText}>{item.notes}</Text>
                </View>
              ) : null}
              {!isCompleted ? (
                <AppButton
                  title="Mark as completed"
                  icon={<Ionicons name="checkmark" size={19} color={colors.white} />}
                  onPress={() => updateAppointmentStatus(item.id, 'Completed')}
                  style={styles.completeButton}
                />
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={46} color={colors.primary} />
            <Text style={styles.emptyTitle}>No appointments yet</Text>
            <Text style={styles.emptyText}>Patient bookings will appear here.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function SummaryItem({ label, value }) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  emptyContent: { flexGrow: 1 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  headerIcon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  headerText: { flex: 1, marginLeft: spacing.md },
  greeting: { ...typography.caption },
  title: { ...typography.h1, fontSize: 24, marginTop: 2 },
  logoutButton: { padding: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: spacing.md, marginBottom: spacing.xl },
  summaryItem: { alignItems: 'center', flex: 1 },
  summaryValue: { ...typography.h2, color: colors.primaryDark },
  summaryLabel: { ...typography.caption, fontSize: 11, marginTop: spacing.xs },
  summaryDivider: { width: 1, height: 34, backgroundColor: colors.border },
  sectionTitle: { ...typography.h2, marginBottom: spacing.md },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md, backgroundColor: colors.surface },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  patientIcon: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  cardHeading: { flex: 1, marginLeft: spacing.sm },
  patientName: { ...typography.body, fontWeight: '700' },
  service: { ...typography.caption, marginTop: 2 },
  status: { ...typography.caption, color: colors.primaryDark, fontWeight: '700' },
  completedStatus: { color: colors.textMuted },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  detailText: { ...typography.caption, marginLeft: spacing.sm },
  note: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs },
  noteLabel: { ...typography.caption, fontWeight: '700', marginBottom: 2 },
  noteText: { ...typography.body },
  completeButton: { marginTop: spacing.md },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h2, marginTop: spacing.md },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
