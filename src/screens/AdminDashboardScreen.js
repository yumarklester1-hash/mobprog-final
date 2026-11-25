import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import AppointmentStatusBadge from '../components/AppointmentStatusBadge';
import LogoutButton from '../components/LogoutButton';
import ThemeModeToggle from '../components/ThemeModeToggle';
import { useAppointments } from '../context/AppointmentContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/theme';

const filters = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export default function AdminDashboardScreen() {
  const router = useRouter();
  const {
    user,
    users,
    updateDoctorProfile,
    uploadUserProfilePhoto,
    refreshProfiles,
  } = useAuth();
  const { appointments, refreshing, retry } = useAppointments();
  const { colors, typography } = useTheme();
  const [section, setSection] = useState('appointments');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [specialty, setSpecialty] = useState('');
  const [saving, setSaving] = useState(false);
  const [refreshingProfiles, setRefreshingProfiles] = useState(false);
  const styles = createStyles(colors, typography);

  const doctors = users.filter((item) => item.role === 'doctor');
  const candidates = users.filter((item) => item.role === 'patient');
  const visibleAppointments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return appointments.filter((item) => {
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesSearch = !query || [
        item.patientName,
        item.doctorName,
        item.service,
        item.date,
        item.time,
      ].some((value) => value?.toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [appointments, search, statusFilter]);

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'admin') router.replace(user.role === 'doctor' ? '/doctor' : '/home');
  }, [router, user?.id, user?.role]);

  const openProfile = (profile) => {
    setSelectedProfile(profile);
    setSpecialty(profile.specialty || '');
  };

  const refreshClinicData = async () => {
    setRefreshingProfiles(true);
    try {
      await Promise.all([retry(), refreshProfiles()]);
    } catch (error) {
      Alert.alert('Unable to refresh clinic data', error.message || 'Please try again.');
    } finally {
      setRefreshingProfiles(false);
    }
  };

  const saveDoctor = async () => {
    if (!selectedProfile) return;
    if (!specialty.trim()) {
      Alert.alert('Specialty needed', 'Enter the dentist’s specialty to continue.');
      return;
    }
    setSaving(true);
    try {
      await updateDoctorProfile(selectedProfile.id, { role: 'doctor', specialty });
      setSelectedProfile(null);
    } catch (error) {
      Alert.alert('Unable to save dentist', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const changePhoto = async () => {
    if (!selectedProfile) return;
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photo access to choose a profile picture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      const { uri, base64, mimeType } = result.assets[0];
      await uploadUserProfilePhoto(selectedProfile.id, uri, base64, mimeType);
      Alert.alert('Photo updated', 'The dentist’s profile photo has been saved.');
    } catch (error) {
      Alert.alert('Unable to update photo', error.message || 'Please try again.');
    }
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing || refreshingProfiles}
            onRefresh={refreshClinicData}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CLINIC ADMIN</Text>
            <Text style={styles.title}>Good day, {user.firstName || 'Admin'}</Text>
            <Text style={styles.subtitle}>Manage bookings and your clinic’s dentist directory.</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
            accessibilityRole="button"
            accessibilityLabel="Open profile"
          >
            <Ionicons name="person-circle-outline" size={46} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard label="Bookings" value={appointments.length} colors={colors} typography={typography} />
          <SummaryCard
            label="Needs review"
            value={appointments.filter((item) => item.status === 'pending').length}
            colors={colors}
            typography={typography}
          />
          <SummaryCard label="Dentists" value={doctors.length} colors={colors} typography={typography} />
        </View>

        <View style={styles.tabs}>
          {[
            { key: 'appointments', label: 'Appointments' },
            { key: 'doctors', label: 'Dentists' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, section === tab.key && styles.selectedTab]}
              onPress={() => setSection(tab.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: section === tab.key }}
            >
              <Text style={[styles.tabText, section === tab.key && styles.selectedTabText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {section === 'appointments' ? (
          <>
            <View style={styles.searchBox}>
              <Ionicons name="search-outline" size={19} color={colors.placeholder} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search patient, dentist, or date"
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                accessibilityLabel="Search appointments"
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filters}
            >
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
            {visibleAppointments.length ? visibleAppointments.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.appointmentCard}
                onPress={() => router.push(`/appointment/${item.id}`)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientName}>{item.patientName}</Text>
                  <Text style={styles.service}>{item.service} · {item.doctorName}</Text>
                  <Text style={styles.date}>{item.date} at {item.time}</Text>
                </View>
                <View style={styles.cardMeta}>
                  <AppointmentStatusBadge status={item.status} />
                  <Ionicons name="chevron-forward" size={18} color={colors.placeholder} />
                </View>
              </TouchableOpacity>
            )) : (
              <Text style={styles.emptyText}>No appointments match this search.</Text>
            )}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Dentist directory</Text>
            <Text style={styles.helperText}>
              Update a dentist’s specialty or profile photo. New dentists should first create a regular account.
            </Text>
            {doctors.length ? doctors.map((doctor) => (
              <TouchableOpacity
                key={doctor.id}
                style={styles.personCard}
                onPress={() => openProfile(doctor)}
                accessibilityRole="button"
              >
                <ProfileImage profile={doctor} colors={colors} />
                <View style={styles.personInfo}>
                  <Text style={styles.personName}>{doctor.name || 'Dentist'}</Text>
                  <Text style={styles.personDetail}>{doctor.specialty || 'Specialty not set'}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.placeholder} />
              </TouchableOpacity>
            )) : (
              <Text style={styles.emptyText}>No dentist accounts yet.</Text>
            )}
            {candidates.length ? (
              <>
                <Text style={styles.sectionTitle}>Add a dentist</Text>
                <Text style={styles.helperText}>
                  Select an existing patient account to make it a dentist account.
                </Text>
                {candidates.map((candidate) => (
                  <TouchableOpacity
                    key={candidate.id}
                    style={styles.personCard}
                    onPress={() => openProfile(candidate)}
                    accessibilityRole="button"
                  >
                    <ProfileImage profile={candidate} colors={colors} />
                    <View style={styles.personInfo}>
                      <Text style={styles.personName}>{candidate.name || 'New account'}</Text>
                      <Text style={styles.personDetail}>{candidate.email}</Text>
                    </View>
                    <Text style={styles.addLabel}>Add</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : null}
          </>
        )}
        <ThemeModeToggle />
        <LogoutButton style={styles.logout} />
      </ScrollView>

      <Modal
        visible={Boolean(selectedProfile)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedProfile(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedProfile?.role === 'doctor' ? 'Dentist details' : 'Add dentist'}
              </Text>
              <TouchableOpacity
                onPress={() => setSelectedProfile(null)}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.personName}>{selectedProfile?.name}</Text>
            <Text style={styles.personDetail}>{selectedProfile?.email}</Text>
            <Text style={styles.inputLabel}>Specialty</Text>
            <TextInput
              value={specialty}
              onChangeText={setSpecialty}
              placeholder="e.g. General Dentistry"
              placeholderTextColor={colors.placeholder}
              style={styles.specialtyInput}
              accessibilityLabel="Dentist specialty"
            />
            {selectedProfile?.role === 'doctor' ? (
              <AppButton title="Change profile photo" variant="outline" onPress={changePhoto} style={styles.modalButton} />
            ) : null}
            <AppButton
              title={selectedProfile?.role === 'doctor' ? 'Save changes' : 'Add to dentist directory'}
              onPress={saveDoctor}
              loading={saving}
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SummaryCard({ label, value, colors, typography }) {
  return (
    <View style={{
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xs,
    }}>
      <Text style={{ ...typography.h2, marginTop: 0 }}>{value}</Text>
      <Text style={{ ...typography.caption, textAlign: 'center', marginTop: spacing.xs }}>{label}</Text>
    </View>
  );
}

function ProfileImage({ profile, colors }) {
  return (
    <View style={{
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
      overflow: 'hidden',
    }}>
      {profile.profilePhoto ? (
        <Image source={{ uri: profile.profilePhoto }} style={{ width: '100%', height: '100%' }} />
      ) : (
        <Ionicons name="person-outline" size={22} color={colors.primary} />
      )}
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    headerCopy: { flex: 1 },
    eyebrow: { ...typography.caption, color: colors.primary, fontWeight: '700', letterSpacing: 1 },
    title: { ...typography.h1, marginTop: spacing.xs, fontSize: 24 },
    subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
    profileButton: { marginLeft: spacing.md, padding: spacing.xs },
    summaryRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    tabs: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.border, marginTop: spacing.lg },
    tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
    selectedTab: { borderBottomWidth: 2, borderColor: colors.primary },
    tabText: { ...typography.body, color: colors.textMuted, fontWeight: '600' },
    selectedTabText: { color: colors.primary },
    searchBox: { height: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
    searchInput: { flex: 1, marginLeft: spacing.sm, color: colors.text },
    filters: { gap: spacing.sm, paddingVertical: spacing.md },
    filterChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
    filterChipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { ...typography.caption },
    filterTextSelected: { color: colors.white, fontWeight: '700' },
    appointmentCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
    appointmentInfo: { flex: 1 },
    patientName: { ...typography.body, fontWeight: '700' },
    service: { ...typography.caption, color: colors.secondary, marginTop: 2 },
    date: { ...typography.caption, marginTop: spacing.xs },
    cardMeta: { alignItems: 'flex-end', gap: spacing.xs },
    emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center', paddingVertical: spacing.xl },
    sectionTitle: { ...typography.h2, marginTop: spacing.lg, marginBottom: spacing.xs },
    helperText: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md, lineHeight: 19 },
    personCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
    personInfo: { flex: 1 },
    personName: { ...typography.body, fontWeight: '700' },
    personDetail: { ...typography.caption, marginTop: spacing.xs },
    addLabel: { ...typography.caption, color: colors.primary, fontWeight: '700' },
    logout: { marginTop: spacing.lg },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
    modalCard: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.lg },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
    modalTitle: { ...typography.h2 },
    inputLabel: { ...typography.caption, color: colors.secondary, fontWeight: '600', marginTop: spacing.lg, marginBottom: spacing.xs },
    specialtyInput: { height: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, color: colors.text, backgroundColor: colors.surface },
    modalButton: { marginTop: spacing.md },
  });
}
