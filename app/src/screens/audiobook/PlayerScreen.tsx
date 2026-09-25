/**
 * PlayerScreen — full-screen audio player.
 */

import React, { useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../../contexts/PlayerContext';
import { ChapterItem } from '../../components/ChapterItem';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { SafeAreaView } from 'react-native-safe-area-context';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function PlayerScreen() {
  const nav = useNavigation();
  const {
    audiobook,
    chapters,
    currentChapterIndex,
    isPlaying,
    isLoading,
    positionSeconds,
    durationSeconds,
    play,
    pause,
    seek,
    nextChapter,
    prevChapter,
    loadAudiobook,
  } = usePlayer();

  const progress = durationSeconds > 0 ? positionSeconds / durationSeconds : 0;

  const handleSeekBar = useCallback(
    (fraction: number) => {
      seek(fraction * durationSeconds);
    },
    [seek, durationSeconds],
  );

  if (!audiobook) {
    return (
      <SafeAreaView style={styles.root}>
        <Text style={styles.noPlayer}>No audiobook is currently loaded.</Text>
        <Pressable onPress={() => nav.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const currentChapter = chapters[currentChapterIndex];

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={12} accessibilityRole="button">
          <Text style={styles.backIcon}>↓</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>Now Playing</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover / Visual */}
        <View style={styles.visualArea}>
          <View style={styles.coverCircle}>
            <Text style={styles.coverEmoji}>🎧</Text>
          </View>
          <Text style={styles.audiobookTitle} numberOfLines={2}>{audiobook.title}</Text>
          {audiobook.author ? (
            <Text style={styles.audiobookAuthor}>{audiobook.author}</Text>
          ) : null}
        </View>

        {/* Chapter Info */}
        {currentChapter && (
          <Text style={styles.chapterLabel}>
            {currentChapter.chapter_number}. {currentChapter.title}
          </Text>
        )}

        {/* Seek Bar */}
        <View style={styles.seekContainer}>
          <Text style={styles.timeLabel}>{formatTime(positionSeconds)}</Text>
          <Pressable
            style={styles.seekTrack}
            onPress={(e) => {
              const { locationX } = e.nativeEvent;
              // Approximate width from layout
              const fraction = Math.min(1, Math.max(0, locationX / 260));
              handleSeekBar(fraction);
            }}
            accessibilityRole="adjustable"
          >
            <View style={styles.seekFill} pointerEvents="none">
              <View style={[styles.seekProgress, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>
            <View
              style={[styles.seekThumb, { left: `${progress * 100}%` as unknown as number }]}
              pointerEvents="none"
            />
          </Pressable>
          <Text style={styles.timeLabel}>{formatTime(durationSeconds)}</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={prevChapter}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Previous Chapter"
          >
            <Text style={styles.controlIcon}>⏮</Text>
          </Pressable>

          <Pressable
            onPress={() => seek(Math.max(0, positionSeconds - 10))}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Rewind 10 seconds"
          >
            <Text style={styles.controlIcon}>⏪</Text>
          </Pressable>

          <Pressable
            onPress={() => (isPlaying ? pause() : play())}
            style={({ pressed }) => [styles.playBtn, pressed && styles.btnPressed]}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            <Text style={styles.playIcon}>{isLoading ? '⌛' : isPlaying ? '⏸' : '▶'}</Text>
          </Pressable>

          <Pressable
            onPress={() => seek(Math.min(durationSeconds, positionSeconds + 10))}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Forward 10 seconds"
          >
            <Text style={styles.controlIcon}>⏩</Text>
          </Pressable>

          <Pressable
            onPress={nextChapter}
            style={({ pressed }) => [styles.controlBtn, pressed && styles.btnPressed]}
            accessibilityRole="button"
            accessibilityLabel="Next Chapter"
          >
            <Text style={styles.controlIcon}>⏭</Text>
          </Pressable>
        </View>

        {/* Chapter List */}
        {chapters.length > 0 && (
          <View style={styles.chapterSection}>
            <Text style={styles.chapterSectionTitle}>Chapters</Text>
            {chapters.map((ch, idx) => (
              <ChapterItem
                key={ch.id}
                chapter={ch}
                isActive={idx === currentChapterIndex}
                onPress={async () => {
                  if (idx === currentChapterIndex) {
                    await seek(0);
                  } else if (audiobook) {
                    await loadAudiobook(audiobook, chapters, idx, 0);
                  }
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  noPlayer: {
    color: Colors.textSecondary,
    textAlign: 'center',
    margin: Spacing.xl,
    fontSize: FontSizes.base,
  },
  backBtn: {
    alignSelf: 'center',
    padding: Spacing.md,
  },
  backBtnText: { color: Colors.primary, fontSize: FontSizes.base },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  backIcon: { color: Colors.textPrimary, fontSize: 22, fontWeight: '300' },
  headerTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl },
  visualArea: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
  },
  coverCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.primarySurface,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  coverEmoji: { fontSize: 72 },
  audiobookTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    textAlign: 'center',
  },
  audiobookAuthor: {
    color: Colors.textSecondary,
    fontSize: FontSizes.base,
    textAlign: 'center',
  },
  chapterLabel: {
    color: Colors.primaryDark,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  seekContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  timeLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    width: 36,
    textAlign: 'center',
    fontWeight: '600',
  },
  seekTrack: {
    flex: 1,
    height: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  seekFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surfaceElevated,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  seekProgress: {
    backgroundColor: Colors.primary,
  },
  seekThumb: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    top: 2,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  controlBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  playBtn: {
    width: 68,
    height: 68,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnPressed: { opacity: 0.75 },
  controlIcon: { fontSize: 20 },
  playIcon: { fontSize: 28, color: Colors.textOnPrimary },
  chapterSection: { gap: Spacing.sm },
  chapterSectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
});
