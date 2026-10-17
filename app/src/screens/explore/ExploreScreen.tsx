/**
 * ExploreScreen — browse the public catalog by genre, language and access tier.
 * Filters map directly to API query parameters; results page in on demand.
 */

import React, { useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { AudiobookCard } from '../../components/AudiobookCard';
import { Chip, ChipGroup } from '../../components/Chip';
import { StateView } from '../../components/StateView';
import { AppButton } from '../../components/AppButton';
import { audiobooksApi } from '../../api/audiobooks';
import { errorMessage } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useResource } from '../../hooks/useResource';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { GENRES } from '../../constants/genres';
import { AccessTier, Audiobook, AudiobookListResponse } from '../../types/audiobook';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

const PAGE_SIZE = 20;

export function ExploreScreen() {
  const { navigation } = useAppNavigation();
  const { loadAudiobook } = usePlayer();
  const { t, tx, isEnglish } = useLanguage();

  const [genre, setGenre] = useState('all');
  const [language, setLanguage] = useState('all');
  const [tier, setTier] = useState<'all' | AccessTier>('all');
  const [extra, setExtra] = useState<Audiobook[]>([]);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  const filters = {
    genre: genre === 'all' ? undefined : genre,
    language: language === 'all' ? undefined : language,
    access_tier: tier === 'all' ? undefined : tier,
  };

  const first = useResource<AudiobookListResponse>(async () => {
    setExtra([]);
    setPage(1);
    return audiobooksApi.list({ ...filters, page: 1, size: PAGE_SIZE });
  }, [genre, language, tier]);

  const books = [...(first.data?.items ?? []), ...extra];
  const hasMore = !!first.data && page < first.data.pages;

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await audiobooksApi.list({ ...filters, page: page + 1, size: PAGE_SIZE });
      setExtra((current) => [...current, ...next.items]);
      setPage(page + 1);
    } catch (error) {
      Alert.alert(tx('লোড করা যায়নি', 'Could not load more'), errorMessage(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const playBook = async (book: Audiobook) => {
    try {
      await loadAudiobook(book);
      navigation.navigate('Player');
    } catch (error) {
      Alert.alert(tx('চালানো যায়নি', 'Could not play'), errorMessage(error));
    }
  };

  const header = (
    <View style={styles.headerBlock}>
      <Pressable
        style={({ pressed }) => [styles.searchBar, pressed && styles.pressed]}
        onPress={() => navigation.navigate('SearchResults', {})}
        accessibilityRole="search"
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>{t('searchPlaceholder')}</Text>
      </Pressable>

      <ChipGroup
        scrollable
        value={genre}
        onChange={setGenre}
        options={[
          { value: 'all', label: tx('সব', 'All') },
          ...GENRES.map((g) => ({ value: g.key, label: isEnglish ? g.en : g.bn })),
        ]}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        <Chip label={tx('সব ভাষা', 'All languages')} selected={language === 'all'} onPress={() => setLanguage('all')} />
        <Chip label="বাংলা" selected={language === 'bn'} onPress={() => setLanguage('bn')} />
        <Chip label="English" selected={language === 'en'} onPress={() => setLanguage('en')} />
        <View style={styles.divider} />
        <Chip
          label={tx('ফ্রি', 'Free')}
          selected={tier === 'free'}
          onPress={() => setTier(tier === 'free' ? 'all' : 'free')}
        />
        <Chip
          label={tx('প্রিমিয়াম', 'Premium')}
          selected={tier === 'premium'}
          onPress={() => setTier(tier === 'premium' ? 'all' : 'premium')}
        />
      </ScrollView>
      {first.data ? (
        <Text style={styles.count}>{tx(`${first.data.total}টি অডিওবুক`, `${first.data.total} audiobooks`)}</Text>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={t('exploreTitle')} subtitle={t('exploreSub')} />
      <FlatList
        data={books}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={header}
        refreshControl={
          <RefreshControl refreshing={first.isRefreshing} onRefresh={first.refresh} tintColor={Colors.primary} />
        }
        renderItem={({ item }) => (
          <AudiobookCard
            audiobook={item}
            onPress={() => navigation.navigate('AudiobookDetails', { audiobookId: item.id })}
            onPlayPress={() => playBook(item)}
          />
        )}
        ListEmptyComponent={
          first.isLoading ? (
            <StateView kind="loading" />
          ) : first.error ? (
            <StateView kind="error" message={first.error} actionLabel={tx('আবার চেষ্টা', 'Retry')} onAction={first.reload} />
          ) : (
            <StateView
              kind="empty"
              title={t('noResultsTitle')}
              message={tx('অন্য ফিল্টার বেছে দেখুন।', 'Try a different filter.')}
            />
          )
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              <AppButton
                label={tx('আরও দেখুন', 'Load more')}
                onPress={loadMore}
                isLoading={loadingMore}
                variant="secondary"
              />
            </View>
          ) : null
        }
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
  },
  headerBlock: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  searchBar: {
    height: 48,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  pressed: {
    opacity: 0.8,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.surfaceBorder,
  },
  count: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  footer: {
    marginTop: Spacing.md,
  },
});
