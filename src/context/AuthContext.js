import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doctors } from '../data/doctors';

const USERS_KEY = 'dental-app-users-v1';
const SESSION_KEY = 'dental-app-session-v1';
const AuthContext = createContext(null);

function parseStoredValue(value, fallback, label) {
  if (value === null) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`Saved ${label} data is invalid. Clear the app data and try again.`);
  }
}

function mergeDoctors(savedUsers) {
  return doctors.map((doctor) => ({
    ...doctor,
    ...savedUsers.find((user) => user.id === doctor.id),
  })).concat(savedUsers.filter((user) => user.role === 'patient'));
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setReady(false);
    try {
      const [[, savedUsersValue], [, sessionValue]] = await AsyncStorage.multiGet([
        USERS_KEY,
        SESSION_KEY,
      ]);
      const savedUsers = parseStoredValue(savedUsersValue, [], 'account');
      const nextUsers = mergeDoctors(savedUsers);
      const savedSession = parseStoredValue(sessionValue, null, 'session');
      const nextUser = nextUsers.find((item) => item.id === savedSession?.userId) || null;

      setUsers(nextUsers);
      setUser(nextUser);
      await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
      setReady(true);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load saved accounts.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const login = async (email, password) => {
    const normalizedEmail = email.trim().toLowerCase();
    const matchedUser = users.find(
      (item) => item.email.toLowerCase() === normalizedEmail && item.password === password,
    );
    if (!matchedUser) return null;

    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ userId: matchedUser.id }));
    setUser(matchedUser);
    return matchedUser;
  };

  const register = async (details) => {
    const normalizedEmail = details.email.trim().toLowerCase();
    if (users.some((item) => item.email.toLowerCase() === normalizedEmail)) {
      return { error: 'An account with this email already exists.' };
    }

    const newUser = {
      ...details,
      id: `patient-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      email: normalizedEmail,
      role: 'patient',
    };
    const nextUsers = [...users, newUser];
    await AsyncStorage.multiSet([
      [USERS_KEY, JSON.stringify(nextUsers)],
      [SESSION_KEY, JSON.stringify({ userId: newUser.id })],
    ]);
    setUsers(nextUsers);
    setUser(newUser);
    return { user: newUser };
  };

  const updateUser = async (updates) => {
    if (!user) throw new Error('You must be signed in to update your profile.');
    const nextEmail = updates.email?.trim().toLowerCase();
    if (
      nextEmail &&
      users.some((item) => item.id !== user.id && item.email.toLowerCase() === nextEmail)
    ) {
      throw new Error('An account with this email already exists.');
    }
    const nextUser = { ...user, ...updates };
    if (nextEmail) nextUser.email = nextEmail;
    const nextUsers = users.map((item) => (item.id === user.id ? nextUser : item));
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(nextUsers));
    setUsers(nextUsers);
    setUser(nextUser);
    return nextUser;
  };

  const updatePassword = async (currentPassword, newPassword) => {
    if (currentPassword !== user?.password) throw new Error('Current password is incorrect.');
    await updateUser({ password: newPassword });
  };

  const logout = async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({
    user,
    users,
    doctors,
    ready,
    error,
    retry: load,
    login,
    register,
    updateUser,
    uploadProfilePhoto: async (uri) => updateUser({ profilePhoto: uri }),
    updatePassword,
    logout,
  }), [user, users, ready, error, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
