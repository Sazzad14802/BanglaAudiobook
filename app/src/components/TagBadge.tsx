/**
 * TagBadge — Category and permission pill badge matching Figma.
 * Supports FREE, PREMIUM, Offline, Editorial, Genre variants.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

export type TagBadgeVariant = 'free' | 'premium' | 'offline' | 'editorial' | 'genre' | 'dark';

interface TagBadgeProps {
  label: string;
  variant?: TagBadgeVariant;
}

export function TagBadge({ label, variant = 'genre' }: TagBadgeProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'free':
        return styles.containerFree;
      case 'premium':
        return styles.containerPremium;
      case 'offline':
        return styles.containerOffline;
      case 'editorial':
        return styles.containerEditorial;
      case 'dark':
        return styles.containerDark;
      case 'genre':
      default:
        return styles.containerGenre;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'free':
        return styles.textFree;
      case 'premium':
        return styles.textPremium;
      case 'offline':
        return styles.textOffline;
      case 'editorial':
        return styles.textEditorial;
      case 'dark':
        return styles.textDark;
      case 'genre':
      default:
        return styles.textGenre;
    }
  };

  return (
    <View style={[styles.baseBadge, getContainerStyle()]}>
      <Text style={[styles.baseText, getTextStyle()]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  baseBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  baseText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Free
  containerFree: {
    backgroundColor: Colors.badgeFreeBg,
  },
  textFree: {
    color: Colors.badgeFreeText,
    fontWeight: '700',
  },

  // Premium
  containerPremium: {
    backgroundColor: Colors.badgePremiumBg,
  },
  textPremium: {
    color: Colors.badgePremiumText,
    fontWeight: '700',
  },

  // Offline
  containerOffline: {
    backgroundColor: Colors.badgeNeutralBg,
  },
  textOffline: {
    color: Colors.badgeNeutralText,
  },

  // Genre
  containerGenre: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  textGenre: {
    color: Colors.textSecondary,
  },

  // Dark (e.g. selected filters)
  containerDark: {
    backgroundColor: Colors.surfaceDark,
  },
  textDark: {
    color: Colors.textOnDark,
    fontWeight: '600',
  },

  // Editorial Pick Pill
  containerEditorial: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  textEditorial: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
