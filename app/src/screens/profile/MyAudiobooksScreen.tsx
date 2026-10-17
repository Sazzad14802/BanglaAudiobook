/**
 * MyAudiobooksScreen — audiobooks the user owns, with their generation state
 * and owner actions: open, follow generation, publish/unpublish, edit, delete.
 */

import React from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { AudiobookCard } from '../../components/AudiobookCard';
import { AppButton } from '../../components/AppButton';
import { StateView } from '../../components/StateView';
import { audiobooksApi } from '../../api/audiobooks';
import { errorMessage } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useResource } from '../../hooks/useResource';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { isActivePublisher } from '../../types/auth';
import { Audiobook } from '../../types/audiobook';
import { Colors, FontSizes, Spacing } from '../../theme';

export function MyAudiobooksScreen() {
  const { navigation, goToTab } = useAppNavigation();
  const { loadAudiobook } = usePlayer();
  const { user } = useAuth();
  const { tx } = useLanguage();
  const canPublish = isActivePublisher(user);
  const books = useResource(() => audiobooksApi.listMine().then((r) => r.items));

  const replace = (book: Audiobook) =>
    books.setData((current) => (current ?? []).map((b) => (b.id === book.id ? book : b)));

  const toggleVisibility = async (book: Audiobook) => {
    try {
      replace(await audiobooksApi.setVisibility(book.id, book.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC'));
    } catch (error) {
      Alert.alert(tx('পরিবর্তন হয়নি', 'Not changed'), errorMessage(error));
    }
  };

  const remove = (book: Audiobook) =>
    Alert.alert(book.title, tx('এই অডিওবুকটি মুছবেন?', 'Delete this audiobook?'), [
      { text: tx('বাতিল', 'Cancel'), style: 'cancel' },
      {
        text: tx('মুছুন', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await audiobooksApi.delete(book.id);
            books.setData((current) => (current ?? []).filter((b) => b.id !== book.id));
          } catch (error) {
            Alert.alert(tx('মুছা যায়নি', 'Could not delete'), errorMessage(error));
          }
        },
      },
    ]);

  const play = async (book: Audiobook) => {
    try {
      await loadAudiobook(book);
      navigation.navigate('Player');
    } catch (error) {
      Alert.alert(tx('চালানো যায়নি', 'Could not play'), errorMessage(error));
    }
  };

  const meta = (book: Audiobook) => {
    const visibility = book.visibility === 'PUBLIC' ? tx('পাবলিক', 'Public') : tx('প্রাইভেট', 'Private');
    const status = {
      COMPLETED: tx('প্রস্তুত', 'Ready'),
      PROCESSING: tx('তৈরি হচ্ছে', 'Generating'),
      PENDING: book.source_file_url ? tx('কিউতে', 'Queued') : tx('ফাইল বাকি', 'Needs a file'),
      FAILED: tx('ব্যর্থ', 'Failed'),
    }[book.status];
    return `${status} · ${visibility}${book.moderated ? ` · ${tx('সীমিত', 'Restricted')}` : ''}`;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={tx('আমার অডিওবুক', 'My audiobooks')}
        onBack={() => navigation.goBack()}
        rightActionText={tx('+ নতুন', '+ New')}
        onRightAction={() => goToTab('CreateTab', { screen: 'CreateAudiobook' })}
      />
      <FlatList
        data={books.data ?? []}
        keyExtractor={(b) => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={books.isRefreshing} onRefresh={books.refresh} tintColor={Colors.primary} />}
        ListEmptyComponent={
          books.isLoading ? (
            <StateView kind="loading" />
          ) : books.error ? (
            <StateView kind="error" message={books.error} actionLabel={tx('আবার চেষ্টা', 'Retry')} onAction={books.reload} />
          ) : (
            <StateView
              kind="empty"
              title={tx('এখনো কোনো অডিওবুক নেই', 'No audiobooks yet')}
              message={tx('PDF থেকে প্রথম অডিওবুক তৈরি করুন।', 'Create your first audiobook from a PDF.')}
              actionLabel={tx('তৈরি করুন', 'Create')}
              onAction={() => goToTab('CreateTab', { screen: 'CreateAudiobook' })}
            />
          )
        }
        renderItem={({ item }) => (
          <View style={styles.item}>
            <AudiobookCard
              audiobook={item}
              meta={meta(item)}
              onPress={() =>
                item.status === 'COMPLETED' || !item.source_file_url
                  ? navigation.navigate('AudiobookDetails', { audiobookId: item.id })
                  : navigation.navigate('GenerationStatus', { audiobookId: item.id })
              }
              onPlayPress={() => play(item)}
            />
            <View style={styles.actions}>
              {canPublish && item.status === 'COMPLETED' && !item.moderated ? (
                <AppButton
                  label={item.visibility === 'PUBLIC' ? tx('প্রাইভেট করুন', 'Make private') : tx('প্রকাশ করুন', 'Publish')}
                  variant="outline"
                  fullWidth={false}
                  onPress={() => toggleVisibility(item)}
                />
              ) : null}
              <AppButton
                label={tx('সম্পাদনা', 'Edit')}
                variant="outline"
                fullWidth={false}
                onPress={() => navigation.navigate('EditAudiobook', { audiobookId: item.id })}
              />
              <AppButton label={tx('মুছুন', 'Delete')} variant="outline" fullWidth={false} onPress={() => remove(item)} />
            </View>
          </View>
        )}
        ListFooterComponent={
          !canPublish && (books.data?.length ?? 0) > 0 ? (
            <Text style={styles.note}>
              {tx('শ্রোতা অ্যাকাউন্টের অডিওবুক প্রাইভেট থাকে।', 'Audiobooks on listener accounts stay private.')}
            </Text>
          ) : null
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
    gap: Spacing.sm,
    flexGrow: 1,
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: Spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  note: {
    textAlign: 'center',
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: Spacing.md,
  },
});
