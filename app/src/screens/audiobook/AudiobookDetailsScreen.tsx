/**
 * AudiobookDetailsScreen — everything about one audiobook:
 * listen (or unlock), save, add to playlist, download for offline, report,
 * chapter list, and owner tools (generation status, edit, delete).
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { AppHeader } from '../../components/AppHeader';
import { EditorialHeroCard } from '../../components/EditorialHeroCard';
import { TagBadge } from '../../components/TagBadge';
import { AppButton } from '../../components/AppButton';
import { ActionItem, ActionPillBar } from '../../components/ActionPillBar';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { StateView } from '../../components/StateView';
import { audiobooksApi } from '../../api/audiobooks';
import { libraryApi, playlistsApi } from '../../api/library';
import { reportsApi } from '../../api/account';
import { errorMessage } from '../../api/client';
import { offline } from '../../storage/offline';
import { usePlayer } from '../../contexts/PlayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useResource } from '../../hooks/useResource';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { SharedStackParamList } from '../../navigation/types';
import { genreLabel, languageLabel } from '../../constants/genres';
import { isPremium } from '../../types/auth';
import { Playlist } from '../../types/domain';
import { formatDuration } from '../../utils/format';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

const REPORT_REASONS = [
  { bn: 'কপিরাইট লঙ্ঘন', en: 'Copyright infringement' },
  { bn: 'অনুপযুক্ত কনটেন্ট', en: 'Inappropriate content' },
  { bn: 'অডিওর মান খারাপ', en: 'Poor audio quality' },
  { bn: 'ভুল তথ্য', en: 'Incorrect information' },
];

export function AudiobookDetailsScreen() {
  const { navigation, goToTab } = useAppNavigation();
  const { audiobookId } = useRoute<RouteProp<SharedStackParamList, 'AudiobookDetails'>>().params;
  const { loadAudiobook, audiobook: playing } = usePlayer();
  const { user } = useAuth();
  const { tx, isEnglish } = useLanguage();

  const isMember = user?.account_type === 'listener' || user?.account_type === 'publisher';

  const details = useResource(async () => {
    const [book, chapters, saved, downloads] = await Promise.all([
      audiobooksApi.get(audiobookId),
      audiobooksApi.chapters(audiobookId).catch(() => []),
      isMember ? libraryApi.isSaved(audiobookId).catch(() => false) : Promise.resolve(false),
      user ? offline.list(user.id).catch(() => []) : Promise.resolve([]),
    ]);
    return { book, chapters, saved, downloaded: downloads.some((b) => b.id === audiobookId) };
  }, [audiobookId]);

  const [busy, setBusy] = useState<string | null>(null);
  const [playlistSheet, setPlaylistSheet] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [newPlaylist, setNewPlaylist] = useState('');
  const [reportSheet, setReportSheet] = useState(false);
  const [reportReason, setReportReason] = useState(0);
  const [reportDetails, setReportDetails] = useState('');

  if (details.isLoading || !details.data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title="" onBack={() => navigation.goBack()} />
        {details.error ? (
          <StateView
            kind="error"
            title={tx('অডিওবুকটি পাওয়া যায়নি', 'Audiobook not available')}
            message={details.error}
            actionLabel={tx('আবার চেষ্টা', 'Retry')}
            onAction={details.reload}
          />
        ) : (
          <StateView kind="loading" />
        )}
      </SafeAreaView>
    );
  }

  const { book, chapters, saved, downloaded } = details.data;
  const isOwner = book.owner_id === user?.id;
  const isFree = book.access_tier !== 'premium';
  const isLocked = !isFree && !isOwner && !isPremium(user);
  const isReady = book.status === 'COMPLETED';
  // Same filter the play manifest applies, so list indexes match player indexes.
  const playableChapters = chapters.filter((c) => c.audio_url);

  const update = (patch: Partial<typeof details.data>) =>
    details.setData((current) => ({ ...current!, ...patch }));

  const premiumPrompt = (message: string) =>
    Alert.alert(tx('প্রিমিয়াম প্রয়োজন', 'Premium required'), message, [
      { text: tx('বাতিল', 'Cancel'), style: 'cancel' },
      { text: tx('প্রিমিয়াম নিন', 'Get Premium'), onPress: () => goToTab('ProfileTab', { screen: 'Subscription' }) },
    ]);

  const listen = async (chapterIndex?: number) => {
    if (isLocked) {
      premiumPrompt(tx('এটি শুনতে প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন।', 'A Premium subscription is required to listen.'));
      return;
    }
    setBusy('listen');
    try {
      if (playing?.id !== book.id || chapterIndex !== undefined) {
        await loadAudiobook(book, chapterIndex !== undefined ? { chapterIndex, resume: false } : {});
      }
      navigation.navigate('Player');
    } catch (error) {
      Alert.alert(tx('চালানো যায়নি', 'Could not play'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const toggleSave = async () => {
    setBusy('save');
    try {
      if (saved) await libraryApi.remove(book.id);
      else await libraryApi.add(book.id);
      update({ saved: !saved });
    } catch (error) {
      Alert.alert(tx('লাইব্রেরি', 'Library'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const openPlaylists = async () => {
    setPlaylistSheet(true);
    try {
      setPlaylists(await playlistsApi.list());
    } catch (error) {
      Alert.alert(tx('প্লেলিস্ট', 'Playlists'), errorMessage(error));
    }
  };

  const addToPlaylist = async (playlist: Playlist) => {
    try {
      await playlistsApi.addBook(playlist.id, book.id);
      setPlaylistSheet(false);
      Alert.alert(tx('যোগ হয়েছে', 'Added'), tx(`«${playlist.name}»-এ যোগ করা হয়েছে।`, `Added to “${playlist.name}”.`));
    } catch (error) {
      Alert.alert(tx('প্লেলিস্ট', 'Playlist'), errorMessage(error));
    }
  };

  const createPlaylist = async () => {
    const name = newPlaylist.trim();
    if (!name) return;
    try {
      const created = await playlistsApi.create(name);
      setNewPlaylist('');
      await addToPlaylist(created);
    } catch (error) {
      Alert.alert(tx('প্লেলিস্ট', 'Playlist'), errorMessage(error));
    }
  };

  const toggleOffline = async () => {
    if (!user) return;
    if (downloaded) {
      await offline.remove(book.id, user.id);
      update({ downloaded: false });
      return;
    }
    if (!isPremium(user)) {
      premiumPrompt(tx('ডাউনলোড করে অফলাইনে শুনতে প্রিমিয়াম প্রয়োজন।', 'Downloading for offline listening needs Premium.'));
      return;
    }
    setBusy('offline');
    try {
      await offline.download(book, user.id);
      update({ downloaded: true });
      Alert.alert(tx('ডাউনলোড সম্পন্ন', 'Downloaded'), tx('লাইব্রেরি থেকে অফলাইনে শুনতে পারবেন।', 'Play it offline from your Library.'));
    } catch (error) {
      Alert.alert(tx('ডাউনলোড ব্যর্থ', 'Download failed'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const submitReport = async () => {
    const reason = REPORT_REASONS[reportReason];
    const text = `${reason.en}${reportDetails.trim() ? `: ${reportDetails.trim()}` : ''}`;
    setBusy('report');
    try {
      await reportsApi.submit(book.id, text);
      setReportSheet(false);
      setReportDetails('');
      Alert.alert(tx('রিপোর্ট জমা হয়েছে', 'Report submitted'), tx('আমাদের টিম এটি পর্যালোচনা করবে।', 'Our team will review it.'));
    } catch (error) {
      Alert.alert(tx('রিপোর্ট', 'Report'), errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const remove = () =>
    Alert.alert(
      tx('অডিওবুক মুছবেন?', 'Delete audiobook?'),
      tx('এটি আর কেউ দেখতে বা শুনতে পারবে না।', 'Nobody will be able to see or play it.'),
      [
        { text: tx('বাতিল', 'Cancel'), style: 'cancel' },
        {
          text: tx('মুছুন', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await audiobooksApi.delete(book.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert(tx('মুছা যায়নি', 'Could not delete'), errorMessage(error));
            }
          },
        },
      ],
    );

  const actions: ActionItem[] = [];
  if (isMember) {
    actions.push({
      id: 'save',
      label: saved ? tx('সংরক্ষিত ✓', 'Saved ✓') : tx('সেভ', 'Save'),
      active: saved,
      onPress: toggleSave,
    });
    actions.push({ id: 'playlist', label: tx('প্লেলিস্ট', 'Playlist'), onPress: openPlaylists });
  }
  if (isReady && isMember) {
    actions.push({
      id: 'offline',
      label:
        busy === 'offline'
          ? tx('ডাউনলোড…', 'Saving…')
          : downloaded
            ? tx('ডাউনলোডেড', 'Downloaded')
            : tx('অফলাইন', 'Offline'),
      active: downloaded,
      onPress: toggleOffline,
    });
  }
  if (isMember && !isOwner) {
    actions.push({ id: 'report', label: tx('রিপোর্ট', 'Report'), onPress: () => setReportSheet(true) });
  }

  const meta = [
    book.author,
    languageLabel(book.language, isEnglish),
    book.duration_seconds ? formatDuration(book.duration_seconds) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={book.title}
        subtitle={isFree ? tx('ফ্রি অডিওবুক', 'Free audiobook') : tx('প্রিমিয়াম অডিওবুক', 'Premium audiobook')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={details.isRefreshing} onRefresh={details.refresh} tintColor={Colors.primary} />
        }
      >
        <EditorialHeroCard title={book.title} meta={meta} coverUrl={book.cover_image_url} />

        <View style={styles.badgeRow}>
          <TagBadge
            label={
              isFree
                ? tx('ফ্রি', 'FREE')
                : isLocked
                  ? tx('প্রিমিয়াম · লকড', 'PREMIUM · LOCKED')
                  : tx('প্রিমিয়াম', 'PREMIUM')
            }
            variant={isFree ? 'free' : 'premium'}
          />
          {book.genre ? <TagBadge label={genreLabel(book.genre, isEnglish)} variant="genre" /> : null}
          {isOwner ? (
            <TagBadge
              label={book.visibility === 'PUBLIC' ? tx('পাবলিক', 'Public') : tx('প্রাইভেট', 'Private')}
              variant="offline"
            />
          ) : null}
        </View>

        {isReady ? (
          <AppButton
            label={
              isLocked
                ? tx('🔒 প্রিমিয়াম নিয়ে শুনুন', '🔒 Unlock with Premium')
                : playing?.id === book.id
                  ? tx('▶ প্লেয়ার খুলুন', '▶ Open player')
                  : tx('▶ শোনা শুরু করুন', '▶ Start listening')
            }
            onPress={() => listen()}
            isLoading={busy === 'listen'}
            variant={isLocked ? 'secondary' : 'primary'}
          />
        ) : isOwner ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>
              {book.status === 'FAILED'
                ? tx('অডিও তৈরি ব্যর্থ হয়েছে', 'Audio generation failed')
                : book.source_file_url
                  ? tx('অডিও তৈরি হচ্ছে…', 'Audio is being generated…')
                  : tx('এখনো কোনো ফাইল আপলোড হয়নি', 'No file uploaded yet')}
            </Text>
            <AppButton
              label={book.source_file_url ? tx('অবস্থা দেখুন', 'View progress') : tx('ফাইল আপলোড করুন', 'Upload a file')}
              onPress={() =>
                book.source_file_url
                  ? navigation.navigate('GenerationStatus', { audiobookId: book.id })
                  : goToTab('CreateTab', { screen: 'UploadSource', params: { audiobookId: book.id, title: book.title } })
              }
              variant="secondary"
            />
          </View>
        ) : null}

        {actions.length ? <ActionPillBar items={actions} /> : null}
        {busy === 'save' ? <ActivityIndicator color={Colors.primary} /> : null}

        {book.description ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>{tx('অডিওবুক সম্পর্কে', 'About')}</Text>
            <Text style={styles.descriptionText}>{book.description}</Text>
          </View>
        ) : null}

        {playableChapters.length > 0 && !isLocked ? (
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>
              {tx(`অধ্যায় (${playableChapters.length})`, `Chapters (${playableChapters.length})`)}
            </Text>
            {playableChapters.map((chapter, index) => (
              <Pressable
                key={chapter.id}
                onPress={() => listen(index)}
                style={({ pressed }) => [styles.chapterRow, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.chapterNumber}>{chapter.chapter_number}</Text>
                <Text style={styles.chapterTitle} numberOfLines={1}>
                  {chapter.title}
                </Text>
                <Text style={styles.chapterDuration}>{formatDuration(chapter.duration_seconds)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {isOwner ? (
          <View style={styles.ownerRow}>
            <View style={styles.ownerButton}>
              <AppButton
                label={tx('সম্পাদনা', 'Edit')}
                variant="secondary"
                onPress={() => goToTab('ProfileTab', { screen: 'EditAudiobook', params: { audiobookId: book.id } })}
              />
            </View>
            <View style={styles.ownerButton}>
              <AppButton label={tx('মুছুন', 'Delete')} variant="secondary" onPress={remove} />
            </View>
          </View>
        ) : null}
      </ScrollView>

      <ModalBottomSheet visible={playlistSheet} onClose={() => setPlaylistSheet(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{tx('প্লেলিস্টে যোগ করুন', 'Add to playlist')}</Text>
          <View style={styles.inlineRow}>
            <TextInput
              style={styles.textInput}
              value={newPlaylist}
              onChangeText={setNewPlaylist}
              placeholder={tx('নতুন প্লেলিস্টের নাম', 'New playlist name')}
              placeholderTextColor={Colors.textMuted}
              maxLength={150}
            />
            <AppButton
              label={tx('তৈরি', 'Create')}
              onPress={createPlaylist}
              variant="compact"
              fullWidth={false}
              disabled={!newPlaylist.trim()}
            />
          </View>
          {playlists.map((p) => (
            <Pressable
              key={p.id}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              onPress={() => addToPlaylist(p)}
            >
              <Text style={styles.optionText}>{p.name}</Text>
            </Pressable>
          ))}
          {playlists.length === 0 ? (
            <Text style={styles.emptyNotice}>{tx('এখনো কোনো প্লেলিস্ট নেই।', 'No playlists yet.')}</Text>
          ) : null}
        </View>
      </ModalBottomSheet>

      <ModalBottomSheet visible={reportSheet} onClose={() => setReportSheet(false)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{tx('অডিওবুক রিপোর্ট করুন', 'Report audiobook')}</Text>
          {REPORT_REASONS.map((reason, index) => (
            <Pressable
              key={reason.en}
              style={[styles.option, reportReason === index && styles.optionActive]}
              onPress={() => setReportReason(index)}
            >
              <Text style={[styles.optionText, reportReason === index && styles.optionTextActive]}>
                {isEnglish ? reason.en : reason.bn}
              </Text>
            </Pressable>
          ))}
          <TextInput
            style={[styles.textInput, styles.multiline]}
            value={reportDetails}
            onChangeText={setReportDetails}
            placeholder={tx('বিস্তারিত (ঐচ্ছিক)', 'Details (optional)')}
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={1000}
          />
          <AppButton
            label={tx('রিপোর্ট জমা দিন', 'Submit report')}
            onPress={submitReport}
            isLoading={busy === 'report'}
          />
        </View>
      </ModalBottomSheet>
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
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  statusCard: {
    backgroundColor: Colors.tintAmber,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  statusTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.tintAmberText,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  sectionHeader: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  descriptionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  chapterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  chapterNumber: {
    width: 22,
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  chapterTitle: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  chapterDuration: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  ownerRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  ownerButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  modalContent: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 46,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
    flex: 0,
  },
  option: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  optionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  optionText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  optionTextActive: {
    color: Colors.primary,
  },
  emptyNotice: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
});
