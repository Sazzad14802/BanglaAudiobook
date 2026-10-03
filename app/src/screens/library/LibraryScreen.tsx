/**
 * LibraryScreen — My Library matching Figma design system.
 * Saved books, playlists, and offline downloaded audiobooks.
 */

import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LibraryStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { AudiobookCard } from '../../components/AudiobookCard';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { usePlayer } from '../../contexts/PlayerContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<LibraryStackParamList, 'Library'>;

export function LibraryScreen() {
  const nav = useNavigation<Nav>();
  const { loadAudiobook } = usePlayer();

  const [activeTab, setActiveTab] = useState<'saved' | 'playlists' | 'offline'>('saved');

  const savedBooks = FIGMA_AUDIOBOOKS.slice(0, 3);
  const offlineBooks = [FIGMA_AUDIOBOOKS[0]]; // Pather Panchali offline

  const handleBookPress = (audiobookId: string) => {
    nav.navigate('AudiobookDetails', { audiobookId });
  };

  const handlePlayBook = async (book: any) => {
    await loadAudiobook(book);
    nav.navigate('Player', { audiobookId: book.id });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ShrutiHeader
        title="লাইব্রেরি"
        subtitle="সংরক্ষিত ও অফলাইন বই"
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Subtabs Selector */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setActiveTab('saved')}
            style={[styles.tabButton, activeTab === 'saved' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === 'saved' && styles.tabTextActive]}>
              সংরক্ষিত ({savedBooks.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('playlists')}
            style={[styles.tabButton, activeTab === 'playlists' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === 'playlists' && styles.tabTextActive]}>
              প্লেলিস্ট
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab('offline')}
            style={[styles.tabButton, activeTab === 'offline' && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === 'offline' && styles.tabTextActive]}>
              অফলাইন (১)
            </Text>
          </Pressable>
        </View>

        {/* Offline Notice if in Offline Tab */}
        {activeTab === 'offline' && (
          <View style={styles.offlineNotice}>
            <Text style={styles.offlineTitle}>Offline Mode Active</Text>
            <Text style={styles.offlineSub}>
              শুধু ডাউনলোড করা বইগুলো ইন্টারনেট সংযোগ ছাড়া শোনা যাবে।
            </Text>
          </View>
        )}

        {/* Audiobooks List */}
        {activeTab === 'playlists' ? (
          <View style={styles.playlistContainer}>
            <View style={styles.playlistCard}>
              <Text style={styles.playlistTitle}>প্রিয় গল্প সংকলন</Text>
              <Text style={styles.playlistSub}>৩টি অডিওবুক · ব্যক্তিগত প্লেলিস্ট</Text>
            </View>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {(activeTab === 'saved' ? savedBooks : offlineBooks).map((book) => (
              <AudiobookCard
                key={book.id}
                audiobook={book}
                onPress={() => handleBookPress(book.id)}
                onPlayPress={() => handlePlayBook(book)}
              />
            ))}
          </View>
        )}
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: 3,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.xs + 3,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabButtonActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  tabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  offlineNotice: {
    backgroundColor: Colors.tintAmber,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  offlineTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.tintAmberText,
    marginBottom: 2,
  },
  offlineSub: {
    fontSize: FontSizes.xs,
    color: Colors.tintAmberText,
  },
  playlistContainer: {
    gap: Spacing.sm,
  },
  playlistCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  playlistTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  playlistSub: {
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
