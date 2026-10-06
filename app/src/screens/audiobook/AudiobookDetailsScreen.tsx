/**
 * AudiobookDetailsScreen — Details matching Figma Plate 4 Screens 2, 3, 4.
 * Handles Free, Premium, and Locked preview variants with exact badges,
 * description, primary CTA, and ActionPillBar (`Save · Playlist · Offline · Report`).
 */

import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { EditorialHeroCard } from '../../components/EditorialHeroCard';
import { TagBadge } from '../../components/TagBadge';
import { ShrutiButton } from '../../components/ShrutiButton';
import { ActionItem, ActionPillBar } from '../../components/ActionPillBar';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { FIGMA_AUDIOBOOKS } from '../../data/mockAudiobooks';
import { usePlayer } from '../../contexts/PlayerContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AudiobookDetails'>;
type Route = RouteProp<HomeStackParamList, 'AudiobookDetails'>;

export function AudiobookDetailsScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { loadAudiobook } = usePlayer();
  const { t, isEnglish } = useLanguage();

  const audiobookId = route.params?.audiobookId ?? 'pather-panchali';
  const audiobook = FIGMA_AUDIOBOOKS.find((b) => b.id === audiobookId) ?? FIGMA_AUDIOBOOKS[0];

  const isFree = audiobook.access_type === 'FREE';
  const isLockedPreview = audiobook.id === 'rupashi-bangla';
  const isPremiumUnlocked = audiobook.access_type === 'PREMIUM' && !isLockedPreview;

  // Subtitle in header
  const headerSubtitle = isFree
    ? isEnglish ? 'Free audiobook detail' : 'ফ্রি অডিওবুক'
    : isLockedPreview
    ? isEnglish ? 'Locked audiobook detail' : 'লকড অডিওবুক'
    : isEnglish ? 'Premium audiobook detail' : 'প্রিমিয়াম অডিওবুক';

  // Interactive states
  const [isSaved, setIsSaved] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState(isEnglish ? 'Copyright Infringement' : 'কপিরাইট লঙ্ঘন');
  const [reportSubmitted, setReportSubmitted] = useState(false);

  const handleStartListening = async () => {
    await loadAudiobook(audiobook);
    nav.navigate('Player', { audiobookId: audiobook.id });
  };

  const handleUpgradePremium = () => {
    Alert.alert(
      isEnglish ? 'Premium Subscription' : 'প্রিমিয়াম সাবস্ক্রিপশন',
      isEnglish
        ? 'Monthly fee is ৳199. Would you like to upgrade to Premium?'
        : 'মাসিক সাবস্ক্রিপশন ফি ৳১৯৯। আপনি কি প্রিমিয়ামে আপগ্রেড করতে চান?',
      [
        { text: isEnglish ? 'Cancel' : 'বাতিল', style: 'cancel' },
        {
          text: isEnglish ? 'Upgrade' : 'আপগ্রেড করুন',
          onPress: async () => {
            Alert.alert(
              isEnglish ? 'Success' : 'সফল',
              isEnglish
                ? 'You have successfully upgraded to Premium!'
                : 'আপনি সফলভাবে Premium-এ আপগ্রেড হয়েছেন!',
            );
            await loadAudiobook(audiobook);
            nav.navigate('Player', { audiobookId: audiobook.id });
          },
        },
      ]
    );
  };

  const actionItems: ActionItem[] = [
    {
      id: 'save',
      label: isSaved ? (isEnglish ? 'Saved' : 'সংরক্ষিত') : (isEnglish ? 'Save' : 'সেভ'),
      active: isSaved,
      onPress: () => {
        setIsSaved((prev) => !prev);
        Alert.alert(
          isSaved
            ? isEnglish ? 'Removed from Library' : 'লাইব্রেরি থেকে সরানো হয়েছে'
            : isEnglish ? 'Saved to Library' : 'লাইব্রেরিতে সংরক্ষণ করা হয়েছে',
          audiobook.title
        );
      },
    },
    {
      id: 'playlist',
      label: isEnglish ? 'Playlist' : 'প্লেলিস্ট',
      onPress: () => {
        Alert.alert(
          isEnglish ? 'Added to Playlist' : 'প্লেলিস্টে যোগ করুন',
          isEnglish ? 'Audiobook added to your private playlist.' : 'আপনার ব্যক্তিগত প্লেলিস্টে বইটি যোগ করা হয়েছে।'
        );
      },
    },
    {
      id: 'offline',
      label: isOfflineSaved ? (isEnglish ? 'Downloaded' : 'ডাউনলোডেড') : (isEnglish ? 'Offline' : 'অফলাইন'),
      active: isOfflineSaved,
      onPress: () => {
        setIsOfflineSaved((prev) => !prev);
        Alert.alert(
          isOfflineSaved
            ? isEnglish ? 'Offline cache cleared' : 'অফলাইন ক্যাশ মুছে ফেলা হয়েছে'
            : isEnglish ? 'Cached for offline playback' : 'অ্যাপের ভেতরে অফলাইন শোনার জন্য সংরক্ষিত হয়েছে',
          isEnglish ? 'Listen anytime without internet.' : 'ইন্টারনেট সংযোগ ছাড়াই শোনা যাবে।'
        );
      },
    },
    {
      id: 'report',
      label: isEnglish ? 'Report' : 'রিপোর্ট',
      onPress: () => setReportModalVisible(true),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader
        title={audiobook.title}
        subtitle={headerSubtitle}
        onBack={() => nav.goBack()}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Hero Artwork Card */}
        <View style={styles.heroWrapper}>
          <EditorialHeroCard
            title={audiobook.title}
            meta={`${isEnglish ? 'Bangla' : 'বাংলা'} · ★ 4.8 · ${audiobook.duration_label ?? '8h 42m'}`}
            coverUrl={audiobook.cover_image_url ?? undefined}
            height={260}
          />
        </View>

        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <TagBadge
            label={isFree ? (isEnglish ? 'FREE' : 'ফ্রি') : (isEnglish ? 'PREMIUM' : 'প্রিমিয়াম')}
            variant={isFree ? 'free' : 'premium'}
          />
          <TagBadge label={audiobook.genre ?? (isEnglish ? 'Literature' : 'সাহিত্য')} variant="genre" />
          <TagBadge label={isEnglish ? 'Offline' : 'অফলাইন'} variant="offline" />
        </View>

        {/* Preview Ended Banner */}
        {isLockedPreview && (
          <View style={styles.previewEndedCard}>
            <Text style={styles.previewEndedTitle}>
              {isEnglish ? 'Preview Ended' : 'Preview শেষ'}
            </Text>
            <Text style={styles.previewEndedSub}>
              {isEnglish
                ? 'Upgrade to Premium to continue listening. Your progress is saved.'
                : 'পুরো বই শুনতে Premium নিন। progress saved আছে।'}
            </Text>
          </View>
        )}

        {/* Description Text */}
        <Text style={styles.description}>
          {audiobook.description}
        </Text>

        {/* Primary CTA Button */}
        <View style={styles.ctaWrapper}>
          {isLockedPreview ? (
            <ShrutiButton
              label={isEnglish ? 'Upgrade to Premium' : 'Premium নিন'}
              onPress={handleUpgradePremium}
              variant="primary"
              bulletPrefix
            />
          ) : (
            <ShrutiButton
              label={t('btnStartListening')}
              onPress={handleStartListening}
              variant="primary"
              bulletPrefix
            />
          )}
        </View>

        {/* Segmented Action Pill Bar */}
        <ActionPillBar items={actionItems} />
      </ScrollView>

      {/* Copyright Report Modal Bottom Sheet */}
      <ModalBottomSheet
        visible={reportModalVisible}
        onClose={() => {
          setReportModalVisible(false);
          setReportSubmitted(false);
        }}
      >
        <View style={styles.reportModalContent}>
          <Text style={styles.reportTitle}>{t('copyrightReportTitle')}</Text>
          <Text style={styles.reportSub}>
            {isEnglish ? 'Book:' : 'বই:'} {audiobook.title}
          </Text>

          {reportSubmitted ? (
            <View style={styles.reportSuccessBox}>
              <Text style={styles.reportSuccessTitle}>
                {isEnglish ? 'Report Received' : 'রিপোর্ট গৃহীত হয়েছে'}
              </Text>
              <Text style={styles.reportSuccessSub}>
                {isEnglish
                  ? 'Our moderation team will review this notice and take appropriate action.'
                  : 'অ্যাডমিন টিম পর্যালোচনার পর যথাযথ ব্যবস্থা গ্রহণ করবে।'}
              </Text>
              <ShrutiButton
                label={isEnglish ? 'OK' : 'ঠিক আছে'}
                onPress={() => {
                  setReportModalVisible(false);
                  setReportSubmitted(false);
                }}
                variant="primary"
              />
            </View>
          ) : (
            <View style={{ gap: Spacing.md }}>
              <Text style={styles.reportPrompt}>
                {isEnglish
                  ? 'Select reason for suspected copyright infringement:'
                  : 'সন্দেহভাজন কপিরাইট লঙ্ঘনের কারণ নির্বাচন করুন:'}
              </Text>

              <View style={styles.reasonPillRow}>
                {(isEnglish
                  ? ['Unauthorized Audio Version', 'Created Without Author Consent', 'Other Infringement']
                  : ['অননুমোদিত অডিও সংস্করণ', 'লেখকের অনুমতি ছাড়া তৈরি', 'অন্যান্য']
                ).map((reason) => (
                  <Text
                    key={reason}
                    onPress={() => setReportReason(reason)}
                    style={[
                      styles.reasonChip,
                      reportReason === reason && styles.reasonChipActive,
                    ]}
                  >
                    {reason}
                  </Text>
                ))}
              </View>

              <ShrutiButton
                label={isEnglish ? 'Submit Report' : 'রিপোর্ট জমা দিন'}
                onPress={() => setReportSubmitted(true)}
                variant="primary"
              />
            </View>
          )}
        </View>
      </ModalBottomSheet>

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
    gap: Spacing.sm + 4,
  },
  heroWrapper: {
    marginBottom: Spacing.xs,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  previewEndedCard: {
    backgroundColor: Colors.tintPurple,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  previewEndedTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.tintPurpleText,
    marginBottom: 2,
  },
  previewEndedSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.tintPurpleText,
    lineHeight: 18,
  },
  description: {
    fontSize: FontSizes.base - 0.5,
    color: Colors.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  ctaWrapper: {
    marginTop: Spacing.xs,
  },
  reportModalContent: {
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  reportTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  reportSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  reportPrompt: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  reasonPillRow: {
    gap: Spacing.xs + 2,
  },
  reasonChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    fontSize: FontSizes.sm,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  reasonChipActive: {
    backgroundColor: Colors.surfaceDark,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  reportSuccessBox: {
    backgroundColor: Colors.tintGreen,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  reportSuccessTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.tintGreenText,
  },
  reportSuccessSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.tintGreenText,
    marginBottom: Spacing.xs,
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
