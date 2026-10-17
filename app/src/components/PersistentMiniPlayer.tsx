/**
 * PersistentMiniPlayer — docked above the tab bar while something is loaded.
 * Artwork · title · chapter · play/pause · next chapter, with a hairline progress bar.
 */

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BookCover } from './BookCover';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface PersistentMiniPlayerProps {
  onPress: () => void;
}

export function PersistentMiniPlayer({ onPress }: PersistentMiniPlayerProps) {
  const {
    audiobook,
    chapters,
    currentChapterIndex,
    isPlaying,
    isLoading,
    error,
    togglePlay,
    nextChapter,
    positionSeconds,
    durationSeconds,
    stop,
  } = usePlayer();
  const { tx } = useLanguage();
  if (!audiobook) return null;

  const chapter = chapters[currentChapterIndex];
  const subtitle = error
    ? error
    : chapter
      ? `${tx('অধ্যায়', 'Chapter')} ${chapter.chapter_number} · ${chapter.title}`
      : tx('লোড হচ্ছে…', 'Loading…');
  const progress = durationSeconds > 0 ? Math.min(100, (positionSeconds / durationSeconds) * 100) : 0;
  const hasNext = currentChapterIndex + 1 < chapters.length;

  return (
    <View style={styles.wrapper}>
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
      </View>

      <Pressable
        style={styles.container}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${tx('এখন বাজছে', 'Now playing')} ${audiobook.title}`}
      >
        <View style={styles.thumbnailContainer}>
          <BookCover title={audiobook.title} uri={audiobook.cover_image_url} size={42} radius={Radius.sm} />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {audiobook.title}
          </Text>
          <Text style={[styles.subtitle, error ? styles.subtitleError : null]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        <View style={styles.controlsRow}>
          {error ? (
            <Pressable
              onPress={stop}
              style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
              hitSlop={8}
              accessibilityLabel={tx('বন্ধ করুন', 'Close player')}
            >
              <Text style={styles.forwardIcon}>×</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                onPress={togglePlay}
                disabled={!chapter}
                style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
                hitSlop={8}
                accessibilityLabel={isPlaying ? tx('বিরতি', 'Pause') : tx('চালু করুন', 'Play')}
              >
                {isLoading && !isPlaying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.playIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
                )}
              </Pressable>
              <Pressable
                onPress={() => nextChapter().catch(() => {})}
                disabled={!hasNext}
                style={({ pressed }) => [
                  styles.controlButton,
                  !hasNext && styles.controlDisabled,
                  pressed && styles.controlPressed,
                ]}
                hitSlop={8}
                accessibilityLabel={tx('পরের অধ্যায়', 'Next chapter')}
              >
                <Text style={styles.forwardIcon}>›</Text>
              </Pressable>
            </>
          )}
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
    backgroundColor: Colors.onDarkHairline,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.brandLight,
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
    color: Colors.textOnDarkSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  subtitleError: {
    color: Colors.textOnDarkAccent,
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
  controlDisabled: {
    opacity: 0.3,
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
