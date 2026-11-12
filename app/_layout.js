import { Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { AppointmentProvider, useAppointments } from '../src/context/AppointmentContext';
import { colors, spacing, typography } from '../src/theme/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppointmentProvider>
        <AppNavigator />
      </AppointmentProvider>
    </AuthProvider>
  );
}

function AppNavigator() {
  const auth = useAuth();
  const {
    ready: appointmentsReady,
    error: appointmentsError,
    retry: retryAppointments,
  } = useAppointments();
  const retry = () => Promise.all([auth.retry(), retryAppointments()]);
  const error = auth.error || appointmentsError;

  if (!auth.ready || !appointmentsReady) {
    return (
      <View style={styles.startup}>
        {error ? (
          <>
            <Text style={styles.error}>{error}</Text>
            <TouchableOpacity onPress={retry} accessibilityRole="button">
              <Text style={styles.retry}>Try again</Text>
            </TouchableOpacity>
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  return (
    <Stack
      initialRouteName="index"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="index" options={{ title: 'Welcome' }} />
      <Stack.Screen name="login" options={{ title: 'Login' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
      <Stack.Screen name="home" options={{ title: 'Patient home' }} />
      <Stack.Screen name="doctor" options={{ title: 'Doctor dashboard' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="appointments" options={{ title: 'Appointments' }} />
      <Stack.Screen name="appointment-new" options={{ title: 'New appointment' }} />
      <Stack.Screen name="appointment/[id]" options={{ title: 'Appointment details' }} />
      <Stack.Screen name="service/[id]" options={{ title: 'Dental service details' }} />
    </Stack>
  );
}

const styles = StyleSheet.create({
  startup: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, backgroundColor: colors.background },
  error: { ...typography.body, color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  retry: { ...typography.body, color: colors.primary, fontWeight: '700' },
});