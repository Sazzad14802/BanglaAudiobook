/**
 * ShrutiHeader — Standardized app header matching Figma design.
 * Features back button, title, contextual subtitle, and 3-dot options menu.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes, Spacing } from '../theme';

interface ShrutiHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onOptionsPress?: () => void;
  alignCenter?: boolean;
}

export function ShrutiHeader({
  title,
  subtitle,
  onBack,
  onOptionsPress,
  alignCenter = false,
}: ShrutiHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftContainer}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            hitSlop={12}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backChevron}>‹</Text>
          </Pressable>
        ) : null}

        {!alignCenter && (
          <View style={styles.titleColumn}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        )}
      </View>

      {alignCenter && (
        <View style={styles.centerContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}

      <View style={styles.rightContainer}>
        {onOptionsPress ? (
          <Pressable
            onPress={onOptionsPress}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            hitSlop={12}
            accessibilityLabel="Options"
            accessibilityRole="button"
          >
            <Text style={styles.dotsIcon}>⋮</Text>
          </Pressable>
        ) : (
          <View style={{ width: 32 }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: 'transparent',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 2,
  },
  rightContainer: {
    alignItems: 'flex-end',
    minWidth: 32,
  },
  titleColumn: {
    marginLeft: Spacing.xs,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    opacity: 0.6,
    backgroundColor: Colors.overlayLight,
  },
  backChevron: {
    fontSize: 28,
    color: Colors.textPrimary,
    lineHeight: 30,
    fontWeight: '300',
  },
  dotsIcon: {
    fontSize: 22,
    color: Colors.textPrimary,
    lineHeight: 24,
    fontWeight: 'bold',
  },
});
