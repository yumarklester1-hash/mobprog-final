import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import AppointmentStatusBadge from '../components/AppointmentStatusBadge';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { dentalServices } from '../data/dentalServices';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function AppointmentDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user, users } = useAuth();
  const { appointments, updateAppointment } = useAppointments();
  const [updating, setUpdating] = useState(false);
  const appointmentId = Array.isArray(id) ? id[0] : id;
  const appointment = appointments.find(
    (item) =>
      item.id === appointmentId &&
      (user?.role === 'doctor'
        ? item.doctorId === user.id
        : item.patientId === user?.id),
  );
  const patient = users.find((item) => item.id === appointment?.patientId);
  const patientProfilePhoto = patient?.profilePhoto || appointment?.patientProfilePhoto;
  const appointmentsRoute = user?.role === 'doctor' ? '/doctor' : '/appointments';
  const service = appointment && dentalServices.find((item) => item.id === appointment.serviceId);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [router, user]);

  const updateStatus = async (status) => {
    setUpdating(true);
    try {
      await updateAppointment(appointment.id, {
        status,
        ...(status === 'cancelled'
          ? { cancelledBy: user.role, cancelledAt: new Date().toISOString() }
          : {}),
      });
      Alert.alert(
        'Appointment updated',
        status === 'confirmed'
          ? 'The patient can now see this appointment as confirmed.'
          : `Appointment marked ${status}.`,
      );
    } catch (error) {
      Alert.alert('Unable to update appointment', error.message || 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmCancellation = () => {
    Alert.alert('Cancel appointment?', 'This appointment will be marked as cancelled.', [
      { text: 'Keep appointment', style: 'cancel' },
      { text: 'Cancel appointment', style: 'destructive', onPress: () => updateStatus('cancelled') },
    ]);
  };

  if (!user) return null;

  if (!appointment) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.missingState}>
          <Text style={styles.title}>Appointment not found</Text>
          <AppButton title="Back to appointments" onPress={() => router.replace(appointmentsRoute)} style={styles.button} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.secondary} />
          <Text style={styles.backText}>{user?.role === 'doctor' ? 'Dashboard' : 'Appointments'}</Text>
        </TouchableOpacity>
        <View style={styles.heroIcon}>
          <Ionicons name="calendar" size={34} color={colors.white} />
        </View>
        <Text style={styles.title}>{service?.name || appointment.service}</Text>
        <AppointmentStatusBadge status={appointment.status} />

        <View style={styles.detailsCard}>
          {service ? <DetailRow icon="time-outline" label="Estimated duration" value={service.duration} /> : null}
          <DetailRow icon="calendar-outline" label="Date" value={appointment.date} />
          <DetailRow icon="time-outline" label="Time" value={appointment.time} />
          {user?.role === 'doctor' ? (
            <>
              <View style={styles.patientProfile}>
                <View style={styles.patientAvatar}>
                  {patientProfilePhoto ? (
                    <Image source={{ uri: patientProfilePhoto }} style={styles.patientAvatarImage} />
                  ) : (
                    <Ionicons name="person-outline" size={25} color={colors.primary} />
                  )}
                </View>
                <View style={styles.patientProfileInfo}>
                  <Text style={styles.patientProfileName}>{appointment.patientName || patient?.name || 'Patient'}</Text>
                  <Text style={styles.patientProfileCaption}>Patient profile</Text>
                </View>
              </View>
              <DetailRow icon="mail-outline" label="Patient email" value={appointment.patientEmail || patient?.email} />
              {appointment.patientPhone || patient?.phone ? (
                <DetailRow icon="call-outline" label="Patient phone" value={appointment.patientPhone || patient.phone} />
              ) : null}
            </>
          ) : (
            <DetailRow icon="person-outline" label="Dentist" value={appointment.doctorName} />
          )}
          {appointment.notes ? <DetailRow icon="chatbox-ellipses-outline" label="Notes" value={appointment.notes} /> : null}
        </View>
        {user?.role === 'doctor' && appointment.status === 'pending' ? (
          <AppButton
            title="Confirm appointment"
            loading={updating}
            onPress={() => updateStatus('confirmed')}
            style={styles.button}
          />
        ) : null}
        {user?.role === 'doctor' && appointment.status === 'confirmed' ? (
          <AppButton
            title="Mark as completed"
            loading={updating}
            onPress={() => updateStatus('completed')}
            style={styles.button}
          />
        ) : null}
        {['pending', 'confirmed'].includes(appointment.status) ? (
          <AppButton
            title="Cancel appointment"
            variant="outline"
            loading={updating}
            onPress={confirmCancellation}
            style={styles.button}
          />
        ) : null}
        <AppButton title="Back to appointments" variant="outline" onPress={() => router.replace(appointmentsRoute)} style={styles.button} />
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={21} color={colors.primary} />
      <View style={styles.detailText}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xl },
  backText: { ...typography.body, color: colors.secondary, marginLeft: spacing.sm },
  heroIcon: { width: 68, height: 68, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  title: { ...typography.h1, marginTop: spacing.lg },
  detailsCard: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginTop: spacing.xl },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  patientProfile: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.sm },
  patientAvatar: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  patientAvatarImage: { width: '100%', height: '100%' },
  patientProfileInfo: { marginLeft: spacing.md },
  patientProfileName: { ...typography.body, fontWeight: '700' },
  patientProfileCaption: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  detailText: { marginLeft: spacing.md },
  detailLabel: { ...typography.caption },
  detailValue: { ...typography.body, fontWeight: '600', marginTop: 2 },
  button: { marginTop: spacing.xl },
  missingState: { flex: 1, justifyContent: 'center', padding: spacing.lg },
});