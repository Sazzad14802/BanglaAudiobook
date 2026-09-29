/**
 * AudiobookDetailsScreen
 * Shows full audiobook details, chapters, and owner controls.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { audiobooksApi } from '../../api/audiobooks';
import { libraryApi } from '../../api/library';
import { Audiobook } from '../../types/audiobook';
import { Loading } from '../../components/Loading';
import { useAuth } from '../../contexts/AuthContext';
import { usePlayer } from '../../contexts/PlayerContext';
import { HomeStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError } from '../../api/client';
import { playbackApi } from '../../api/playback';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AudiobookDetails'>;
type Route = RouteProp<HomeStackParamList, 'AudiobookDetails'>;

const STATUS_LABELS: Record<string, string> = {
  PENDING: '⏳ Queued',
  PROCESSING: '⚙️ Processing',
  COMPLETED: '✅ Ready',
  FAILED: '❌ Failed',
};

const LANGUAGE_LABELS: Record<string, string> = {
  bn: 'Bangla',
  en: 'English',
};

export function AudiobookDetailsScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { user } = useAuth();
  const { loadAudiobook } = usePlayer();

  const [audiobook, setAudiobook] = useState<Audiobook | null>(null);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOwner = user?.id === audiobook?.owner_id;
  const isCompleted = audiobook?.status === 'COMPLETED';

  const load = useCallback(async () => {
    try {
      const [ab, libRes] = await Promise.all([
        audiobooksApi.get(params.audiobookId),
        libraryApi.list().catch(() => ({ items: [] })),
      ]);
      setAudiobook(ab);
      setIsInLibrary(
        libRes.items.some((item) => item.audiobook_id === params.audiobookId),
      );
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to load audiobook.');
    } finally {
      setIsLoading(false);
    }
  }, [params.audiobookId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePlay() {
    if (!audiobook) return;
    try {
      const progress = await playbackApi.get(audiobook.id).catch(() => null);
      const startPosition = progress?.position_seconds ?? 0;
      await loadAudiobook(audiobook, startPosition);
      nav.navigate('Player', { audiobookId: audiobook.id });
    } catch {
      Alert.alert('Error', 'Failed to launch audio player.');
    }
  }

  async function handleLibraryToggle() {
    if (!audiobook) return;
    setIsLibraryLoading(true);
    try {
      if (isInLibrary) {
        await libraryApi.remove(audiobook.id);
        setIsInLibrary(false);
      } else {
        await libraryApi.add(audiobook.id);
        setIsInLibrary(true);
      }
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.detail : 'Failed to update library.');
    } finally {
      setIsLibraryLoading(false);
    }
  }

  async function handleVisibilityToggle() {
    if (!audiobook) return;
    const newVis = audiobook.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
    try {
      const updated = await audiobooksApi.updateVisibility(audiobook.id, { visibility: newVis });
      setAudiobook(updated);
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.detail : 'Failed to update visibility.');
    }
  }

  async function handleDelete() {
    Alert.alert('Delete Audiobook', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await audiobooksApi.delete(params.audiobookId);
            nav.goBack();
          } catch (err) {
            Alert.alert('Error', err instanceof ApiError ? err.detail : 'Failed to delete audiobook.');
          }
        },
      },
    ]);
  }

  if (isLoading) return <Loading fullScreen message="Loading audiobook..." />;
  if (error || !audiobook) {
    return (
      <View style={styles.root}>
        <Text style={styles.errorText}>{error ?? 'Audiobook not found.'}</Text>
      </View>
    );
  }

  const langLabel = LANGUAGE_LABELS[audiobook.language] ?? audiobook.language;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Cover */}
      <View style={styles.coverWrapper}>
        {audiobook.cover_image_url ? (
          <Image source={{ uri: audiobook.cover_image_url }} style={styles.cover} />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverEmoji}>🎧</Text>
          </View>
        )}
      </View>

      {/* Meta */}
      <View style={styles.meta}>
        <Text style={styles.title}>{audiobook.title}</Text>
        {audiobook.author ? (
          <Text style={styles.author}>{audiobook.author}</Text>
        ) : null}

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{langLabel}</Text>
          </View>
          <View style={[styles.badge, audiobook.visibility === 'PRIVATE' ? styles.badgePrivate : styles.badgePublic]}>
            <Text style={styles.badgeText}>
              {audiobook.visibility === 'PRIVATE' ? '🔒 Private' : '🌐 Public'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{STATUS_LABELS[audiobook.status]}</Text>
          </View>
          {audiobook.duration_seconds && audiobook.duration_seconds > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                ⏱ {Math.floor(audiobook.duration_seconds / 60) > 0 ? `${Math.floor(audiobook.duration_seconds / 60)}m ` : ''}{Math.round(audiobook.duration_seconds % 60)}s
              </Text>
            </View>
          ) : null}
        </View>

        {audiobook.description ? (
          <Text style={styles.description}>{audiobook.description}</Text>
        ) : null}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {isCompleted && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, pressed && styles.btnPressed]}
            onPress={handlePlay}
            accessibilityRole="button"
            accessibilityLabel="Play audiobook"
          >
            <Text style={styles.actionBtnTextPrimary}>▶ Listen</Text>
          </Pressable>
        )}

        {!isOwner && isCompleted && (
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.btnPressed]}
            onPress={handleLibraryToggle}
            disabled={isLibraryLoading}
            accessibilityRole="button"
          >
            <Text style={styles.actionBtnText}>
              {isInLibrary ? '📚 Remove from Library' : '+ Add to Library'}
            </Text>
          </Pressable>
        )}

        {isOwner && (
          <>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, pressed && styles.btnPressed]}
              onPress={handleVisibilityToggle}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnText}>
                {audiobook.visibility === 'PUBLIC' ? '🔒 Make Private' : '🌐 Make Public'}
              </Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnDanger, pressed && styles.btnPressed]}
              onPress={handleDelete}
              accessibilityRole="button"
            >
              <Text style={styles.actionBtnText}>🗑 Delete</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xl },
  errorText: {
    color: Colors.error,
    textAlign: 'center',
    margin: Spacing.xl,
    fontSize: FontSizes.base,
  },
  coverWrapper: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
  },
  cover: {
    width: 180,
    height: 180,
    borderRadius: Radius.md,
  },
  coverPlaceholder: {
    width: 180,
    height: 180,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmoji: { fontSize: 72 },
  meta: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    lineHeight: 30,
  },
  author: {
    color: Colors.textSecondary,
    fontSize: FontSizes.base,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  badge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  badgePublic: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  badgePrivate: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  badgeText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  description: {
    color: Colors.textSecondary,
    fontSize: FontSizes.base,
    lineHeight: 22,
    marginTop: Spacing.xs,
  },
  actions: {
    padding: Spacing.md,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },
  actionBtn: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  actionBtnPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
  },
  actionBtnDanger: {
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  btnPressed: { opacity: 0.75 },
  actionBtnText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  actionBtnTextPrimary: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  section: {
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
});
