/**
 * Mini AudioPlayer bar component.
 * Shown at the bottom of main screens when something is playing.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface AudioPlayerProps {
  onPress?: () => void;
}

export function AudioPlayer({ onPress }: AudioPlayerProps) {
  const { audiobook, chapters, currentChapterIndex, isPlaying, play, pause } = usePlayer();

  if (!audiobook) return null;

  const currentChapter = chapters[currentChapterIndex];

  return (
    <Pressable style={styles.container} onPress={onPress} accessibilityRole="button">
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>
          {audiobook.title}
        </Text>
        {currentChapter && (
          <Text style={styles.chapter} numberOfLines={1}>
            {currentChapter.chapter_number}. {currentChapter.title}
          </Text>
        )}
      </View>

      <Pressable
        style={styles.playBtn}
        onPress={() => (isPlaying ? pause() : play())}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        hitSlop={12}
      >
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  info: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  chapter: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  playBtn: {
    padding: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    fontSize: 16,
    color: Colors.textOnPrimary,
  },
});
