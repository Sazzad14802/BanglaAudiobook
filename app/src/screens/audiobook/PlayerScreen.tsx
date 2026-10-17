/**
 * PlayerScreen — full-screen player for whatever the PlayerContext has loaded:
 * artwork, chapter info, tap-to-seek progress, ±15s, previous/next chapter,
 * playback speed, sleep timer and offline download.
 */

import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, LayoutChangeEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { ActionItem, ActionPillBar } from '../../components/ActionPillBar';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { AppButton } from '../../components/AppButton';
import { BookCover } from '../../components/BookCover';
import { StateView } from '../../components/StateView';
import { Chip } from '../../components/Chip';
import { errorMessage } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { offline } from '../../storage/offline';
import { isPremium } from '../../types/auth';
import { formatClock } from '../../utils/format';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [0, 15, 30, 60];

export function PlayerScreen() {
  const { navigation, goToTab } = useAppNavigation();
  const { t, tx } = useLanguage();
  const { user } = useAuth();
  const player = usePlayer();
  const {
    audiobook,
    chapters,
    currentChapterIndex,
    isPlaying,
    isLoading,
    isOffline,
    positionSeconds,
    durationSeconds,
    playbackRate,
    sleepEndsAt,
    error,
  } = player;

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);
  const [downloaded, setDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!user || !audiobook) return;
    offline.list(user.id).then((books) => setDownloaded(books.some((b) => b.id === audiobook.id))).catch(() => {});
  }, [user, audiobook]);

  // Keep the sleep-timer countdown label current.
  useEffect(() => {
    if (!sleepEndsAt) return;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [sleepEndsAt]);

  if (!audiobook) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={t('playerNowPlaying')} onBack={() => navigation.goBack()} />
        <StateView
          kind="empty"
          title={tx('কিছুই বাজছে না', 'Nothing is playing')}
          message={tx('একটি অডিওবুক বেছে নিয়ে শুনতে শুরু করুন।', 'Pick an audiobook to start listening.')}
          actionLabel={tx('ফিরে যান', 'Go back')}
          onAction={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  const chapter = chapters[currentChapterIndex];
  const progress = durationSeconds > 0 ? Math.min(1, positionSeconds / durationSeconds) : 0;
  const sleepMinutesLeft = sleepEndsAt ? Math.max(1, Math.ceil((sleepEndsAt - now) / 60000)) : 0;

  const seekFromTouch = (x: number) => {
    if (trackWidth > 0 && durationSeconds > 0) player.seek((x / trackWidth) * durationSeconds);
  };

  const run = (action: () => Promise<void>) => action().catch((e) => Alert.alert(tx('ত্রুটি', 'Error'), errorMessage(e)));

  const toggleOffline = async () => {
    if (!user) return;
    if (downloaded) {
      await offline.remove(audiobook.id, user.id);
      setDownloaded(false);
      return;
    }
    if (!isPremium(user)) {
      Alert.alert(tx('প্রিমিয়াম প্রয়োজন', 'Premium required'), tx('অফলাইনে শুনতে প্রিমিয়াম নিন।', 'Get Premium to listen offline.'), [
        { text: tx('বাতিল', 'Cancel'), style: 'cancel' },
        { text: tx('প্রিমিয়াম নিন', 'Get Premium'), onPress: () => goToTab('ProfileTab', { screen: 'Subscription' }) },
      ]);
      return;
    }
    setDownloading(true);
    try {
      await offline.download(audiobook, user.id);
      setDownloaded(true);
      Alert.alert(tx('ডাউনলোড সম্পন্ন', 'Downloaded'), tx('এখন অফলাইনে শুনতে পারবেন।', 'Available offline now.'));
    } catch (e) {
      Alert.alert(tx('ডাউনলোড ব্যর্থ', 'Download failed'), errorMessage(e));
    } finally {
      setDownloading(false);
    }
  };

  const actions: ActionItem[] = [
    {
      id: 'chapters',
      label: tx(`অধ্যায় (${chapters.length})`, `Chapters (${chapters.length})`),
      onPress: () => navigation.navigate('ChaptersQueue'),
    },
    {
      id: 'details',
      label: tx('বিস্তারিত', 'Details'),
      onPress: () => navigation.navigate('AudiobookDetails', { audiobookId: audiobook.id }),
    },
  ];
  if (!isOffline) {
    actions.push({
      id: 'offline',
      label: downloading ? tx('ডাউনলোড…', 'Saving…') : downloaded ? tx('ডাউনলোডেড', 'Downloaded') : tx('অফলাইন', 'Offline'),
      active: downloaded,
      onPress: toggleOffline,
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <AppHeader
        title={t('playerNowPlaying')}
        subtitle={isOffline ? tx('অফলাইন', 'Offline') : audiobook.author ?? undefined}
        alignCenter
        onBack={() => navigation.goBack()}
        rightIcon="⚙︎"
        rightIconLabel={tx('প্লেব্যাক সেটিংস', 'Playback settings')}
        onRightIconPress={() => setSettingsVisible(true)}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.artworkContainer}>
          <BookCover title={audiobook.title} uri={audiobook.cover_image_url} fill radius={Radius.xl} />
        </View>

        <Text style={styles.bookTitle}>{audiobook.title}</Text>
        <Text style={styles.chapterSubtitle} numberOfLines={1}>
          {chapter
            ? `${tx('অধ্যায়', 'Chapter')} ${chapter.chapter_number}/${chapters.length} · ${chapter.title}`
            : tx('লোড হচ্ছে…', 'Loading…')}
        </Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.progressBarWrapper}
          onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
          onPress={(e) => seekFromTouch(e.nativeEvent.locationX)}
          accessibilityRole="adjustable"
          accessibilityLabel={tx('অগ্রগতি', 'Progress')}
        >
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <View style={[styles.progressThumb, { left: Math.max(0, progress * trackWidth - 7) }]} />
        </Pressable>
        <View style={styles.timeRow}>
          <Text style={styles.timeCounter}>{formatClock(positionSeconds)}</Text>
          <Text style={styles.timeCounter}>-{formatClock(Math.max(0, durationSeconds - positionSeconds))}</Text>
        </View>

        <View style={styles.controlsRow}>
          <Pressable
            style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
            onPress={() => run(player.prevChapter)}
            accessibilityLabel={tx('আগের অধ্যায়', 'Previous chapter')}
          >
            <Text style={styles.skipIcon}>⏮</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconControlButton, pressed && styles.pressed]}
            onPress={() => run(() => player.skip(-15))}
            accessibilityLabel={tx('১৫ সেকেন্ড পিছনে', 'Back 15 seconds')}
          >
            <Text style={styles.rewindIcon}>↺</Text>
            <Text style={styles.rewindSubText}>15</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.mainPlayButton, pressed && styles.mainPlayPressed]}
            onPress={player.togglePlay}
            disabled={!chapter}
            accessibilityLabel={isPlaying ? tx('বিরতি', 'Pause') : tx('চালু করুন', 'Play')}
          >
            {isLoading && !isPlaying ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.mainPlayIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.iconControlButton, pressed && styles.pressed]}
            onPress={() => run(() => player.skip(15))}
            accessibilityLabel={tx('১৫ সেকেন্ড সামনে', 'Forward 15 seconds')}
          >
            <Text style={styles.forwardIcon}>↻</Text>
            <Text style={styles.forwardSubText}>15</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.toolButton,
              currentChapterIndex + 1 >= chapters.length && styles.disabled,
              pressed && styles.pressed,
            ]}
            disabled={currentChapterIndex + 1 >= chapters.length}
            onPress={() => run(player.nextChapter)}
            accessibilityLabel={tx('পরের অধ্যায়', 'Next chapter')}
          >
            <Text style={styles.skipIcon}>⏭</Text>
          </Pressable>
        </View>

        <View style={styles.quickRow}>
          <Pressable style={styles.quickButton} onPress={() => setSettingsVisible(true)}>
            <Text style={styles.speedText}>{playbackRate}x</Text>
          </Pressable>
          <Pressable style={styles.quickButton} onPress={() => setSettingsVisible(true)}>
            <Text style={styles.speedText}>☾ {sleepEndsAt ? tx(`${sleepMinutesLeft} মি.`, `${sleepMinutesLeft}m`) : tx('বন্ধ', 'Off')}</Text>
          </Pressable>
        </View>

        <View style={styles.actionPillWrapper}>
          <ActionPillBar items={actions} />
        </View>
      </ScrollView>

      <ModalBottomSheet visible={settingsVisible} onClose={() => setSettingsVisible(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{tx('প্লেব্যাক সেটিংস', 'Playback settings')}</Text>
          <Text style={styles.settingsLabel}>{tx('গতি', 'Speed')}</Text>
          <View style={styles.chipsRow}>
            {SPEEDS.map((speed) => (
              <Chip key={speed} label={`${speed}x`} selected={playbackRate === speed} onPress={() => player.setSpeed(speed)} />
            ))}
          </View>
          <Text style={styles.settingsLabel}>{tx('স্লিপ টাইমার', 'Sleep timer')}</Text>
          <View style={styles.chipsRow}>
            {SLEEP_OPTIONS.map((minutes) => (
              <Chip
                key={minutes}
                label={minutes ? tx(`${minutes} মিনিট`, `${minutes} min`) : tx('বন্ধ', 'Off')}
                selected={minutes === 0 ? !sleepEndsAt : false}
                onPress={() => player.setSleepTimer(minutes)}
              />
            ))}
          </View>
          {sleepEndsAt ? (
            <Text style={styles.sleepNote}>
              {tx(`${sleepMinutesLeft} মিনিট পর প্লেব্যাক থামবে।`, `Playback stops in ${sleepMinutesLeft} min.`)}
            </Text>
          ) : null}
          <AppButton label={tx('ঠিক আছে', 'Done')} onPress={() => setSettingsVisible(false)} />
        </View>
      </ModalBottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  artworkContainer: {
    width: '86%',
    aspectRatio: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
    marginVertical: Spacing.sm,
  },
  bookTitle: {
    fontSize: FontSizes.xl + 2,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  chapterSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  errorBanner: {
    width: '100%',
    backgroundColor: Colors.tintError,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: {
    color: Colors.tintErrorText,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  progressBarWrapper: {
    width: '100%',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.track,
    borderRadius: Radius.full,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand,
  },
  progressThumb: {
    position: 'absolute',
    // Track is 4pt tall inside Spacing.md padding; centre the 14pt thumb on it.
    top: Spacing.md - 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.brand,
  },
  timeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeCounter: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: Spacing.md,
  },
  toolButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipIcon: {
    fontSize: 20,
    color: Colors.textPrimary,
  },
  disabled: {
    opacity: 0.3,
  },
  iconControlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewindIcon: {
    fontSize: 26,
    color: Colors.textPrimary,
  },
  rewindSubText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    top: 15,
  },
  forwardIcon: {
    fontSize: 26,
    color: Colors.textPrimary,
  },
  forwardSubText: {
    position: 'absolute',
    fontSize: 9,
    fontWeight: 'bold',
    color: Colors.textPrimary,
    top: 15,
  },
  mainPlayButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mainPlayPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.95 }],
  },
  mainPlayIcon: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  speedText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
  actionPillWrapper: {
    width: '100%',
    marginTop: Spacing.md,
  },
  modalContent: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  settingsLabel: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  sleepNote: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
