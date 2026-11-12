import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { useAppointments } from '../context/AppointmentContext';
import { doctors } from '../data/doctors';
import { dentalServices } from '../data/dentalServices';
import { colors, spacing, typography } from '../theme/theme';

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { appointments, addAppointment } = useAppointments();
  const [doctorId, setDoctorId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState(null);
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picker, setPicker] = useState('');
  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    if (!user) router.replace('/login');
    else if (user.role !== 'patient') router.replace('/doctor');
  }, [router, user?.role]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
  const firstWeekday = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), 1).getDay();
  const calendarCells = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];
  const timeSlots = Array.from({ length: 17 }, (_, index) => {
    const totalMinutes = 9 * 60 + index * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
  });

  const isBookedSlot = (slot) => {
    if (!date || !doctorId) return false;
    const dateIso = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    return appointments.some(
      (item) =>
        item.doctorId === doctorId &&
        item.dateIso === dateIso &&
        item.time === slot &&
        ['pending', 'confirmed'].includes(item.status),
    );
  };

  const handleSubmit = async () => {
    if (user?.role !== 'patient') {
      setError('Only patient accounts can request appointments.');
      return;
    }
    const selectedService = dentalServices.find((item) => item.id === serviceId);
    const selectedDoctor = doctors.find((item) => item.id === doctorId);
    if (!selectedDoctor || !selectedService || !date || !time) {
      setError('Choose a dentist, service, date, and time to continue.');
      return;
    }

    if (isBookedSlot(time)) {
      setError('That time was just booked. Please choose another slot.');
      return;
    }

    setSaving(true);
    try {
      const appointment = await addAppointment({
        patientId: user.id,
        patientName: user.name,
        patientProfilePhoto: user.profilePhoto,
        patientEmail: user.email,
        patientPhone: user.phone,
        doctorId: selectedDoctor.id,
        doctorName: selectedDoctor.name,
        serviceId: selectedService.id,
        service: selectedService.name,
        date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
        dateIso: [
          date.getFullYear(),
          String(date.getMonth() + 1).padStart(2, '0'),
          String(date.getDate()).padStart(2, '0'),
        ].join('-'),
        time,
        notes: notes.trim(),
      });
      router.replace(`/appointment/${appointment.id}`);
    } catch (submitError) {
      setError(submitError.message || 'Unable to save the appointment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const openDatePicker = () => {
    if (date) setDisplayMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setPicker('date');
  };

  const isSelectedDay = (day) =>
    Boolean(
      date &&
      date.getFullYear() === displayMonth.getFullYear() &&
      date.getMonth() === displayMonth.getMonth() &&
      date.getDate() === day,
    );

  const isPastSlot = (slot) => {
    if (!date) return false;
    const [clock, period] = slot.split(' ');
    const [hourText, minuteText] = clock.split(':');
    let hour = Number(hourText) % 12;
    if (period === 'PM') hour += 12;
    const slotDate = new Date(date);
    slotDate.setHours(hour, Number(minuteText), 0, 0);
    return slotDate <= new Date();
  };

  if (user?.role !== 'patient') return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.secondary} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Make an appointment</Text>
          <Text style={styles.subtitle}>Choose a dentist, service, and available time.</Text>

          <Text style={styles.label}>Dentist</Text>
          {doctors.length ? (
            <View style={styles.doctorList}>
              {doctors.map((doctor) => (
                <TouchableOpacity
                  key={doctor.id}
                  style={[styles.doctorOption, doctorId === doctor.id && styles.doctorSelected]}
                  onPress={() => {
                    setDoctorId(doctor.id);
                    setTime('');
                    setError('');
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: doctorId === doctor.id }}
                >
                  <View style={styles.doctorIcon}>
                    <Ionicons name="person-outline" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.doctorInfo}>
                    <Text style={styles.doctorName}>{doctor.name}</Text>
                    <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
                  </View>
                  {doctorId === doctor.id ? (
                    <Ionicons name="checkmark-circle" size={21} color={colors.primary} />
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyDoctors}>
              No dentists are available in this local demo.
            </Text>
          )}

          <Text style={styles.label}>Service</Text>
          <View style={styles.serviceRow}>
            {dentalServices.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[styles.serviceOption, serviceId === option.id && styles.serviceSelected]}
                onPress={() => {
                  setServiceId(option.id);
                  setError('');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: serviceId === option.id }}
              >
                <Text style={[styles.serviceText, serviceId === option.id && styles.serviceTextSelected]}>
                  {option.name}
                </Text>
                <Text style={styles.serviceDuration}>{option.duration}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Date</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={openDatePicker} accessibilityRole="button">
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
            <Text style={[styles.pickerText, !date && styles.pickerPlaceholder]}>
              {date ? date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Choose a date'}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.placeholder} />
          </TouchableOpacity>

          <Text style={[styles.label, styles.timeLabel]}>Time</Text>
          <TouchableOpacity
            style={[styles.pickerButton, !date && styles.pickerDisabled]}
            onPress={() => date && setPicker('time')}
            disabled={!date}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.pickerText, !time && styles.pickerPlaceholder]}>
              {time || (date ? 'Choose a time' : 'Choose a date first')}
            </Text>
            <Ionicons name="chevron-down" size={18} color={colors.placeholder} />
          </TouchableOpacity>
          <InputField
            label="Notes (optional)"
            icon="chatbox-ellipses-outline"
            placeholder="Anything we should know?"
            value={notes}
            onChangeText={setNotes}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <AppButton title="Request appointment" onPress={handleSubmit} loading={saving} style={styles.button} />
          </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={picker !== ''} transparent animationType="fade" onRequestClose={() => setPicker('')}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{picker === 'date' ? 'Choose a date' : 'Choose a time'}</Text>
              <TouchableOpacity onPress={() => setPicker('')} accessibilityRole="button" accessibilityLabel="Close picker">
                <Ionicons name="close" size={24} color={colors.secondary} />
              </TouchableOpacity>
            </View>
            {picker === 'date' ? (
              <>
                <View style={styles.monthHeader}>
                  <TouchableOpacity
                    onPress={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1))}
                    disabled={displayMonth.getFullYear() === today.getFullYear() && displayMonth.getMonth() === today.getMonth()}
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                  >
                    <Ionicons name="chevron-back" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <Text style={styles.monthText}>{displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
                  <TouchableOpacity
                    onPress={() => setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1))}
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                  >
                    <Ionicons name="chevron-forward" size={22} color={colors.primary} />
                  </TouchableOpacity>
                </View>
                <View style={styles.calendarGrid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Text key={day} style={styles.weekday}>{day}</Text>
                  ))}
                  {calendarCells.map((day, index) => {
                    if (!day) return <View key={`empty-${index}`} style={styles.dayCell} />;
                    const cellDate = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
                    cellDate.setHours(0, 0, 0, 0);
                    const disabled = cellDate < today;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.dayCell, isSelectedDay(day) && styles.selectedDay]}
                        disabled={disabled}
                        onPress={() => {
                          const chosen = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day, 12);
                          setDate(chosen);
                          setTime('');
                          setError('');
                          setPicker('');
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelectedDay(day), disabled }}
                      >
                        <Text style={[styles.dayText, disabled && styles.disabledDay, isSelectedDay(day) && styles.selectedDayText]}>
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              timeSlots.every((slot) => isPastSlot(slot) || isBookedSlot(slot)) ? (
                <View style={styles.noTimes}>
                  <Text style={styles.noTimesText}>No available appointment times remain for this date.</Text>
                  <TouchableOpacity
                    onPress={() => setPicker('date')}
                    accessibilityRole="button"
                  >
                    <Text style={styles.chooseAnotherDate}>Choose another date</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView contentContainerStyle={styles.timeGrid}>
                  {timeSlots.map((slot) => {
                    const booked = isBookedSlot(slot);
                    const disabled = isPastSlot(slot) || booked;
                    return (
                      <TouchableOpacity
                        key={slot}
                        style={[styles.timeOption, time === slot && styles.timeSelected, disabled && styles.timeDisabled]}
                        disabled={disabled}
                        onPress={() => {
                          setTime(slot);
                          setError('');
                          setPicker('');
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: time === slot, disabled }}
                      >
                        <Text style={[styles.timeText, time === slot && styles.timeSelectedText]}>
                          {slot}{booked ? ' · Booked' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  keyboardAvoidingView: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  backText: { ...typography.body, color: colors.secondary, marginLeft: spacing.sm },
  title: { ...typography.h1 },
  subtitle: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xl },
  label: { ...typography.caption, color: colors.secondary, fontWeight: '600', marginBottom: spacing.sm },
  doctorList: { gap: spacing.sm, marginBottom: spacing.lg },
  doctorOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, padding: spacing.md },
  doctorSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  doctorIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  doctorInfo: { flex: 1, marginLeft: spacing.md },
  doctorName: { ...typography.body, fontWeight: '700' },
  doctorSpecialty: { ...typography.caption, marginTop: 2 },
  emptyDoctors: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.lg },
  serviceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  serviceOption: { borderWidth: 1.5, borderColor: colors.border, borderRadius: 20, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  serviceSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  serviceText: { ...typography.caption, color: colors.text },
  serviceTextSelected: { color: colors.primaryDark, fontWeight: '700' },
  serviceDuration: { ...typography.caption, color: colors.textMuted, fontSize: 11, marginTop: 2 },
  pickerButton: { height: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  pickerText: { flex: 1, color: colors.text, fontSize: 15, marginLeft: spacing.sm },
  pickerPlaceholder: { color: colors.placeholder },
  pickerDisabled: { opacity: 0.6 },
  timeLabel: { marginTop: spacing.xs },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: spacing.lg },
  modalCard: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.md, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  modalTitle: { ...typography.h2 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md, paddingHorizontal: spacing.xs },
  monthText: { ...typography.body, fontWeight: '700', color: colors.secondary },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: { width: '14.2857%', textAlign: 'center', color: colors.textMuted, fontSize: 12, fontWeight: '600', paddingVertical: spacing.sm },
  dayCell: { width: '14.2857%', height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21 },
  dayText: { ...typography.body, fontSize: 14 },
  disabledDay: { color: colors.border },
  selectedDay: { backgroundColor: colors.primary },
  selectedDayText: { color: colors.white, fontWeight: '700' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: spacing.xs },
  noTimes: { alignItems: 'center', paddingVertical: spacing.lg },
  noTimesText: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.md },
  chooseAnotherDate: { ...typography.body, color: colors.primary, fontWeight: '700' },
  timeOption: { width: '48%', borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: spacing.sm, alignItems: 'center', marginBottom: spacing.sm },
  timeSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  timeDisabled: { opacity: 0.35 },
  timeText: { ...typography.caption, color: colors.text },
  timeSelectedText: { color: colors.primaryDark, fontWeight: '700' },
  error: { color: colors.danger, fontSize: 13, marginBottom: spacing.sm },
  button: { marginTop: spacing.sm },
});
