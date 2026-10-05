/**
 * HomeScreen — Discovery matching Figma Plate 3 Screen 1.
 * Features:
 * - Proper notch-safe edge handling (react-native-safe-area-context)
 * - Real live fetching from FastAPI backend & PostgreSQL database (Repository Pattern)
 * - Fallback to curated Figma classics if offline or disconnected
 * - Pull-to-refresh
 * - Playback integration via usePlayer facade
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { EditorialHeroCard } from '../../components/EditorialHeroCard';
import { AudiobookCard } from '../../components/AudiobookCard';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { audiobooksApi } from '../../api/audiobooks';
import { Audiobook } from '../../types/audiobook';
import { usePlayer } from '../../contexts/PlayerContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { loadAudiobook } = usePlayer();

  const [audiobooks, setAudiobooks] = useState<Audiobook[]>(FIGMA_AUDIOBOOKS);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Repository Pattern: Fetch from live backend
  const loadData = useCallback(async () => {
    try {
      const res = await audiobooksApi.list(1, 20);
      if (res && res.items && res.items.length > 0) {
        setAudiobooks(res.items);
      }
    } catch (e) {
      // Gracefully fall back to local seed data if network is unreachable
      console.log('Using local fallback audiobooks:', e);
      setAudiobooks(FIGMA_AUDIOBOOKS);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const featuredBook =
    audiobooks.find((b) => b.title === 'পথের পাঁচালী') ?? audiobooks[0] ?? FIGMA_AUDIOBOOKS[0];

  const continueListeningBooks = audiobooks.filter((b) => b.id !== featuredBook.id).slice(0, 4);

  const handleBookPress = (audiobookId: string) => {
    nav.navigate('AudiobookDetails', { audiobookId });
  };

  const handlePlayBook = async (book: any) => {
    await loadAudiobook(book);
    nav.navigate('Player', { audiobookId: book.id });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader
        title="শুভ সন্ধ্যা, নাবিলা"
        subtitle="আজ কী শুনবেন?"
        onOptionsPress={() => nav.navigate('DiscoveryStates')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Featured Editorial Hero Card */}
        <View style={styles.heroSection}>
          <EditorialHeroCard
            title={featuredBook.title}
            meta="Editor's pick · 8h 42m"
            coverUrl={featuredBook.cover_image_url ?? undefined}
            onPress={() => handleBookPress(featuredBook.id)}
          />
        </View>

        {/* Section: শোনা চালিয়ে যান */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>শোনা চালিয়ে যান</Text>
        </View>

        {/* Continue Listening List */}
        <View style={styles.listContainer}>
          {continueListeningBooks.map((book) => (
            <AudiobookCard
              key={book.id}
              audiobook={book}
              onPress={() => handleBookPress(book.id)}
              onPlayPress={() => handlePlayBook(book)}
            />
          ))}
        </View>
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
  },
  heroSection: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    marginBottom: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSizes.md + 1,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  listContainer: {
    gap: Spacing.xs,
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
