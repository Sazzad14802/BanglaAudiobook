/**
 * HomeScreen — personal start page: greeting, a featured new release,
 * "Continue listening" from real playback history, and the latest catalog.
 * All content comes from the Platform API.
 */

import React, { useCallback } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { EditorialHeroCard } from '../../components/EditorialHeroCard';
import { AudiobookCard } from '../../components/AudiobookCard';
import { SectionHeader } from '../../components/SectionHeader';
import { StateView } from '../../components/StateView';
import { audiobooksApi } from '../../api/audiobooks';
import { playbackApi } from '../../api/playback';
import { errorMessage } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useResource } from '../../hooks/useResource';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { Audiobook } from '../../types/audiobook';
import { formatDuration, greetingPeriod } from '../../utils/format';
import { Colors, Spacing } from '../../theme';

const GREETING_KEYS = {
  morning: 'greetingMorning',
  afternoon: 'greetingAfternoon',
  evening: 'greetingEvening',
  night: 'greetingEvening',
} as const;

export function HomeScreen() {
  const { navigation } = useAppNavigation();
  const { loadAudiobook } = usePlayer();
  const { user } = useAuth();
  const { t, tx } = useLanguage();
  const { unreadCount, refreshUnread } = useNotifications();

  const catalog = useResource(() => audiobooksApi.list({ size: 20 }));
  const recent = useResource(() =>
    user?.account_type === 'admin' ? Promise.resolve([]) : playbackApi.recent(),
  );

  const onRefresh = useCallback(async () => {
    await Promise.all([catalog.refresh(), recent.refresh(), refreshUnread()]);
  }, [catalog, recent, refreshUnread]);

  const openBook = (book: Audiobook) => navigation.navigate('AudiobookDetails', { audiobookId: book.id });

  const playBook = async (book: Audiobook) => {
    try {
      await loadAudiobook(book);
      navigation.navigate('Player');
    } catch (error) {
      Alert.alert(tx('চালানো যায়নি', 'Could not play'), errorMessage(error));
    }
  };

  const books = catalog.data?.items ?? [];
  const featured = books[0];
  const latest = books.slice(1);
  const continueItems = (recent.data ?? []).filter((r) => r.progress_percent < 99).slice(0, 5);
  const firstName = (user?.full_name || user?.username || '').split(' ')[0];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        showLogo
        title={t(GREETING_KEYS[greetingPeriod()], { name: firstName })}
        subtitle={t('greetingQuestion')}
        rightIcon="🔔"
        rightIconLabel={tx('নোটিফিকেশন', 'Notifications')}
        onRightIconPress={() => navigation.navigate('Notifications')}
        badgeCount={unreadCount}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={catalog.isRefreshing || recent.isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {catalog.isLoading ? (
          <StateView kind="loading" />
        ) : catalog.error && !books.length ? (
          <StateView
            kind="error"
            title={tx('ক্যাটালগ লোড করা যায়নি', 'Could not load the catalog')}
            message={catalog.error}
            actionLabel={tx('আবার চেষ্টা করুন', 'Try again')}
            onAction={catalog.reload}
          />
        ) : (
          <>
            {featured ? (
              <View style={styles.section}>
                <EditorialHeroCard
                  title={featured.title}
                  badge={tx('নতুন সংযোজন', 'NEW RELEASE')}
                  meta={[featured.author, featured.duration_seconds ? formatDuration(featured.duration_seconds) : null]
                    .filter(Boolean)
                    .join(' · ')}
                  coverUrl={featured.cover_image_url}
                  onPress={() => openBook(featured)}
                />
              </View>
            ) : null}

            {continueItems.length > 0 ? (
              <View style={styles.section}>
                <SectionHeader
                  title={t('continueListeningSection')}
                  actionLabel={tx('লাইব্রেরি', 'Library')}
                  onAction={() => (navigation.getParent() as any)?.navigate('LibraryTab')}
                />
                {continueItems.map((item) => (
                  <AudiobookCard
                    key={item.audiobook.id}
                    audiobook={item.audiobook}
                    progressPercent={item.progress_percent}
                    onPress={() => openBook(item.audiobook)}
                    onPlayPress={() => playBook(item.audiobook)}
                  />
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <SectionHeader
                title={tx('নতুন অডিওবুক', 'New audiobooks')}
                actionLabel={tx('সব দেখুন', 'See all')}
                onAction={() => (navigation.getParent() as any)?.navigate('ExploreTab')}
              />
              {books.length === 0 ? (
                <StateView
                  kind="empty"
                  compact
                  title={tx('এখনো কোনো অডিওবুক প্রকাশিত হয়নি', 'No audiobooks published yet')}
                  message={tx(
                    'প্রকাশকরা অডিওবুক প্রকাশ করলে এখানে দেখা যাবে।',
                    'Published audiobooks will appear here.',
                  )}
                />
              ) : (
                (latest.length ? latest : books).map((book) => (
                  <AudiobookCard
                    key={book.id}
                    audiobook={book}
                    onPress={() => openBook(book)}
                    onPlayPress={() => playBook(book)}
                  />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
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
  },
  section: {
    marginBottom: Spacing.lg,
  },
});
