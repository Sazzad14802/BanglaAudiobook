/**
 * ExploreScreen — Explore matching Figma Plate 3 Screen 2.
 * Search bar, category chips, curated banner, audiobooks list.
 */

import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ExploreStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { AudiobookCard } from '../../components/AudiobookCard';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { usePlayer } from '../../contexts/PlayerContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<ExploreStackParamList, 'Explore'>;

export function ExploreScreen() {
  const nav = useNavigation<Nav>();
  const { loadAudiobook } = usePlayer();
  const { t, isEnglish } = useLanguage();

  const categories = isEnglish
    ? ['Literature', 'Mystery', 'Poetry', 'History']
    : ['সাহিত্য', 'রহস্য', 'কবিতা', 'ইতিহাস'];

  const [activeCategory, setActiveCategory] = useState(categories[0]);

  const exploreBooks = FIGMA_AUDIOBOOKS.filter(
    (b) => b.id === 'neelkantha-pakhir-khoje' || b.id === 'chander-pahar'
  );

  const handleSearchFocus = () => {
    nav.navigate('SearchResults', { query: isEnglish ? 'Tagore' : 'রবীন্দ্রনাথ' });
  };

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
        title={t('exploreTitle')}
        subtitle={t('exploreSub')}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <Pressable style={styles.searchBar} onPress={handleSearchFocus}>
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchPlaceholder}>{t('searchPlaceholder')}</Text>
          <Text style={styles.micIcon}>🎙️</Text>
        </Pressable>

        {/* Category Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categories.map((cat) => {
            const isSelected = activeCategory === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setActiveCategory(cat)}
                style={[
                  styles.categoryChip,
                  isSelected ? styles.categoryChipSelected : styles.categoryChipDefault,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    isSelected ? styles.chipTextSelected : styles.chipTextDefault,
                  ]}
                >
                  {isSelected ? `✓ ${cat}` : cat}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Curated Highlight Card */}
        <View style={styles.curatedCard}>
          <Text style={styles.curatedTitle}>
            {isEnglish ? 'Stories of the Cities' : 'শহরের গল্প'}
          </Text>
          <Text style={styles.curatedSub}>
            {isEnglish
              ? 'Curated Kolkata, Dhaka & River narratives'
              : 'Curated Kolkata, Dhaka ও নদীর গল্প'}
          </Text>
        </View>

        {/* Audiobooks List */}
        <View style={styles.listContainer}>
          {exploreBooks.map((book) => (
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
    gap: Spacing.md,
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
  searchIcon: {
    fontSize: 16,
    opacity: 0.6,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
  },
  micIcon: {
    fontSize: 18,
    opacity: 0.8,
  },
  categoriesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipSelected: {
    backgroundColor: Colors.surfaceDark,
  },
  categoryChipDefault: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  chipTextDefault: {
    color: Colors.textPrimary,
  },
  curatedCard: {
    backgroundColor: '#F8E8E1', // peach curated card from Figma
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  curatedTitle: {
    fontSize: FontSizes.md + 1,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  curatedSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
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
