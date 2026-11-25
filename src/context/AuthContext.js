import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import { supabase, supabaseConfigError } from '../lib/supabase';

const AuthContext = createContext(null);
const PROFILE_PHOTO_BUCKET = 'profile-photos';
const PROFILE_PHOTO_URL_TTL_SECONDS = 60 * 60;
const PROFILE_PHOTO_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

function mapProfile(profile, email) {
  return {
    id: profile.id,
    email: email || profile.email,
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    name: profile.name || '',
    phone: profile.phone || '',
    profilePhoto: null,
    profilePhotoPath: profile.profile_photo_path || null,
    specialty: profile.specialty || '',
    role: profile.role,
  };
}

async function getProfilePhotoUrl(path) {
  const { data, error } = await supabase.storage
    .from(PROFILE_PHOTO_BUCKET)
    .createSignedUrl(path, PROFILE_PHOTO_URL_TTL_SECONDS);
  if (error) throw error;
  return data.signedUrl;
}

function getPhotoContentType(uri, mimeType) {
  const normalizedMimeType = mimeType?.split(';')[0].toLowerCase();
  if (PROFILE_PHOTO_MIME_TYPES.has(normalizedMimeType)) return normalizedMimeType;

  const extension = uri.split(/[?#]/)[0].split('.').pop().toLowerCase();
  const extensionTypes = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };
  const inferredType = extensionTypes[extension];
  if (inferredType) return inferredType;
  throw new Error('Unable to determine the selected photo format. Please choose another image.');
}

export function AuthProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  const loadProfiles = useCallback(async (authUser) => {
    const [
      { data: profiles, error: profilesError },
      { data: doctorRows, error: doctorsError },
    ] = await Promise.all([
      supabase.from('profiles').select('*').order('first_name'),
      supabase.from('doctors').select('*').order('name'),
    ]);
    if (profilesError) throw profilesError;
    if (doctorsError) throw doctorsError;
    const profile = profiles.find((item) => item.id === authUser.id);
    if (!profile) {
      throw new Error('Your profile is missing. Apply the Supabase database migration and sign in again.');
    }

    const photo = await AsyncStorage.getItem(`dental-app-profile-photo-${authUser.id}`);
    const loadedProfiles = profiles.map((item) =>
      mapProfile(item, item.id === authUser.id ? authUser.email : null),
    );
    const usersById = new Map(loadedProfiles.map((item) => [item.id, item]));
    doctorRows.forEach((doctor) => {
      if (usersById.has(doctor.id)) return;
      usersById.set(doctor.id, {
        ...mapProfile(doctor),
        role: 'doctor',
      });
    });

    const profilesWithPhotos = await Promise.all(
      [...usersById.values()].map(async (item) => ({
        ...item,
        profilePhoto: item.profilePhotoPath
          ? await getProfilePhotoUrl(item.profilePhotoPath)
          : null,
      })),
    );
    const currentUser = profilesWithPhotos.find((item) => item.id === authUser.id);
    if (!currentUser.profilePhoto) currentUser.profilePhoto = photo;
    setUsers(profilesWithPhotos);
    setUser(currentUser);
    setError('');
    return currentUser;
  }, []);

  const load = useCallback(async () => {
    setError('');
    setReady(false);
    try {
      if (supabaseConfigError) throw new Error(supabaseConfigError);
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (data.session?.user) await loadProfiles(data.session.user);
      else {
        setUsers([]);
        setUser(null);
      }
    } catch (loadError) {
      setError(loadError.message || 'Unable to load saved accounts.');
    } finally {
      setReady(true);
    }
  }, [loadProfiles]);

  const refreshProfiles = useCallback(async () => {
    if (!user) return;
    try {
      await loadProfiles(user);
    } catch (loadError) {
      setError(loadError.message || 'Unable to refresh clinic accounts.');
      throw loadError;
    }
  }, [loadProfiles, user]);

  useEffect(() => {
    load();
    if (!supabase) return undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (!session?.user) {
          setUsers([]);
          setUser(null);
          setError('');
          return;
        }
        loadProfiles(session.user).catch((profileError) => {
          setError(profileError.message || 'Unable to load your profile.');
        });
      }, 0);
    });
    return () => subscription.unsubscribe();
  }, [load, loadProfiles]);

  const login = async (email, password) => {
    if (!supabase) throw new Error(supabaseConfigError);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (loginError) {
      if (loginError.message.toLowerCase().includes('invalid login credentials')) return null;
      throw loginError;
    }
    return loadProfiles(data.user);
  };

  const register = async (details) => {
    if (!supabase) throw new Error(supabaseConfigError);
    const { data, error: registrationError } = await supabase.auth.signUp({
      email: details.email.trim().toLowerCase(),
      password: details.password,
      options: {
        data: {
          first_name: details.firstName,
          last_name: details.lastName,
          name: details.name,
          phone: details.phone,
        },
        emailRedirectTo: 'dental-app://login',
      },
    });
    if (registrationError) {
      if (registrationError.message.toLowerCase().includes('already registered')) {
        return { error: 'An account with this email already exists.' };
      }
      throw registrationError;
    }
    if (data.session && data.user) await loadProfiles(data.user);
    return { user: data.user, needsConfirmation: !data.session };
  };

  const updateUser = async (updates) => {
    if (!user) throw new Error('You must be signed in to update your profile.');
    if (!supabase) throw new Error(supabaseConfigError);
    const nextEmail = updates.email?.trim().toLowerCase();
    if (nextEmail && nextEmail !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: nextEmail });
      if (emailError) throw emailError;
    }
    const { data, error: updateError } = await supabase
      .from('profiles')
      .update({
        first_name: updates.firstName?.trim(),
        last_name: updates.lastName?.trim(),
        name: updates.name?.trim(),
        phone: updates.phone?.trim(),
      })
      .eq('id', user.id)
      .select('*')
      .single();
    if (updateError) throw updateError;
    const nextUser = mapProfile(data, user.email);
    nextUser.profilePhoto = user.profilePhoto;
    setUsers((current) => current.map((item) => (item.id === user.id ? nextUser : item)));
    setUser(nextUser);
    return nextUser;
  };

  const updateDoctorProfile = async (doctorId, updates) => {
    if (user?.role !== 'admin') throw new Error('Only administrators can manage doctor profiles.');
    if (!supabase) throw new Error(supabaseConfigError);
    const { error: rpcError } = await supabase.rpc('admin_update_doctor_profile', {
      target_id: doctorId,
      target_role: updates.role,
      target_specialty: updates.specialty?.trim(),
    });
    if (rpcError) throw rpcError;
    const { data, error: updateError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', doctorId)
      .single();
    if (updateError) throw updateError;

    const updatedProfile = mapProfile(data);
    const photo = users.find((item) => item.id === doctorId)?.profilePhoto || null;
    updatedProfile.profilePhoto = photo;
    setUsers((current) => current.map((item) => (
      item.id === doctorId ? updatedProfile : item
    )));
    return updatedProfile;
  };

  const uploadUserProfilePhoto = async (profileId, uri, base64, mimeType) => {
    if (user?.role !== 'admin') throw new Error('Only administrators can manage doctor photos.');
    if (!supabase) throw new Error(supabaseConfigError);
    if (!base64) throw new Error('Unable to read the selected photo. Please choose it again.');

    const path = `${profileId}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(path, decode(base64), {
        cacheControl: '3600',
        contentType: getPhotoContentType(uri, mimeType),
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ profile_photo_path: path })
      .eq('id', profileId);
    if (profileError) throw profileError;

    const profilePhoto = await getProfilePhotoUrl(path);
    setUsers((current) => current.map((item) => (
      item.id === profileId ? { ...item, profilePhoto, profilePhotoPath: path } : item
    )));
    return profilePhoto;
  };

  const updatePassword = async (currentPassword, newPassword) => {
    if (!user || !supabase) throw new Error('You must be signed in to update your password.');
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) throw new Error('Current password is incorrect.');
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError) throw passwordError;
  };

  const requestPasswordReset = async (email) => {
    if (!supabase) throw new Error(supabaseConfigError);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'dental-app://reset-password' },
    );
    if (resetError) throw resetError;
  };

  const logout = async () => {
    if (!supabase) throw new Error(supabaseConfigError);
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) throw logoutError;
  };

  const uploadProfilePhoto = async (uri, base64, mimeType) => {
    if (!user) throw new Error('You must be signed in to update your profile photo.');
    if (!supabase) throw new Error(supabaseConfigError);
    if (!base64) throw new Error('Unable to read the selected photo. Please choose it again.');

    const path = `${user.id}/avatar`;
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(path, decode(base64), {
        cacheControl: '3600',
        contentType: getPhotoContentType(uri, mimeType),
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ profile_photo_path: path })
      .eq('id', user.id);
    if (profileError) throw profileError;

    const nextUser = {
      ...user,
      profilePhoto: await getProfilePhotoUrl(path),
      profilePhotoPath: path,
    };
    setUser(nextUser);
    setUsers((current) => current.map((item) => (item.id === user.id ? nextUser : item)));
    return nextUser;
  };

  const doctors = users.filter((item) => item.role === 'doctor');
  const value = useMemo(() => ({
    user,
    users,
    doctors,
    ready,
    error,
    retry: load,
    refreshProfiles,
    login,
    register,
    updateUser,
    updateDoctorProfile,
    uploadProfilePhoto,
    uploadUserProfilePhoto,
    updatePassword,
    requestPasswordReset,
    logout,
  }), [user, users, doctors, ready, error, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
