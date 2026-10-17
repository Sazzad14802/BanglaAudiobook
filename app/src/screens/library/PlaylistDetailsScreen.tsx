/**
 * PlaylistDetailsScreen — books in one playlist; remove books or the playlist.
 */

import React from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AppHeader } from '../../components/AppHeader';
import { AudiobookCard } from '../../components/AudiobookCard';
import { StateView } from '../../components/StateView';
import { AppButton } from '../../components/AppButton';
import { playlistsApi } from '../../api/library';
import { errorMessage } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useResource } from '../../hooks/useResource';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { SharedStackParamList } from '../../navigation/types';
import { Audiobook } from '../../types/audiobook';
import { Colors, Spacing } from '../../theme';

export function PlaylistDetailsScreen() {
  const { navigation } = useAppNavigation();
  const { playlistId, name } = useRoute<RouteProp<SharedStackParamList, 'PlaylistDetails'>>().params;
  const { loadAudiobook } = usePlayer();
  const { tx } = useLanguage();
  const books = useResource(() => playlistsApi.books(playlistId), [playlistId]);

  const play = async (book: Audiobook) => {
    try {
      await loadAudiobook(book);
      navigation.navigate('Player');
    } catch (error) {
      Alert.alert(tx('চালানো যায়নি', 'Could not play'), errorMessage(error));
    }
  };

  const removeBook = (book: Audiobook) =>
    Alert.alert(book.title, tx('প্লেলিস্ট থেকে সরাবেন?', 'Remove from this playlist?'), [
      { text: tx('বাতিল', 'Cancel'), style: 'cancel' },
      {
        text: tx('সরান', 'Remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await playlistsApi.removeBook(playlistId, book.id);
            books.setData((current) => (current ?? []).filter((b) => b.id !== book.id));
          } catch (error) {
            Alert.alert(tx('ত্রুটি', 'Error'), errorMessage(error));
          }
        },
      },
    ]);

  const deletePlaylist = () =>
    Alert.alert(name, tx('পুরো প্লেলিস্টটি মুছবেন?', 'Delete this playlist?'), [
      { text: tx('বাতিল', 'Cancel'), style: 'cancel' },
      {
        text: tx('মুছুন', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await playlistsApi.remove(playlistId);
            navigation.goBack();
          } catch (error) {
            Alert.alert(tx('ত্রুটি', 'Error'), errorMessage(error));
          }
        },
      },
    ]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={name}
        subtitle={books.data ? tx(`${books.data.length}টি অডিওবুক`, `${books.data.length} audiobooks`) : undefined}
        onBack={() => navigation.goBack()}
      />
      <FlatList
        data={books.data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={books.isRefreshing} onRefresh={books.refresh} tintColor={Colors.primary} />}
        renderItem={({ item }) => (
          <View>
            <AudiobookCard
              audiobook={item}
              onPress={() => navigation.navigate('AudiobookDetails', { audiobookId: item.id })}
              onPlayPress={() => play(item)}
            />
            <View style={styles.removeRow}>
              <AppButton label={tx('সরান', 'Remove')} variant="outline" fullWidth={false} onPress={() => removeBook(item)} />
            </View>
          </View>
        )}
        ListEmptyComponent={
          books.isLoading ? (
            <StateView kind="loading" />
          ) : books.error ? (
            <StateView kind="error" message={books.error} actionLabel={tx('আবার চেষ্টা', 'Retry')} onAction={books.reload} />
          ) : (
            <StateView
              kind="empty"
              title={tx('প্লেলিস্ট খালি', 'This playlist is empty')}
              message={tx('অডিওবুকের পাতা থেকে “প্লেলিস্ট” চেপে যোগ করুন।', 'Add books with “Playlist” on any audiobook page.')}
            />
          )
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <AppButton label={tx('প্লেলিস্ট মুছুন', 'Delete playlist')} variant="secondary" onPress={deletePlaylist} />
          </View>
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
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  removeRow: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
  },
  footer: {
    marginTop: Spacing.lg,
  },
});
