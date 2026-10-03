/**
 * ShrutiButton — Buttons matching Figma designs.
 * Supports primary (terracotta), secondary outline, Google sign-in, and loading states.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

export type ShrutiButtonVariant = 'primary' | 'secondary' | 'google' | 'outline' | 'compact';

interface ShrutiButtonProps {
  label: string;
  onPress: () => void;
  variant?: ShrutiButtonVariant;
  disabled?: boolean;
  isLoading?: boolean;
  fullWidth?: boolean;
  bulletPrefix?: boolean;
}

export function ShrutiButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  isLoading = false,
  fullWidth = true,
  bulletPrefix = false,
}: ShrutiButtonProps) {
  const isPrimary = variant === 'primary' || variant === 'compact';
  const isGoogle = variant === 'google';
  const isSecondary = variant === 'secondary' || variant === 'outline';
  const isCompact = variant === 'compact';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [
        styles.base,
        fullWidth && styles.fullWidth,
        isCompact && styles.compact,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        isGoogle && styles.google,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: Spacing.sm }} />
          <Text style={styles.primaryText}>Loading...</Text>
        </View>
      ) : (
        <View style={styles.contentRow}>
          {isGoogle && <Text style={styles.bulletDot}>•</Text>}
          {bulletPrefix && !isGoogle && <Text style={styles.bulletDot}>•</Text>}
          <Text
            style={[
              isPrimary && styles.primaryText,
              isSecondary && styles.secondaryText,
              isGoogle && styles.googleText,
              isCompact && styles.compactText,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  fullWidth: {
    width: '100%',
  },
  compact: {
    height: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
  },
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  google: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletDot: {
    fontSize: 16,
    color: Colors.textPrimary,
    marginRight: 6,
    lineHeight: 18,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: FontSizes.base,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  secondaryText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  googleText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  compactText: {
    fontSize: FontSizes.sm,
  },
});
