/**
 * HomeScreen — Discovery matching Figma Plate 3 Screen 1.
 * Features greeting, editorial pick hero card, and 'শোনা চালিয়ে যান' list.
 */

import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { EditorialHeroCard } from '../../components/EditorialHeroCard';
import { AudiobookCard } from '../../components/AudiobookCard';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { usePlayer } from '../../contexts/PlayerContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const { loadAudiobook } = usePlayer();

  const featuredBook = FIGMA_AUDIOBOOKS.find((b) => b.id === 'pather-panchali') ?? FIGMA_AUDIOBOOKS[0];
  const continueListeningBooks = FIGMA_AUDIOBOOKS.filter(
    (b) => b.id === 'shesher-kobita' || b.id === 'hajar-bachhor-dhore'
  );

  const handleBookPress = (audiobookId: string) => {
    nav.navigate('AudiobookDetails', { audiobookId });
  };

  const handlePlayBook = async (audiobook: any) => {
    await loadAudiobook(audiobook);
    nav.navigate('Player', { audiobookId: audiobook.id });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ShrutiHeader
        title="শুভ সন্ধ্যা, নাবিলা"
        subtitle="আজ কী শুনবেন?"
        onOptionsPress={() => nav.navigate('DiscoveryStates')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
