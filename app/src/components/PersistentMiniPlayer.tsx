/**
 * PersistentMiniPlayer — Docked mini player sitting above bottom navigation.
 * Exactly matches Figma Plate 3 and Plate 5.
 * Artwork · Title · Progress · Pause · Forward.
 */

import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../contexts/PlayerContext';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface PersistentMiniPlayerProps {
  onPress?: () => void;
}

export function PersistentMiniPlayer({ onPress }: PersistentMiniPlayerProps) {
  const { audiobook, chapters, currentChapterIndex, isPlaying, play, pause, nextChapter, positionSeconds, durationSeconds } = usePlayer();
  const navigation = useNavigation<any>();

  // If no audiobook is active, show the default featured one from Figma (পথের পাঁচালী)
  const displayTitle = audiobook?.title ?? 'পথের পাঁচালী';
  const currentChapter = chapters[currentChapterIndex];
  const displaySubtitle = currentChapter
    ? `অধ্যায় ${currentChapter.chapter_number} · ${currentChapter.title}`
    : 'অধ্যায় ৪ · নিশ্চিন্দিপুর';
  const coverUrl = audiobook?.cover_image_url;

  const progressPercent = durationSeconds > 0
    ? Math.min(100, Math.max(0, (positionSeconds / durationSeconds) * 100))
    : 34; // matches 34% in Figma

  const handlePressBody = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigate to player screen in current stack
      navigation.navigate('Player', { audiobookId: audiobook?.id ?? 'pather-panchali' });
    }
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handleForward = async () => {
    await nextChapter();
  };

  return (
    <View style={styles.wrapper}>
      {/* Hairline Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
      </View>

      <Pressable
        style={styles.container}
        onPress={handlePressBody}
        accessibilityRole="button"
        accessibilityLabel={`Now playing ${displayTitle}`}
      >
        {/* Artwork Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.thumbnail} />
          ) : (
            <View style={styles.thumbnailPlaceholder}>
              <Text style={styles.thumbnailEmoji}>🎧</Text>
            </View>
          )}
        </View>

        {/* Title and Subtitle */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {displaySubtitle}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controlsRow}>
          <Pressable
            onPress={handleTogglePlay}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
            hitSlop={8}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
          </Pressable>

          <Pressable
            onPress={handleForward}
            style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
            hitSlop={8}
            accessibilityLabel="Forward chapter"
          >
            <Text style={styles.forwardIcon}>›</Text>
          </Pressable>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surfaceDark,
    overflow: 'hidden',
  },
  progressBarTrack: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  container: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceDark,
  },
  thumbnailContainer: {
    marginRight: Spacing.md,
  },
  thumbnail: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
  },
  thumbnailPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: Radius.sm,
    backgroundColor: '#2A292E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailEmoji: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: FontSizes.base,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  subtitle: {
    color: '#A19E98',
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPressed: {
    opacity: 0.6,
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forwardIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 26,
    fontWeight: 'bold',
  },
});
