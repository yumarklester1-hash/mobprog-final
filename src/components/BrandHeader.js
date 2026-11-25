import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { radius, spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

export default function BrandHeader({ title, subtitle }) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  return (
    <View style={styles.wrapper}>
      <View style={styles.logoCircle}>
        <FontAwesome5 name="tooth" size={30} color={colors.white} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  });
}