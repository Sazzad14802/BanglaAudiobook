/**
 * StateView — the single place loading, error and empty states are drawn,
 * so every screen communicates "what is happening" the same way.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface StateViewProps {
  kind: 'loading' | 'error' | 'empty';
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  compact?: boolean;
}

export function StateView({ kind, title, message, actionLabel, onAction, compact }: StateViewProps) {
  if (kind === 'loading') {
    return (
      <View style={[styles.container, compact && styles.compact]}>
        <ActivityIndicator color={Colors.primary} />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.card, compact && styles.compact]}>
      <Text style={styles.icon}>{kind === 'error' ? '⚠︎' : '○'}</Text>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <AppButton label={actionLabel} onPress={onAction} variant="secondary" fullWidth={false} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  compact: {
    paddingVertical: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  icon: {
    fontSize: 22,
    color: Colors.textMuted,
  },
  title: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  message: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  action: {
    marginTop: Spacing.sm,
  },
});
