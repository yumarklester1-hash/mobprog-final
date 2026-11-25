import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import { radius, spacing } from '../theme/theme';
import { useTheme } from '../context/ThemeContext';

export default function AppButton({
  title,
  icon,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}) {
  const { colors, typography } = useTheme();
  const styles = createStyles(colors, typography);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'outline' && styles.outline,
        variant === 'text' && styles.text,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? colors.white : colors.primary}
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[
              styles.label,
              variant === 'primary' && styles.labelPrimary,
              variant === 'outline' && styles.labelOutline,
              variant === 'text' && styles.labelText,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function createStyles(colors, typography) {
  return StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 3,
  },
  outline: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  text: {
    backgroundColor: 'transparent',
    height: 'auto',
    paddingVertical: spacing.xs,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.button,
  },
  labelPrimary: {
    color: colors.white,
  },
  labelOutline: {
    color: colors.primary,
  },
  labelText: {
    color: colors.primary,
  },
  });
}