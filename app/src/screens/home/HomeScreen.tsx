/**
 * HomeScreen — public audiobook discovery.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { audiobooksApi } from '../../api/audiobooks';
import { Audiobook, AudiobookListResponse } from '../../types/audiobook';
import { AudiobookCard } from '../../components/AudiobookCard';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { HomeStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Home'>;

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [audiobooks, setAudiobooks] = useState<Audiobook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      const data: AudiobookListResponse = await audiobooksApi.list(pageNum, 20);
      if (replace) {
        setAudiobooks(data.items);
      } else {
        setAudiobooks((prev) => [...prev, ...data.items]);
      }
      setHasMore(pageNum < data.pages);
      setError(null);
    } catch {
      setError('Failed to load audiobooks.');
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchPage(1, true).finally(() => setIsLoading(false));
  }, [fetchPage]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPage(1);
    await fetchPage(1, true);
    setIsRefreshing(false);
  }, [fetchPage]);

  const onEndReached = useCallback(async () => {
    if (!hasMore || isFetchingMore) return;
    const nextPage = page + 1;
    setIsFetchingMore(true);
    setPage(nextPage);
    await fetchPage(nextPage, false);
    setIsFetchingMore(false);
  }, [hasMore, isFetchingMore, page, fetchPage]);

  if (isLoading) return <Loading fullScreen message="Discovering audiobooks..." />;

  if (error && audiobooks.length === 0) {
    return (
      <View style={styles.root}>
        <EmptyState
          icon="⚠️"
          title="Failed to Load"
          subtitle={error}
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={audiobooks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <AudiobookCard
            audiobook={item}
            onPress={() => nav.navigate('AudiobookDetails', { audiobookId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Public Audiobooks</Text>
            <Text style={styles.sectionSub}>Community-created Bangla audiobooks</Text>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="📭"
            title="No Audiobooks Yet"
            subtitle="No public audiobooks available. Be the first to create one!"
          />
        }
        ListFooterComponent={isFetchingMore ? <Loading message="Loading more..." /> : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.3}
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
  sectionSub: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    marginTop: 4,
  },
});
