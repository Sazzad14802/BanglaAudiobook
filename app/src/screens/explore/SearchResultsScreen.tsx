/**
 * SearchResultsScreen — live search over title and author (debounced).
 */

import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AppHeader } from '../../components/AppHeader';
import { AudiobookCard } from '../../components/AudiobookCard';
import { StateView } from '../../components/StateView';
import { audiobooksApi } from '../../api/audiobooks';
import { errorMessage } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { ExploreStackParamList } from '../../navigation/types';
import { Audiobook } from '../../types/audiobook';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

const DEBOUNCE_MS = 350;

export function SearchResultsScreen() {
  const { navigation } = useAppNavigation();
  const route = useRoute<RouteProp<ExploreStackParamList, 'SearchResults'>>();
  const { loadAudiobook } = usePlayer();
  const { t, tx } = useLanguage();

  const [query, setQuery] = useState(route.params?.query ?? '');
  const [results, setResults] = useState<Audiobook[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');
  const latest = useRef(0);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setStatus('idle');
      return;
    }
    const requestId = ++latest.current;
    setStatus('loading');
    const timer = setTimeout(async () => {
      try {
        const page = await audiobooksApi.list({ q: term, size: 30 });
        if (requestId !== latest.current) return;
        setResults(page.items);
        setTotal(page.total);
        setStatus('done');
      } catch (e) {
        if (requestId !== latest.current) return;
        setError(errorMessage(e));
        setStatus('error');
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const playBook = async (book: Audiobook) => {
    try {
      await loadAudiobook(book);
      navigation.navigate('Player');
    } catch (e) {
      Alert.alert(tx('চালানো যায়নি', 'Could not play'), errorMessage(e));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader title={tx('খুঁজুন', 'Search')} onBack={() => navigation.goBack()} />

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder={t('searchPlaceholder')}
          placeholderTextColor={Colors.textMuted}
          autoFocus
          returnKeyType="search"
          autoCorrect={false}
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel={tx('মুছুন', 'Clear')}>
            <Text style={styles.clear}>×</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={results}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          status === 'done' && results.length ? (
            <Text style={styles.count}>{tx(`${total}টি ফলাফল`, `${total} results`)}</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <AudiobookCard
            audiobook={item}
            onPress={() => navigation.navigate('AudiobookDetails', { audiobookId: item.id })}
            onPlayPress={() => playBook(item)}
          />
        )}
        ListEmptyComponent={
          status === 'loading' ? (
            <StateView kind="loading" compact />
          ) : status === 'error' ? (
            <StateView kind="error" compact message={error} />
          ) : status === 'done' ? (
            <StateView
              kind="empty"
              compact
              title={t('noResultsTitle')}
              message={tx('অন্য শব্দ বা লেখকের নাম দিয়ে খুঁজুন।', 'Try another word or an author name.')}
            />
          ) : (
            <Text style={styles.hint}>
              {tx('বইয়ের নাম বা লেখকের নাম লিখুন', 'Type a title or an author name')}
            </Text>
          )
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
  searchBar: {
    height: 48,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  clear: {
    fontSize: 22,
    color: Colors.textMuted,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  count: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  hint: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    marginTop: Spacing.xl,
  },
});
