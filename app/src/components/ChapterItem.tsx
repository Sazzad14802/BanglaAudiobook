/**
 * ChapterItem component.
 * Displays a single chapter row in the chapter list.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Chapter } from '../types/chapter';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface ChapterItemProps {
  chapter: Chapter;
  isActive?: boolean;
  onPress: () => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function ChapterItem({ chapter, isActive = false, onPress }: ChapterItemProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        isActive && styles.rowActive,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Chapter ${chapter.chapter_number}: ${chapter.title}`}
    >
      <View style={[styles.numBadge, isActive && styles.numBadgeActive]}>
        <Text style={[styles.numText, isActive && styles.numTextActive]}>
          {isActive ? '▶' : chapter.chapter_number}
        </Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, isActive && styles.titleActive]} numberOfLines={1}>
          {chapter.title}
        </Text>
        {chapter.duration_seconds > 0 && (
          <Text style={styles.duration}>{formatDuration(chapter.duration_seconds)}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  rowActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  rowPressed: {
    opacity: 0.7,
  },
  numBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numBadgeActive: {
    backgroundColor: Colors.primary,
  },
  numText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  numTextActive: {
    color: Colors.textOnPrimary,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  titleActive: {
    color: Colors.primaryDark,
    fontWeight: '800',
  },
  duration: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
