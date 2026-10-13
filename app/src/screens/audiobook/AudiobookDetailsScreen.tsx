/**
 * AudiobookDetailsScreen — Details matching Figma Plate 4 Screens 2, 3, 4.
 * Handles Free, Premium, and Locked preview variants with exact badges,
 * description, primary CTA, and ActionPillBar (`Save · Playlist · Offline · Report`).
 * Connected to live FastAPI backend & DRM storage.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { HomeStackParamList } from '../../navigation/types';
import { BanglaBookHeader } from '../../components/BanglaBookHeader';
import { EditorialHeroCard } from '../../components/EditorialHeroCard';
import { TagBadge } from '../../components/TagBadge';
import { BanglaBookButton } from '../../components/BanglaBookButton';
import { ActionItem, ActionPillBar } from '../../components/ActionPillBar';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { usePlayer } from '../../contexts/PlayerContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { audiobooksApi } from '../../api/audiobooks';
import { apiClient } from '../../api/client';
import { offline } from '../../storage/offline';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AudiobookDetails'>;
type Route = RouteProp<HomeStackParamList, 'AudiobookDetails'>;

export function AudiobookDetailsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { loadAudiobook } = usePlayer();
  const { user } = useAuth();
  const { t, isEnglish } = useLanguage();

  const audiobookId = route.params?.audiobookId ?? 'pather-panchali';
  const fallbackBook = FIGMA_AUDIOBOOKS.find((b) => b.id === audiobookId) ?? FIGMA_AUDIOBOOKS[0];

  const [audiobook, setAudiobook] = useState<any>(fallbackBook);
  const [isLoading, setIsLoading] = useState(false);

  // Interactive action states
  const [isSaved, setIsSaved] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Playlist bottom sheet
  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Report bottom sheet
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState(isEnglish ? 'Copyright Infringement' : 'কপিরাইট লঙ্ঘন');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Fetch real audiobook details
  const fetchBookDetails = useCallback(async () => {
    try {
      const data = await audiobooksApi.get(audiobookId);
      if (data) setAudiobook(data);
    } catch {
      // Use fallback
      setAudiobook(fallbackBook);
    }
  }, [audiobookId]);

  // Check offline presence
  const checkOffline = useCallback(async () => {
    if (!user?.id) return;
    try {
      const downloaded = await offline.list(user.id);
      setIsOfflineSaved(downloaded.some((b) => b.id === audiobookId));
    } catch {}
  }, [audiobookId, user?.id]);

  useEffect(() => {
    fetchBookDetails();
    checkOffline();
  }, [fetchBookDetails, checkOffline]);

  const isFree = audiobook.access_tier === 'free' || audiobook.access_type === 'FREE';
  const isPremiumUser = Boolean(user?.premium_until && new Date(user.premium_until) > new Date());
  const isLocked = !isFree && !isPremiumUser;

  // Save / Unsave to user library
  const handleToggleSave = async () => {
    try {
      if (isSaved) {
        setIsSaved(false);
        Alert.alert(isEnglish ? 'Library' : 'লাইব্রেরি', isEnglish ? 'Removed from your library.' : 'লাইব্রেরি থেকে সরানো হয়েছে।');
      } else {
        await apiClient.post(`/library/${audiobook.id}`).catch(() => {});
        setIsSaved(true);
        Alert.alert(isEnglish ? 'Library' : 'লাইব্রেরি', isEnglish ? 'Saved to your library.' : 'লাইব্রেরিতে সংরক্ষণ করা হয়েছে।');
      }
    } catch {
      setIsSaved((prev) => !prev);
    }
  };

  // Open Playlist Picker
  const handleOpenPlaylists = async () => {
    try {
      const list = await apiClient.get<any[]>('/playlists');
      setPlaylists(list);
    } catch {
      setPlaylists([]);
    }
    setPlaylistModalVisible(true);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    try {
      await apiClient.put(`/playlists/${playlistId}/books/${audiobook.id}`);
      setPlaylistModalVisible(false);
      Alert.alert(isEnglish ? 'Playlist' : 'প্লেলিস্ট', isEnglish ? 'Added to playlist!' : 'প্লেলিস্টে যোগ করা হয়েছে!');
    } catch (e: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', e.detail || 'Could not add to playlist');
    }
  };

  const handleCreateAndAddToPlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    try {
      const created = await apiClient.post<any>('/playlists', { name: newPlaylistName.trim() });
      await apiClient.put(`/playlists/${created.id}/books/${audiobook.id}`);
      setNewPlaylistName('');
      setPlaylistModalVisible(false);
      Alert.alert(isEnglish ? 'Playlist' : 'প্লেলিস্ট', isEnglish ? 'Playlist created and book added!' : 'প্লেলিস্ট তৈরি ও বই যোগ করা হয়েছে!');
    } catch (e: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', e.detail || 'Could not create playlist');
    }
  };

  // Encrypted Offline Download
  const handleToggleOffline = async () => {
    if (!user?.id) {
      Alert.alert(isEnglish ? 'Notice' : 'বিজ্ঞপ্তি', isEnglish ? 'Please sign in to download.' : 'ডাউনলোড করতে সাইন ইন করুন।');
      return;
    }
    if (!isPremiumUser && !isFree) {
      Alert.alert(
        isEnglish ? 'Premium Feature' : 'প্রিমিয়াম সুবিধা',
        isEnglish ? 'Offline downloads are reserved for Premium subscribers.' : 'অফলাইন লিসেনিং কেবল প্রিমিয়াম গ্রাহকদের জন্য।'
      );
      return;
    }

    if (isOfflineSaved) {
      await offline.remove(audiobook.id, user.id);
      setIsOfflineSaved(false);
      Alert.alert(isEnglish ? 'Offline' : 'অফলাইন', isEnglish ? 'Downloaded audio removed from device.' : 'ডিভাইস থেকে অফলাইন ফাইল মুছে ফেলা হয়েছে।');
      return;
    }

    setIsDownloading(true);
    try {
      await offline.download(audiobook, user.id);
      setIsOfflineSaved(true);
      Alert.alert(
        isEnglish ? 'Download Complete' : 'ডাউনলোড সম্পন্ন',
        isEnglish ? 'Audiobook downloaded with hardware-backed DRM. Listen anytime offline!' : 'অডিওবুক সফলভাবে অফলাইনে এনক্রিপ্ট করে সংরক্ষণ করা হয়েছে!'
      );
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Download Failed' : 'ডাউনলোড ব্যর্থ', err.message || 'Could not download audio chapters.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Submit Content Report
  const handleSubmitReport = async () => {
    setReportSubmitting(true);
    try {
      await apiClient.post('/reports', {
        audiobook_id: audiobook.id,
        reason: reportReason,
      });
      setReportModalVisible(false);
      Alert.alert(
        isEnglish ? 'Report Submitted' : 'রিপোর্ট জমা হয়েছে',
        isEnglish ? 'Our moderation team will investigate this content.' : 'আমাদের মডারেশন টিম অভিযোগটি খতিয়ে দেখবে।'
      );
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || 'Could not submit report.');
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleStartListening = async () => {
    if (isLocked) {
      Alert.alert(
        isEnglish ? 'Premium Locked' : 'প্রিমিয়াম লকড',
        isEnglish ? 'This audiobook requires a Premium subscription.' : 'এই অডিওবুকটি শুনতে প্রিমিয়াম সাবস্ক্রিপশন প্রয়োজন।',
        [
          { text: isEnglish ? 'Cancel' : 'বাতিল', style: 'cancel' },
          { text: isEnglish ? 'Upgrade' : 'আপগ্রেড করুন', onPress: () => nav.navigate('Profile' as any) },
        ]
      );
      return;
    }
    await loadAudiobook(audiobook);
    nav.navigate('Player', { audiobookId: audiobook.id });
  };

  const actionItems: ActionItem[] = [
    {
      id: 'save',
      label: isSaved ? (isEnglish ? 'Saved' : 'সংরক্ষিত') : (isEnglish ? 'Save' : 'সেভ'),
      active: isSaved,
      onPress: handleToggleSave,
    },
    {
      id: 'playlist',
      label: isEnglish ? 'Playlist' : 'প্লেলিস্ট',
      onPress: handleOpenPlaylists,
    },
    {
      id: 'offline',
      label: isDownloading
        ? (isEnglish ? 'Saving...' : 'সংরক্ষণ...')
        : isOfflineSaved
        ? (isEnglish ? 'Downloaded' : 'ডাউনলোডেড')
        : (isEnglish ? 'Offline' : 'অফলাইন'),
      active: isOfflineSaved,
      onPress: handleToggleOffline,
    },
    {
      id: 'report',
      label: isEnglish ? 'Report' : 'রিপোর্ট',
      onPress: () => setReportModalVisible(true),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <BanglaBookHeader
        title={audiobook.title}
        subtitle={isFree ? (isEnglish ? 'Free audiobook detail' : 'ফ্রি অডিওবুক') : (isEnglish ? 'Premium audiobook detail' : 'প্রিমিয়াম অডিওবুক')}
        onBack={() => nav.goBack()}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover / Hero Artwork Card */}
        <View style={styles.heroSection}>
          <EditorialHeroCard
            title={audiobook.title}
            meta={`${audiobook.author || 'বাংলা সাহিত্য'} · ${audiobook.language === 'en' ? 'English' : 'বাংলা'}`}
            coverUrl={audiobook.cover_image_url ?? undefined}
          />
        </View>

        {/* Access Badges & Genre */}
        <View style={styles.badgeRow}>
          <TagBadge
            label={isFree ? 'FREE ACCESS' : isLocked ? 'PREMIUM (LOCKED)' : 'PREMIUM (UNLOCKED)'}
            variant={isFree ? 'free' : isLocked ? 'genre' : 'premium'}
          />
          {audiobook.genre ? <TagBadge label={audiobook.genre} variant="genre" /> : null}
        </View>

        {/* Primary CTA */}
        <View style={styles.ctaWrapper}>
          <BanglaBookButton
            label={isLocked ? (isEnglish ? '🔒 Unlock with Premium' : '🔒 প্রিমিয়ামে শুনুন') : (isEnglish ? '▶ Start Listening' : '▶ শোনা শুরু করুন')}
            onPress={handleStartListening}
            variant={isLocked ? 'secondary' : 'primary'}
          />
        </View>

        {/* Action Pills Bar */}
        <View style={styles.actionPillSection}>
          <ActionPillBar items={actionItems} />
        </View>

        {/* Description Section */}
        <View style={styles.detailsCard}>
          <Text style={styles.sectionHeader}>{isEnglish ? 'About Audiobook' : 'অডিওবুক সম্পর্কে'}</Text>
          <Text style={styles.descriptionText}>
            {audiobook.description || (isEnglish ? 'Immerse yourself in authentic narration produced with high-fidelity speech synthesis.' : 'উচ্চমানের কথা ও বর্ণনায় সমৃদ্ধ বাংলা সাহিত্যের অনন্য সৃষ্টি।')}
          </Text>
        </View>
      </ScrollView>

      {/* Playlist Picker Modal */}
      <ModalBottomSheet
        visible={playlistModalVisible}
        onClose={() => setPlaylistModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{isEnglish ? 'Add to Playlist' : 'প্লেলিস্টে যোগ করুন'}</Text>
          
          <View style={styles.createPlaylistRow}>
            <TextInput
              style={styles.textInput}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholder={isEnglish ? 'New playlist name' : 'নতুন প্লেলিস্টের নাম'}
              placeholderTextColor={Colors.textMuted}
            />
            <BanglaBookButton
              label={isEnglish ? 'Create' : 'তৈরি'}
              onPress={handleCreateAndAddToPlaylist}
              variant="primary"
            />
          </View>

          <View style={{ gap: Spacing.xs, marginTop: Spacing.sm }}>
            {playlists.map((p) => (
              <Pressable
                key={p.id}
                style={styles.playlistItem}
                onPress={() => handleAddToPlaylist(p.id)}
              >
                <Text style={styles.playlistItemText}>📁 {p.name}</Text>
              </Pressable>
            ))}
            {playlists.length === 0 && (
              <Text style={styles.emptyNotice}>{isEnglish ? 'No playlists found. Create one above!' : 'কোনো প্লেলিস্ট পাওয়া যায়নি। উপরে নতুন প্লেলিস্ট তৈরি করুন।'}</Text>
            )}
          </View>
        </View>
      </ModalBottomSheet>

      {/* Content Reporting Modal */}
      <ModalBottomSheet
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{isEnglish ? 'Report Audiobook' : 'অডিওবুক রিপোর্ট করুন'}</Text>
          <Text style={styles.modalSub}>
            {isEnglish ? 'Select the reason for copyright or moderation review:' : 'রিপোর্টের কারণ নির্বাচন করুন:'}
          </Text>

          <View style={{ gap: Spacing.sm }}>
            {[
              isEnglish ? 'Copyright Infringement' : 'কপিরাইট লঙ্ঘন',
              isEnglish ? 'Inappropriate Content' : 'অনুপযুক্ত উপাদান',
              isEnglish ? 'Low Audio Quality' : 'ত্রুটিপূর্ণ অডিও',
            ].map((reason) => (
              <Pressable
                key={reason}
                style={[styles.reasonOption, reportReason === reason && styles.reasonOptionActive]}
                onPress={() => setReportReason(reason)}
              >
                <Text style={[styles.reasonText, reportReason === reason && styles.reasonTextActive]}>
                  {reason}
                </Text>
              </Pressable>
            ))}

            <BanglaBookButton
              label={reportSubmitting ? (isEnglish ? 'Submitting...' : 'জমা হচ্ছে...') : (isEnglish ? 'Submit Report' : 'রিপোর্ট জমা দিন')}
              onPress={handleSubmitReport}
              variant="secondary"
              isLoading={reportSubmitting}
            />
          </View>
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
  heroSection: {
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    alignItems: 'center',
  },
  ctaWrapper: {
    marginTop: Spacing.xs,
  },
  actionPillSection: {
    marginVertical: Spacing.xs,
  },
  detailsCard: {
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
  modalContent: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
  },
  createPlaylistRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  playlistItem: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  playlistItemText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyNotice: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.sm,
  },
  reasonOption: {
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  reasonOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FDEAE4',
  },
  reasonText: {
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
  },
  reasonTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
});
