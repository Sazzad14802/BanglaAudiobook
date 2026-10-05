/**
 * SearchResultsScreen — Search results & Filter modal matching Figma Plate 3 Screens 3 & 4.
 * Search bar, suggestions card, recent history card, results, filter/sort bottom sheet.
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

import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ExploreStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { AudiobookCard } from '../../components/AudiobookCard';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { ShrutiButton } from '../../components/ShrutiButton';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { usePlayer } from '../../contexts/PlayerContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<ExploreStackParamList, 'SearchResults'>;

export function SearchResultsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<any>();
  const { loadAudiobook } = usePlayer();

  const [query, setQuery] = useState(route.params?.query ?? 'রবীন্দ্রনাথ');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Filter chips state
  const [selectedFilters, setSelectedFilters] = useState<Record<string, boolean>>({
    bn: true,
    en: false,
    free: false,
    premium: true,
  });

  const [sortOption, setSortOption] = useState('আপনার জন্য');

  const rabindranathBooks = FIGMA_AUDIOBOOKS.filter(
    (b) => b.id === 'shesher-kobita' || b.id === 'gitanjali'
  );

  const toggleFilter = (key: string) => {
    setSelectedFilters((prev) => ({ ...prev, [key]: !prev[key] }));
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

        title="Search results"
        subtitle="Suggestion · history · results"
        onBack={() => nav.goBack()}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="বই, লেখক বা কণ্ঠ খুঁজুন"
            placeholderTextColor={Colors.textMuted}
          />
          <Text style={styles.micIcon}>🎙️</Text>
        </View>

        {/* Suggestions Card */}
        <View style={styles.suggestionsCard}>
          <Text style={styles.suggestionsTitle}>Suggestions</Text>
          <Text style={styles.suggestionsSub}>
            রবীন্দ্রনাথ ঠাকুর · শেষের কবিতা · গীতাঞ্জলি
          </Text>
        </View>

        {/* Recent History Card */}
        <View style={styles.historyCard}>
          <Text style={styles.historyTitle}>Recent history</Text>
          <Text style={styles.historySub}>
            পথের পাঁচালী · বাংলা কবিতা · রহস্য গল্প
          </Text>
        </View>

        {/* Search Results List */}
        <View style={styles.resultsList}>
          {rabindranathBooks.map((book) => (
            <AudiobookCard
              key={book.id}
              audiobook={book}
              onPress={() => handleBookPress(book.id)}
              onPlayPress={() => handlePlayBook(book)}
            />
          ))}
        </View>

        {/* Filter · 3 / Sort Button */}
        <View style={styles.filterButtonWrapper}>
          <Pressable
            style={({ pressed }) => [styles.filterButton, pressed && styles.pressed]}
            onPress={() => setFilterModalVisible(true)}
          >
            <Text style={styles.filterButtonText}>Filter · 3 / Sort</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Filter & Sort Modal Bottom Sheet (Plate 3 Screen 4) */}
      <ModalBottomSheet
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>ফিল্টার ও সাজান</Text>

          <Text style={styles.filterSectionTitle}>
            Language · Access · Length
          </Text>

          {/* Filter Chips Row */}
          <View style={styles.chipsRow}>
            {/* Bangla */}
            <Pressable
              onPress={() => toggleFilter('bn')}
              style={[
                styles.modalChip,
                selectedFilters.bn ? styles.chipDark : styles.chipNeutral,
              ]}
            >
              <Text
                style={[
                  styles.modalChipText,
                  selectedFilters.bn ? styles.textWhite : styles.textDark,
                ]}
              >
                {selectedFilters.bn ? '✓ বাংলা' : 'বাংলা'}
              </Text>
            </Pressable>

            {/* English */}
            <Pressable
              onPress={() => toggleFilter('en')}
              style={[
                styles.modalChip,
                selectedFilters.en ? styles.chipDark : styles.chipNeutral,
              ]}
            >
              <Text
                style={[
                  styles.modalChipText,
                  selectedFilters.en ? styles.textWhite : styles.textDark,
                ]}
              >
                {selectedFilters.en ? '✓ English' : 'English'}
              </Text>
            </Pressable>

            {/* Free */}
            <Pressable
              onPress={() => toggleFilter('free')}
              style={[
                styles.modalChip,
                selectedFilters.free ? styles.chipDark : styles.chipMint,
              ]}
            >
              <Text
                style={[
                  styles.modalChipText,
                  selectedFilters.free ? styles.textWhite : styles.textMint,
                ]}
              >
                {selectedFilters.free ? '✓ Free' : 'Free'}
              </Text>
            </Pressable>

            {/* Premium */}
            <Pressable
              onPress={() => toggleFilter('premium')}
              style={[
                styles.modalChip,
                selectedFilters.premium ? styles.chipDark : styles.chipPurple,
              ]}
            >
              <Text
                style={[
                  styles.modalChipText,
                  selectedFilters.premium ? styles.textWhite : styles.textPurple,
                ]}
              >
                {selectedFilters.premium ? '✓ Premium' : 'Premium'}
              </Text>
            </Pressable>
          </View>

          {/* Sort Option Container Card */}
          <View style={styles.sortCard}>
            <Text style={styles.sortCardTitle}>Sort: আপনার জন্য</Text>
            <Text style={styles.sortCardSub}>
              নতুন · সর্বাধিক শোনা · rating · duration
            </Text>
          </View>

          {/* Apply CTA Button */}
          <ShrutiButton
            label="২৪টি ফলাফল দেখুন"
            onPress={() => setFilterModalVisible(false)}
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
  input: {
    flex: 1,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  micIcon: {
    fontSize: 18,
    opacity: 0.8,
  },
  suggestionsCard: {
    backgroundColor: Colors.tintBlue,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  suggestionsTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: Colors.tintBlueText,
    marginBottom: 2,
  },
  suggestionsSub: {
    fontSize: FontSizes.xs,
    color: Colors.tintBlueText,
  },
  historyCard: {
    backgroundColor: '#F5EDE3',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  historyTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: '#6E5D46',
    marginBottom: 2,
  },
  historySub: {
    fontSize: FontSizes.xs,
    color: '#6E5D46',
  },
  resultsList: {
    gap: Spacing.xs,
  },
  filterButtonWrapper: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  filterButton: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    backgroundColor: Colors.surface,
  },
  filterButtonText: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pressed: {
    opacity: 0.8,
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
  filterSectionTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  modalChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipDark: {
    backgroundColor: Colors.surfaceDark,
  },
  chipNeutral: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  chipMint: {
    backgroundColor: Colors.tintGreen,
  },
  chipPurple: {
    backgroundColor: Colors.tintPurple,
  },
  modalChipText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textDark: {
    color: Colors.textPrimary,
  },
  textMint: {
    color: Colors.tintGreenText,
  },
  textPurple: {
    color: Colors.tintPurpleText,
  },
  sortCard: {
    backgroundColor: Colors.tintBlue,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  sortCardTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: Colors.tintBlueText,
    marginBottom: 2,
  },
  sortCardSub: {
    fontSize: FontSizes.xs,
    color: Colors.tintBlueText,
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
