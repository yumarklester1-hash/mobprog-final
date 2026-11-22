import React from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AppButton from './AppButton';
import { useAuth } from '../context/AuthContext';

export default function LogoutButton({ style }) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      Alert.alert('Unable to log out', error.message || 'Please try again.');
    }
  };

  return (
    <AppButton
      title="Log out"
      variant="outline"
      onPress={handleLogout}
      style={style}
    />
  );
}
