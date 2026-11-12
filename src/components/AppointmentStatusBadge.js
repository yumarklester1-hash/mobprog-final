import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme/theme';

const statusLabels = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusStyles = {
  pending: { backgroundColor: '#FFF7E6', color: '#A16207' },
  confirmed: { backgroundColor: colors.primaryLight, color: colors.primaryDark },
  completed: { backgroundColor: '#ECFDF3', color: '#16794A' },
  cancelled: { backgroundColor: '#FEF2F2', color: colors.danger },
};

export default function AppointmentStatusBadge({ status }) {
  const tone = statusStyles[status] || statusStyles.pending;
  return (
    <View style={[styles.badge, { backgroundColor: tone.backgroundColor }]}>
      <Text style={[styles.label, { color: tone.color }]}>
        {statusLabels[status] || 'Pending'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  label: { fontSize: 12, fontWeight: '700' },
});
