/**
 * ChaptersQueueScreen — Chapters and Queue matching Figma Plate 5 Screen 2.
 * Downloaded chapters list, active Now playing highlight card, Up next queue, Reorder button.
 */

import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChapterItemData {
  id: string;
  number: string;
  title: string;
  duration: string;
  status: string;
  isPlaying?: boolean;
}

export function ChaptersQueueScreen() {
  const nav = useNavigation();
  const { t, isEnglish } = useLanguage();

  const [chapters, setChapters] = useState<ChapterItemData[]>([
    {
      id: '1',
      number: isEnglish ? '1' : '১',
      title: isEnglish ? 'Nishchindipur' : 'নিশ্চিন্দিপুর',
      duration: '38 min',
      status: t('tabDownloaded'),
    },
    {
      id: '2',
      number: isEnglish ? '2' : '২',
      title: isEnglish ? 'Durga' : 'দুর্গা',
      duration: '39 min',
      status: t('tabDownloaded'),
    },
    {
      id: '3',
      number: isEnglish ? '3' : '৩',
      title: isEnglish ? 'Indir Thakrun' : 'ইন্দির ঠাকরুন',
      duration: '40 min',
      status: t('tabDownloaded'),
    },
    {
      id: '4',
      number: isEnglish ? '4' : '৪',
      title: isEnglish ? 'Durer Railgari' : 'দূরের রেলগাড়ি',
      duration: '41 min',
      status: t('playerNowPlaying'),
      isPlaying: true,
    },
  ]);

  const [queueCleared, setQueueCleared] = useState(false);

  const handleReorderOrClear = () => {
    Alert.alert(
      t('queueOptionsTitle'),
      t('queueOptionsMessage'),
      [
        {
          text: t('btnClearQueue'),
          style: 'destructive',
          onPress: () => setQueueCleared(true),
        },
        { text: t('btnOk'), style: 'cancel' },
      ]
    );
  };

  const handleSelectChapter = (chapter: ChapterItemData) => {
    setChapters((prev) =>
      prev.map((c) => ({
        ...c,
        isPlaying: c.id === chapter.id,
        status: c.id === chapter.id ? t('playerNowPlaying') : t('tabDownloaded'),
      }))
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader
        title={t('chaptersQueueTitle')}
        subtitle={t('chaptersQueueSub', { count: 12, next: 4 })}
        onBack={() => nav.goBack()}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Chapters List */}
        <View style={styles.chaptersList}>
          {chapters.map((chapter) => {
            const isPlaying = chapter.isPlaying;
            return (
              <Pressable
                key={chapter.id}
                onPress={() => handleSelectChapter(chapter)}
                style={({ pressed }) => [
                  styles.chapterCard,
                  isPlaying ? styles.chapterCardPlaying : styles.chapterCardDefault,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.chapterTitle,
                    isPlaying && styles.chapterTitlePlaying,
                  ]}
                >
                  {chapter.number} · {chapter.title}
                </Text>
                <Text
                  style={[
                    styles.chapterStatus,
                    isPlaying && styles.chapterStatusPlaying,
                  ]}
                >
                  {chapter.duration} · {chapter.status}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Up Next Section */}
        {!queueCleared && (
          <View style={styles.upNextCard}>
            <Text style={styles.upNextTitle}>{t('upNextSection')}</Text>
            <Text style={styles.upNextSub}>
              {isEnglish
                ? 'Shesher Kobita → Chander Pahar → Gitanjali'
                : 'শেষের কবিতা → চাঁদের পাহাড় → গীতাঞ্জলি'}
            </Text>
          </View>
        )}

        {/* Reorder / Clear Queue Button */}
        <Pressable
          style={({ pressed }) => [styles.reorderButton, pressed && styles.pressed]}
          onPress={handleReorderOrClear}
        >
          <Text style={styles.reorderButtonText}>{t('reorderClearQueue')}</Text>
        </Pressable>
      </ScrollView>

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
    gap: Spacing.md,
  },
  chaptersList: {
    gap: Spacing.sm,
  },
  chapterCard: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.lg,
  },
  chapterCardDefault: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chapterCardPlaying: {
    backgroundColor: Colors.tintPeachActive, // soft peach highlight from Figma
    borderWidth: 1,
    borderColor: '#F5C6BC',
  },
  pressed: {
    opacity: 0.8,
  },
  chapterTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  chapterTitlePlaying: {
    color: '#8A2A17',
  },
  chapterStatus: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
  },
  chapterStatusPlaying: {
    color: '#A8442E',
    fontWeight: '600',
  },
  upNextCard: {
    backgroundColor: Colors.tintBlue,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  upNextTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: Colors.tintBlueText,
    marginBottom: 3,
  },
  upNextSub: {
    fontSize: FontSizes.xs,
    color: Colors.tintBlueText,
    lineHeight: 18,
  },
  reorderButton: {
    height: 50,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reorderButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
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
