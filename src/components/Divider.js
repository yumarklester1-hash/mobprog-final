import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

export default function Divider({ label = 'OR' }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <View style={styles.row}>
      <View style={styles.line} />
      <Text style={styles.label}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

function createStyles(colors) {
  return StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  label: {
    marginHorizontal: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  });
}