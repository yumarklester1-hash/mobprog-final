import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppointmentStatusBadge from '../components/AppointmentStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { colors, radius, spacing, typography } from '../theme/theme';

const filters = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function DoctorDashboardScreen() {
  const router = useRouter();
  const { user, users, logout } = useAuth();
  const { appointments } = useAppointments();
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const doctorAppointments = appointments
    .filter((item) => item.doctorId === user?.id)
    .map((item) => {
      const patient = users.find((savedUser) => savedUser.id === item.patientId);
      return {
        ...item,
        patientName: item.patientName || patient?.name || 'Patient',
        patientProfilePhoto: patient?.profilePhoto || item.patientProfilePhoto,
        patientEmail: item.patientEmail || patient?.email,
        patientPhone: item.patientPhone || patient?.phone,
      };
    });
  const pendingCount = doctorAppointments.filter((item) => item.status === 'pending').length;
  const upcomingCount = doctorAppointments.filter((item) => item.status === 'confirmed').length;

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'doctor') router.replace('/home');
  }, [router, user?.role]);

  const visibleAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return doctorAppointments.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch = !query || [
        item.patientName,
        item.patientEmail,
        item.service,
        item.date,
        item.time,
      ].some((value) => value?.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [doctorAppointments, search, statusFilter]);

  if (!user || user.role !== 'doctor') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={visibleAppointments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.content, visibleAppointments.length === 0 && styles.emptyContent]}
        ListHeaderComponent={
          <View>
            <View style={styles.topRow}>
              <View style={styles.greeting}>
                <Text style={styles.eyebrow}>DOCTOR WORKSPACE</Text>
                <Text style={styles.title}>Appointments</Text>
                <Text style={styles.subtitle}>Welcome, {user.name}</Text>
              </View>
              <TouchableOpacity
                style={styles.profileButton}
                onPress={() => router.push('/profile')}
                accessibilityRole="button"
                accessibilityLabel="Open profile"
              >
                {user.profilePhoto ? (
                  <Image source={{ uri: user.profilePhoto }} style={styles.profilePhoto} />
                ) : (
                  <Ionicons name="person-circle-outline" size={48} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
              <SummaryCard label="Total" value={doctorAppointments.length} icon="calendar-outline" />
              <SummaryCard label="Needs review" value={pendingCount} icon="time-outline" />
              <SummaryCard label="Confirmed" value={upcomingCount} icon="checkmark-circle-outline" />
            </View>

            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={19} color={colors.placeholder} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search patient, service, or date"
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                accessibilityLabel="Search appointments"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {filters.map((filter) => (
                <TouchableOpacity
                  key={filter}
                  style={[styles.filterChip, statusFilter === filter && styles.filterChipSelected]}
                  onPress={() => setStatusFilter(filter)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: statusFilter === filter }}
                >
                  <Text style={[styles.filterText, statusFilter === filter && styles.filterTextSelected]}>
                    {filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.appointmentCard}
            onPress={() => router.push(`/appointment/${item.id}`)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${item.patientName}, ${item.service}, ${item.date} at ${item.time}`}
          >
            <View style={styles.patientIcon}>
              {item.patientProfilePhoto ? (
                <Image source={{ uri: item.patientProfilePhoto }} style={styles.patientPhoto} />
              ) : (
                <Ionicons name="person-outline" size={22} color={colors.primary} />
              )}
            </View>
            <View style={styles.appointmentInfo}>
              <Text style={styles.patientName}>{item.patientName}</Text>
              <Text style={styles.service}>{item.service}</Text>
              <Text style={styles.date}>{item.date} · {item.time}</Text>
            </View>
            <View style={styles.cardMeta}>
              <AppointmentStatusBadge status={item.status} />
              <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={44} color={colors.primary} />
            <Text style={styles.emptyTitle}>
              {doctorAppointments.length ? 'No matching appointments' : 'No appointments assigned'}
            </Text>
            <Text style={styles.emptyText}>
              {doctorAppointments.length
                ? 'Try another search or status filter.'
                : 'Patient bookings for you will appear here.'}
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={async () => {
              try {
                await logout();
                router.replace('/login');
              } catch (error) {
                Alert.alert('Unable to log out', error.message || 'Please try again.');
              }
            }}
            accessibilityRole="button"
          >
            <Ionicons name="log-out-outline" size={20} color={colors.danger} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        }
      />
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, icon }) {
  return (
    <View style={styles.summaryCard}>
      <Ionicons name={icon} size={19} color={colors.primary} />
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  emptyContent: { flexGrow: 1 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { flex: 1 },
  eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 1 },
  title: { ...typography.h1, marginTop: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  profileButton: { marginLeft: spacing.md, padding: spacing.xs },
  profilePhoto: { width: 48, height: 48, borderRadius: radius.pill },
  summaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  summaryCard: { flex: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.xs },
  summaryValue: { ...typography.h2, marginTop: spacing.xs },
  summaryLabel: { ...typography.caption, textAlign: 'center', marginTop: 2, fontSize: 11 },
  searchBox: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  searchInput: { flex: 1, marginLeft: spacing.sm, color: colors.text },
  filters: { gap: spacing.sm, paddingVertical: spacing.md },
  filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  filterChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.caption },
  filterTextSelected: { color: colors.white, fontWeight: '700' },
  appointmentCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  patientIcon: { width: 44, height: 44, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  patientPhoto: { width: '100%', height: '100%', borderRadius: radius.sm },
  appointmentInfo: { flex: 1 },
  patientName: { ...typography.body, fontWeight: '700' },
  service: { ...typography.caption, color: colors.secondary, marginTop: 2 },
  date: { ...typography.caption, marginTop: spacing.xs },
  cardMeta: { alignItems: 'flex-end', gap: spacing.xs },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  emptyTitle: { ...typography.h2, marginTop: spacing.md, textAlign: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  logoutText: { ...typography.body, color: colors.danger, fontWeight: '700' },
});
