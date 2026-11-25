import React, { useState } from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { radius, spacing } from '../theme/theme';

export default function ThemeModeToggle() {
  const { mode, colors, setThemeMode } = useTheme();
  const [saving, setSaving] = useState(false);

  const toggleMode = async () => {
    setSaving(true);
    try {
      await setThemeMode(mode === 'dark' ? 'light' : 'dark');
    } catch (error) {
      Alert.alert('Unable to change appearance', error.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={toggleMode}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.md,
        backgroundColor: colors.surface,
        paddingHorizontal: spacing.md,
      }}
    >
      <Ionicons
        name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={colors.primary}
      />
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
        {mode === 'dark' ? 'Light mode' : 'Dark mode'}
      </Text>
    </TouchableOpacity>
  );
}
