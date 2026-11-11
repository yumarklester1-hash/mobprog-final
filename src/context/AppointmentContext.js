import React, { createContext, useContext, useState } from 'react';
import { getCurrentUser } from '../components/authData';

const AppointmentContext = createContext(null);

export function AppointmentProvider({ children }) {
  const [appointments, setAppointments] = useState([]);

  const addAppointment = (details) => {
    const appointment = {
      id: String(Date.now()),
      status: 'Confirmed',
      ...details,
    };
    setAppointments((current) => [appointment, ...current]);
    return appointment;
  };

  const user = getCurrentUser();
  const visibleAppointments = user?.role === 'doctor'
    ? appointments
    : appointments.filter((appointment) => appointment.patientId === user?.id);

  const updateAppointmentStatus = (id, status) => {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment,
      ),
    );
  };

  return (
    <AppointmentContext.Provider value={{ appointments: visibleAppointments, addAppointment, updateAppointmentStatus }}>
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