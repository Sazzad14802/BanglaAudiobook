/**
 * AudiobookCard component.
 * Displays a single audiobook in the discovery list or library.
 */

import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Audiobook } from '../types/audiobook';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface AudiobookCardProps {
  audiobook: Audiobook;
  onPress: () => void;
  subtitle?: string; // e.g. playback progress label
}

const LANGUAGE_LABELS: Record<string, string> = {
  bn: 'Bangla',
  en: 'English',
};

export function AudiobookCard({ audiobook, onPress, subtitle }: AudiobookCardProps) {
  const langLabel = LANGUAGE_LABELS[audiobook.language] ?? audiobook.language.toUpperCase();

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${audiobook.title} by ${audiobook.author ?? 'Unknown'}`}
    >
      {/* Cover */}
      <View style={styles.coverContainer}>
        {audiobook.cover_image_url ? (
          <Image source={{ uri: audiobook.cover_image_url }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>🎧</Text>
          </View>
        )}
        {audiobook.visibility === 'PRIVATE' && (
          <View style={styles.privateBadge}>
            <Text style={styles.privateBadgeText}>🔒</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{audiobook.title}</Text>
        {audiobook.author ? (
          <Text style={styles.author} numberOfLines={1}>{audiobook.author}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={styles.langBadge}>
            <Text style={styles.langText}>{langLabel}</Text>
          </View>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  coverContainer: {
    position: 'relative',
  },
  cover: {
    width: 90,
    height: 90,
  },
  coverPlaceholder: {
    width: 90,
    height: 90,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 32,
  },
  privateBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.overlay,
    borderRadius: Radius.full,
    padding: 2,
  },
  privateBadgeText: {
    fontSize: 10,
  },
  info: {
    flex: 1,
    padding: Spacing.sm,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    fontWeight: '700',
    lineHeight: 20,
  },
  author: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  langBadge: {
    backgroundColor: Colors.primarySurface,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  langText: {
    color: Colors.primaryDark,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  subtitleText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    flex: 1,
  },
});
