/**
 * AudiobookCard — Row item matching Figma Plate 3 (Home, Explore, Search).
 * Artwork · Title · Author · Free/Premium status · Circular Peach Play Button.
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
  audiobook: Audiobook & { progress_percent?: number; duration_label?: string };
  onPress: () => void;
  onPlayPress?: () => void;
}

export function AudiobookCard({ audiobook, onPress, onPlayPress }: AudiobookCardProps) {
  const isPremium = audiobook.access_type === 'PREMIUM';
  const progressText = audiobook.progress_percent ? ` · ${audiobook.progress_percent}%` : '';
  const statusLabel = isPremium ? 'Premium' : `Free${progressText}`;

  return (
    <Pressable
      style={({ pressed }) => [styles.rowContainer, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${audiobook.title} by ${audiobook.author ?? 'Unknown'}`}
    >
      {/* Thumbnail */}
      <View style={styles.coverWrapper}>
        {audiobook.cover_image_url ? (
          <Image source={{ uri: audiobook.cover_image_url }} style={styles.coverImage} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>📖</Text>
          </View>
        )}
      </View>

      {/* Book Metadata */}
      <View style={styles.detailsColumn}>
        <Text style={styles.title} numberOfLines={1}>
          {audiobook.title}
        </Text>
        {audiobook.author ? (
          <Text style={styles.author} numberOfLines={1}>
            {audiobook.author}
          </Text>
        ) : null}
        <Text style={[styles.metaText, isPremium ? styles.premiumMeta : styles.freeMeta]}>
          {statusLabel}
        </Text>
      </View>

      {/* Circular Play Button */}
      <Pressable
        style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
        onPress={onPlayPress ?? onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Play ${audiobook.title}`}
      >
        <Text style={styles.playIcon}>▶</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'transparent',
  },
  rowPressed: {
    opacity: 0.7,
    backgroundColor: Colors.overlayLight,
    borderRadius: Radius.md,
  },
  coverWrapper: {
    marginRight: Spacing.md,
  },
  coverImage: {
    width: 58,
    height: 58,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
  },
  coverPlaceholder: {
    width: 58,
    height: 58,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: {
    fontSize: 24,
  },
  detailsColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSizes.base + 0.5,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  author: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  metaText: {
    fontSize: FontSizes.xs,
    marginTop: 3,
    fontWeight: '600',
  },
  freeMeta: {
    color: Colors.tintGreenText,
  },
  premiumMeta: {
    color: Colors.tintPurpleText,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8E0D9', // soft peach from Figma
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
  playButtonPressed: {
    backgroundColor: '#F0C9BF',
    transform: [{ scale: 0.96 }],
  },
  playIcon: {
    color: Colors.primary,
    fontSize: 16,
    marginLeft: 2, // optical center for play triangle
  },
});
