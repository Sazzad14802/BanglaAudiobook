/**
 * PlayerScreen — Now Playing matching Figma Plate 5 Screen 1.
 * Artwork · Title · Progress slider · Speed · Rewind · Play/Pause · Forward · Moon
 * ActionPillBar: `Chapters · Queue · Bookmark · Offline`.
 */

import React, { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ActionItem, ActionPillBar } from '../../components/ActionPillBar';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { ShrutiButton } from '../../components/ShrutiButton';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { usePlayer } from '../../contexts/PlayerContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Player'>;
type Route = RouteProp<HomeStackParamList, 'Player'>;

export function PlayerScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const {
    audiobook: activeAudiobook,
    chapters,
    currentChapterIndex,
    isPlaying,
    play,
    pause,
    seek,
  } = usePlayer();

  const audiobookId = route.params?.audiobookId ?? 'pather-panchali';
  const audiobook = activeAudiobook ?? (FIGMA_AUDIOBOOKS.find((b) => b.id === audiobookId) ?? FIGMA_AUDIOBOOKS[0]);

  const [playbackSpeed, setPlaybackSpeed] = useState('1.0x');
  const [sleepTimer, setSleepTimer] = useState('30m');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);

  // Playback position state
  const [positionSeconds, setPositionSeconds] = useState(1458); // 24:18
  const durationSeconds = 2530; // 42:10

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const currentChapter = chapters[currentChapterIndex] ?? {
    chapter_number: 4,
    title: 'নিশ্চিন্দিপুর',
  };

  const handleTogglePlay = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await play();
    }
  };

  const handleRewind = () => {
    setPositionSeconds((prev) => Math.max(0, prev - 15));
  };

  const handleForward = () => {
    setPositionSeconds((prev) => Math.min(durationSeconds, prev + 15));
  };

  const handleProgressBarPress = (evt: any) => {
    // Seek based on relative click
    const newSecs = Math.min(durationSeconds, Math.max(0, positionSeconds + 60));
    setPositionSeconds(newSecs);
  };

  const actionItems: ActionItem[] = [
    {
      id: 'chapters',
      label: 'Chapters',
      onPress: () => nav.navigate('ChaptersQueue', { audiobookId: audiobook.id }),
    },
    {
      id: 'queue',
      label: 'Queue',
      onPress: () => nav.navigate('ChaptersQueue', { audiobookId: audiobook.id }),
    },
    {
      id: 'bookmark',
      label: isBookmarked ? 'Bookmarked' : 'Bookmark',
      active: isBookmarked,
      onPress: () => {
        setIsBookmarked((prev) => !prev);
        Alert.alert('বুকমার্ক', `${formatTime(positionSeconds)} সময়ে বুকমার্ক সংরক্ষণ করা হয়েছে।`);
      },
    },
    {
      id: 'offline',
      label: isOfflineSaved ? 'Downloaded' : 'Offline',
      active: isOfflineSaved,
      onPress: () => {
        setIsOfflineSaved((prev) => !prev);
        Alert.alert('অফলাইন', 'অডিওবুকটি অ্যাপের ভেতরে অফলাইনে সংরক্ষিত হয়েছে।');
      },
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader

        title="Now playing"
        subtitle={audiobook.title}
        alignCenter
        onBack={() => nav.goBack()}
        onOptionsPress={() => setSettingsModalVisible(true)}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Large Album Artwork */}
        <View style={styles.artworkContainer}>
          <Image
            source={{
              uri:
                audiobook.cover_image_url ??
                'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800',
            }}
            style={styles.artwork}
            resizeMode="cover"
          />
        </View>


        {/* Book Title */}
        <Text style={styles.bookTitle}>{audiobook.title}</Text>

        {/* Chapter Info & Timestamps */}
        <View style={styles.infoRow}>
          <Text style={styles.chapterSubtitle}>
            অধ্যায় {currentChapter.chapter_number} · {currentChapter.title}
          </Text>
          <Text style={styles.timeCounter}>
            {formatTime(positionSeconds)} / {formatTime(durationSeconds)}
          </Text>
        </View>

        {/* Progress Bar */}
        <Pressable style={styles.progressBarWrapper} onPress={handleProgressBarPress}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${(positionSeconds / durationSeconds) * 100}%` },
              ]}
            />
          </View>
        </Pressable>

        {/* Control Bar: Speed · Rewind · Play/Pause · Forward · Sleep Timer */}
        <View style={styles.controlsRow}>
          {/* Speed Toggle */}
          <Pressable
            style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Text style={styles.speedText}>{playbackSpeed}</Text>
          </Pressable>

          {/* Rewind 15s */}
          <Pressable
            style={({ pressed }) => [styles.iconControlButton, pressed && styles.pressed]}
            onPress={handleRewind}
          >
            <Text style={styles.rewindIcon}>↺</Text>
            <Text style={styles.rewindSubText}>15</Text>
          </Pressable>

          {/* Main Play/Pause Button */}
          <Pressable
            style={({ pressed }) => [styles.mainPlayButton, pressed && styles.mainPlayPressed]}
            onPress={handleTogglePlay}
          >
            <Text style={styles.mainPlayIcon}>{isPlaying ? '❚❚' : '▶'}</Text>
          </Pressable>

          {/* Forward 15s */}
          <Pressable
            style={({ pressed }) => [styles.iconControlButton, pressed && styles.pressed]}
            onPress={handleForward}
          >
            <Text style={styles.forwardIcon}>↻</Text>
            <Text style={styles.forwardSubText}>15</Text>
          </Pressable>

          {/* Sleep Timer Moon */}
          <Pressable
            style={({ pressed }) => [styles.toolButton, pressed && styles.pressed]}
            onPress={() => setSettingsModalVisible(true)}
          >
            <Text style={styles.moonIcon}>☾</Text>
          </Pressable>
        </View>

        {/* Bottom Action Bar: Chapters · Queue · Bookmark · Offline */}
        <View style={styles.actionPillWrapper}>
          <ActionPillBar items={actionItems} />
        </View>
      </ScrollView>

      {/* Speed & Sleep Timer Modal Bottom Sheet (Plate 5 Screen 3) */}
      <ModalBottomSheet
        visible={settingsModalVisible}
        onClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Playback settings</Text>

          {/* Speed Section */}
          <Text style={styles.settingsLabel}>Speed</Text>
          <View style={styles.chipsRow}>
            {['0.75x', '1.0x', '1.25x', '1.5x', '2.0x'].map((s) => {
              const isSelected = playbackSpeed === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setPlaybackSpeed(s)}
                  style={[
                    styles.settingChip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingChipText,
                      isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                    ]}
                  >
                    {isSelected ? `✓ ${s}` : s}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Sleep Timer Section */}
          <Text style={styles.settingsLabel}>Sleep timer</Text>
          <View style={styles.chipsRow}>
            {['15m', '30m', '45m', 'Chapter end'].map((t) => {
              const isSelected = sleepTimer === t;
              return (
                <Pressable
                  key={t}
                  onPress={() => setSleepTimer(t)}
                  style={[
                    styles.settingChip,
                    isSelected ? styles.chipSelected : styles.chipUnselected,
                  ]}
                >
                  <Text
                    style={[
                      styles.settingChipText,
                      isSelected ? styles.chipTextSelected : styles.chipTextUnselected,
                    ]}
                  >
                    {isSelected ? `✓ ${t}` : t}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Save Button */}
          <ShrutiButton
            label="সংরক্ষণ"
            onPress={() => setSettingsModalVisible(false)}
            variant="primary"
          />
        </View>
      </ModalBottomSheet>

      {/* Android edge-to-edge indicator bar */}
      <View style={styles.bottomBarContainer}>
        <View style={styles.homeIndicator} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  artworkContainer: {
    width: '100%',
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
  artwork: {
    width: '100%',
    height: '100%',
  },
  bookTitle: {
    fontSize: FontSizes.xl + 2,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  infoRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs + 2,
    marginBottom: Spacing.xs,
  },
  chapterSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  timeCounter: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  progressBarWrapper: {
    width: '100%',
    paddingVertical: Spacing.sm,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5DFD7',
    borderRadius: Radius.full,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: Spacing.md,
  },
  toolButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  iconControlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
    width: 64,
    height: 64,
    borderRadius: 32,
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
  moonIcon: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
  actionPillWrapper: {
    width: '100%',
    marginTop: Spacing.xs,
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
  settingChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: Colors.surfaceDark,
  },
  chipUnselected: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  settingChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextUnselected: {
    color: Colors.textPrimary,
  },
  bottomBarContainer: {
    alignItems: 'center',
    paddingBottom: Spacing.xs,
  },
  homeIndicator: {
    width: 120,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: '#000000',
  },
});
