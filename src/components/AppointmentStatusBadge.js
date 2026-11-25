import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { radius, spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function AppointmentStatusBadge({ status }) {
  const { colors } = useTheme();
  const statusStyles = {
    pending: { backgroundColor: colors.primaryLight, color: colors.primaryDark },
    confirmed: { backgroundColor: colors.primaryLight, color: colors.primaryDark },
    completed: { backgroundColor: colors.surface, color: colors.primary },
    cancelled: { backgroundColor: colors.surface, color: colors.danger },
  };
  const tone = statusStyles[status] || statusStyles.pending;
  const styles = createStyles();
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.label, { color: tone.color }]}>
        {statusLabels[status] || 'Pending'}
      </Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  label: { fontSize: 12, fontWeight: '700' },
  });
}
