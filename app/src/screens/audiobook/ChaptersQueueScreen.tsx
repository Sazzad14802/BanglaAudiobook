/**
 * ChaptersQueueScreen — every chapter of the loaded audiobook with the one
 * now playing highlighted and the remaining chapters shown as "up next".
 */

import React from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { StateView } from '../../components/StateView';
import { errorMessage } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { formatDuration } from '../../utils/format';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

export function ChaptersQueueScreen() {
  const { navigation } = useAppNavigation();
  const { t, tx } = useLanguage();
  const { audiobook, chapters, currentChapterIndex, isPlaying, selectChapter } = usePlayer();

  const remaining = chapters
    .slice(currentChapterIndex + 1)
    .reduce((sum, c) => sum + (c.duration_seconds || 0), 0);

  const choose = async (index: number) => {
    try {
      await selectChapter(index);
      navigation.goBack();
    } catch (error) {
      Alert.alert(tx('চালানো যায়নি', 'Could not play'), errorMessage(error));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={t('chaptersQueueTitle')}
        subtitle={audiobook ? audiobook.title : undefined}
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={chapters}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          chapters.length ? (
            <Text style={styles.summary}>
              {tx(
                `${chapters.length}টি অধ্যায় · বাকি ${formatDuration(remaining)}`,
                `${chapters.length} chapters · ${formatDuration(remaining)} left after this`,
              )}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <StateView kind="empty" title={tx('কোনো অধ্যায় নেই', 'No chapters loaded')} />
        }
        renderItem={({ item, index }) => {
          const current = index === currentChapterIndex;
          const played = index < currentChapterIndex;
          return (
            <Pressable
              onPress={() => choose(index)}
              style={({ pressed }) => [styles.card, current && styles.cardCurrent, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ selected: current }}
            >
              <Text style={[styles.number, current && styles.numberCurrent]}>
                {current ? (isPlaying ? '▶' : '❚❚') : item.chapter_number}
              </Text>
              <View style={styles.textColumn}>
                <Text style={[styles.title, played && styles.titlePlayed]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.meta}>
                  {formatDuration(item.duration_seconds)}
                  {current ? ` · ${t('playerNowPlaying')}` : played ? ` · ${tx('শোনা হয়েছে', 'Played')}` : ''}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  summary: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  cardCurrent: {
    backgroundColor: Colors.tintActive,
    borderColor: Colors.primaryLight,
  },
  pressed: {
    opacity: 0.75,
  },
  number: {
    width: 26,
    textAlign: 'center',
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  numberCurrent: {
    color: Colors.primary,
  },
  textColumn: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  titlePlayed: {
    color: Colors.textSecondary,
  },
  meta: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
});
