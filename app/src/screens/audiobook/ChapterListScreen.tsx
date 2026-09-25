/**
 * ChapterListScreen — standalone chapter list with playback entry.
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { audiobooksApi } from '../../api/audiobooks';
import { Chapter } from '../../types/chapter';
import { Audiobook } from '../../types/audiobook';
import { ChapterItem } from '../../components/ChapterItem';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { usePlayer } from '../../contexts/PlayerContext';
import { playbackApi } from '../../api/playback';
import { HomeStackParamList } from '../../navigation/types';
import { Colors, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'ChapterList'>;
type Route = RouteProp<HomeStackParamList, 'ChapterList'>;

export function ChapterListScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { loadAudiobook, currentChapterIndex, audiobook: playingBook } = usePlayer();

  const [audiobook, setAudiobook] = useState<Audiobook | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      audiobooksApi.get(params.audiobookId),
      audiobooksApi.listChapters(params.audiobookId),
    ])
      .then(([ab, chs]) => {
        setAudiobook(ab);
        setChapters(chs);
      })
      .finally(() => setIsLoading(false));
  }, [params.audiobookId]);

  async function handleChapterPress(index: number) {
    if (!audiobook) return;
    const progress = await playbackApi.get(audiobook.id).catch(() => null);
    const startPos =
      index === (progress?.chapter_id
        ? chapters.findIndex((c) => c.id === progress.chapter_id)
        : -1)
        ? (progress?.position_seconds ?? 0)
        : 0;
    await loadAudiobook(audiobook, chapters, index, startPos);
    nav.navigate('Player', { audiobookId: audiobook.id });
  }

  if (isLoading) return <Loading fullScreen />;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {chapters.length === 0 ? (
        <EmptyState icon="📖" title="No Chapters Available" subtitle="Chapters will appear once generation is complete." />
      ) : (
        <View style={styles.list}>
          {chapters.map((ch, idx) => (
            <ChapterItem
              key={ch.id}
              chapter={ch}
              isActive={
                playingBook?.id === params.audiobookId && idx === currentChapterIndex
              }
              onPress={() => handleChapterPress(idx)}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl, flexGrow: 1 },
  list: { gap: 4 },
});
