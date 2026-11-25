import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase, supabaseConfigError } from '../lib/supabase';

const AppointmentContext = createContext(null);
const allowedTransitions = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

function mapAppointment(row) {
  return {
    id: row.id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    patientProfilePhoto: row.patient_profile_photo,
    patientEmail: row.patient_email,
    patientPhone: row.patient_phone,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    serviceId: row.service_id,
    service: row.service,
    date: row.date_label,
    dateIso: row.date_iso,
    time: row.time_slot,
    notes: row.notes,
    status: row.status,
    cancelledBy: row.cancelled_by,
    cancelledAt: row.cancelled_at,
    updatedAt: row.updated_at,
  };
}

export function AppointmentProvider({ children }) {
  const { user, ready: authReady } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const loadRequest = useRef(0);

  const load = useCallback(async ({ refresh = false } = {}) => {
    const requestId = ++loadRequest.current;
    if (refresh) setRefreshing(true);
    setError('');
    try {
      if (!authReady) return;
      if (!user) {
        setAppointments([]);
        return;
      }
      if (supabaseConfigError) throw new Error(supabaseConfigError);
      const { data, error: queryError } = await supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      if (requestId !== loadRequest.current) return;
      setAppointments(data.map(mapAppointment));
    } catch (loadError) {
      if (requestId === loadRequest.current) {
        setError(loadError.message || 'Unable to load appointments.');
      }
    } finally {
      if (authReady && requestId === loadRequest.current) setReady(true);
      if (requestId === loadRequest.current) setRefreshing(false);
    }
  }, [authReady, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!authReady || !user || !supabase) return undefined;
    const channel = supabase
      .channel(`appointments-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [authReady, user?.id, load]);

  const addAppointment = async (details) => {
    if (!supabase) throw new Error(supabaseConfigError);
    const { data, error: insertError } = await supabase
      .from('appointments')
      .insert({
        patient_id: details.patientId,
        patient_name: details.patientName,
        patient_profile_photo: null,
        patient_email: details.patientEmail,
        patient_phone: details.patientPhone,
        doctor_id: details.doctorId,
        doctor_name: details.doctorName,
        service_id: details.serviceId,
        service: details.service,
        date_label: details.date,
        date_iso: details.dateIso,
        time_slot: details.time,
        notes: details.notes,
      })
      .select('*')
      .single();
    if (insertError) {
      if (insertError.code === '23505') {
        throw new Error('That time was just booked. Please choose another slot.');
      }
      throw insertError;
    }
    const appointment = mapAppointment(data);
    setAppointments((current) => [
      appointment,
      ...current.filter((item) => item.id !== appointment.id),
    ]);
    return appointment;
  };

  const updateAppointment = async (id, updates) => {
    const current = appointments.find((item) => item.id === id);
    if (!current) throw new Error('Appointment not found.');
    if (updates.status && !allowedTransitions[current.status]?.includes(updates.status)) {
      throw new Error(`Cannot change an appointment from ${current.status} to ${updates.status}.`);
    }
    if (!supabase) throw new Error(supabaseConfigError);
    const { data, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: updates.status,
        cancelled_by: updates.cancelledBy,
        cancelled_at: updates.cancelledAt,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    const appointment = mapAppointment(data);
    setAppointments((current) => current.map((item) => (item.id === id ? appointment : item)));
    return appointment;
  };

  const value = useMemo(() => ({
    appointments,
    ready,
    refreshing,
    error,
    retry: () => load({ refresh: true }),
    addAppointment,
    updateAppointment,
  }), [appointments, ready, refreshing, error, load]);

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
