import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import AppButton from '../components/AppButton';
import InputField from '../components/InputField';
import { useAuth } from '../context/AuthContext';
import { colors, radius, spacing, typography } from '../theme/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, updateUser, uploadProfilePhoto, updatePassword, logout } = useAuth();
  const currentUser = user || {};
  const [photoUri, setPhotoUri] = useState(currentUser.profilePhoto || null);
  const [form, setForm] = useState({
    firstName: currentUser.firstName || currentUser.name?.split(' ')[0] || '',
    lastName: currentUser.lastName || currentUser.name?.split(' ').slice(1).join(' ') || '',
    email: currentUser.email || '',
    phone: currentUser.phone || '',
  });
  const [passwords, setPasswords] = useState({
    current: '',
    next: '',
    confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [router, user]);

  const updateForm = (key) => (value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };
  const updatePasswordField = (key) => (value) => {
    setPasswords((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const changeProfilePhoto = async () => {
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
      });

      if (result.canceled || !result.assets?.[0]?.uri) return;

      const uri = result.assets[0].uri;
      const updatedUser = await uploadProfilePhoto(uri);
      setPhotoUri(updatedUser.profilePhoto);
      setMessage('Profile photo updated.');
    } catch (error) {
      Alert.alert('Unable to select photo', error.message || 'Please try again.');
    }
  };

  const saveProfile = async () => {
    const nextErrors = {};
    if (!form.firstName.trim()) nextErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) nextErrors.lastName = 'Last name is required';
    if (!form.email.trim()) nextErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) nextErrors.email = 'Enter a valid email';
    if (!form.phone.trim()) nextErrors.phone = 'Phone number is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await updateUser({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        name: `${form.firstName.trim()} ${form.lastName.trim()}`,
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      setMessage('Profile updated.');
    } catch (error) {
      setMessage(error.message || 'Unable to save profile.');
    }
  };

  const savePassword = async () => {
    const nextErrors = {};
    if (!passwords.current) nextErrors.current = 'Enter your current password';
    else if (passwords.current !== currentUser.password) nextErrors.current = 'Current password is incorrect';
    if (!passwords.next) nextErrors.next = 'Enter a new password';
    else if (passwords.next.length < 6) nextErrors.next = 'Use at least 6 characters';
    if (passwords.confirm !== passwords.next) nextErrors.confirm = 'Passwords do not match';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    try {
      await updatePassword(passwords.current, passwords.next);
      setPasswords({ current: '', next: '', confirm: '' });
      setErrors({});
      setMessage('Password updated.');
    } catch (error) {
      setMessage(error.message || 'Unable to update password.');
    }
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.secondary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.heading}>
          <TouchableOpacity
            style={styles.avatarButton}
            onPress={changeProfilePhoto}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <View style={styles.avatar}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person-outline" size={30} color={colors.primary} />
              )}
              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </View>
            <Text style={styles.changePhoto}>Edit</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>My profile</Text>
            <Text style={styles.subtitle}>
              {user?.role === 'doctor' ? 'Doctor account' : 'Patient account'} · Manage your details.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Personal details</Text>
          <InputField label="First name" icon="person-outline" value={form.firstName} onChangeText={updateForm('firstName')} error={errors.firstName} />
          <InputField label="Last name" icon="person-outline" value={form.lastName} onChangeText={updateForm('lastName')} error={errors.lastName} />
          <InputField label="Email" icon="mail-outline" keyboardType="email-address" autoCapitalize="none" value={form.email} onChangeText={updateForm('email')} error={errors.email} />
          <InputField label="Phone number" icon="call-outline" keyboardType="phone-pad" value={form.phone} onChangeText={updateForm('phone')} error={errors.phone} />
          <AppButton title="Save profile" onPress={saveProfile} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Change password</Text>
          <InputField label="Current password" icon="lock-closed-outline" isPassword value={passwords.current} onChangeText={updatePasswordField('current')} error={errors.current} />
          <InputField label="New password" icon="lock-closed-outline" isPassword value={passwords.next} onChangeText={updatePasswordField('next')} error={errors.next} />
          <InputField label="Confirm new password" icon="lock-closed-outline" isPassword value={passwords.confirm} onChangeText={updatePasswordField('confirm')} error={errors.confirm} />
          <AppButton title="Update password" variant="outline" onPress={savePassword} />
        </View>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <AppButton
          title="Log out"
          variant="outline"
          onPress={async () => {
            try {
              await logout();
              router.replace('/login');
            } catch (error) {
              setMessage(error.message || 'Unable to log out.');
            }
          }}
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  backText: { ...typography.body, color: colors.secondary, marginLeft: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
  avatarButton: { alignItems: 'center', marginRight: spacing.md },
  avatar: { width: 56, height: 56, borderRadius: radius.pill, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarImage: { width: '100%', height: '100%', borderRadius: radius.pill },
  cameraBadge: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 22, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  changePhoto: { ...typography.caption, color: colors.primary, fontWeight: '600', marginTop: spacing.xs, marginRight: spacing.md },
  title: { ...typography.h1, fontSize: 24 },
  subtitle: { ...typography.caption, marginTop: spacing.xs },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: { ...typography.h2, marginBottom: spacing.md },
  message: { ...typography.caption, color: colors.primaryDark, textAlign: 'center', marginTop: spacing.xs },
});
