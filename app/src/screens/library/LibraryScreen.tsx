/**
 * LibraryScreen — user's saved audiobooks with playback progress.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { libraryApi } from '../../api/library';
import { LibraryItem } from '../../types/library';
import { AudiobookCard } from '../../components/AudiobookCard';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { LibraryStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Spacing } from '../../theme';
import { ApiError } from '../../api/client';

type Nav = NativeStackNavigationProp<LibraryStackParamList, 'Library'>;

export function LibraryScreen() {
  const nav = useNavigation<Nav>();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await libraryApi.list(1, 50);
      setItems(data.items);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to load library.');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  async function handleRemove(audiobookId: string) {
    Alert.alert('Remove from Library', 'Are you sure you want to remove this audiobook from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await libraryApi.remove(audiobookId);
            setItems((prev) => prev.filter((i) => i.audiobook_id !== audiobookId));
          } catch {
            Alert.alert('Error', 'Failed to remove from library.');
          }
        },
      },
    ]);
  }

  if (isLoading) return <Loading fullScreen message="Loading library..." />;

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AudiobookCard
            audiobook={item.audiobook}
            onPress={() => nav.navigate('AudiobookDetails', { audiobookId: item.audiobook_id })}
            subtitle={`Added on ${new Date(item.added_at).toLocaleDateString()}`}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>My Library</Text>
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="📚"
            title="Your Library is Empty"
            subtitle="Discover public audiobooks and add them to your library."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl,
    flexGrow: 1,
  },
  listHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
  },
  errorText: {
    color: Colors.error,
    fontSize: FontSizes.sm,
    marginTop: 4,
  },
});
