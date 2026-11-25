import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

export default function SocialButton({ icon, onPress }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity style={styles.circle} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={22} color={colors.secondary} />
    </TouchableOpacity>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  circle: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  });
}