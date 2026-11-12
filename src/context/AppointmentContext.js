import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AppointmentContext = createContext(null);
const STORAGE_KEY = 'dental-app-appointments-v1';
const allowedTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export function AppointmentProvider({ children }) {
  const [appointments, setAppointments] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    setReady(false);
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = saved === null ? [] : JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error('Saved appointments data is invalid.');
      setAppointments(parsed);
      setReady(true);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load saved appointments.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addAppointment = async (details) => {
    const appointment = {
      id: `appointment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      status: 'pending',
      ...details,
    };
    const nextAppointments = [appointment, ...appointments];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextAppointments));
    setAppointments(nextAppointments);
    return appointment;
  };

  const updateAppointment = async (id, updates) => {
    const current = appointments.find((item) => item.id === id);
    if (!current) throw new Error('Appointment not found.');
    if (updates.status && !allowedTransitions[current.status]?.includes(updates.status)) {
      throw new Error(`Cannot change an appointment from ${current.status} to ${updates.status}.`);
    }
    const nextAppointments = appointments.map((item) =>
      item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextAppointments));
    setAppointments(nextAppointments);
    return nextAppointments.find((item) => item.id === id);
  };

  const value = useMemo(() => ({
    appointments,
    ready,
    error,
    retry: load,
    addAppointment,
    updateAppointment,
  }), [appointments, ready, error, load]);

  return (
    <AppointmentContext.Provider value={value}>
      {children}
    </AppointmentContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentContext);
  if (!context) {
    throw new Error('useAppointments must be used inside AppointmentProvider');
  }
  return context;
}
