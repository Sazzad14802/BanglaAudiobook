/**
 * GenerationStatusScreen — Live generation pipeline tracker.
 * Communicates: Uploading → Processing → Queued → Generating → Completed/Failed.
 * Shows queue priority (Publisher > Premium > Free) and aging progress.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { CreateStackParamList } from '../../navigation/types';
import { BanglaBookHeader } from '../../components/BanglaBookHeader';
import { BanglaBookButton } from '../../components/BanglaBookButton';
import { TagBadge } from '../../components/TagBadge';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiClient } from '../../api/client';
import { usePlayer } from '../../contexts/PlayerContext';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'GenerationStatus'>;
type Route = RouteProp<CreateStackParamList, 'GenerationStatus'>;

export function GenerationStatusScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const audiobookId = route.params?.audiobookId ?? 'new-book';
  const { t, isEnglish } = useLanguage();
  const { loadAudiobook } = usePlayer();

  const [book, setBook] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('PROCESSING');
  const [completedPages, setCompletedPages] = useState<number>(0);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const poll = useCallback(async () => {
    try {
      const data = await apiClient.get<any>(`/audiobooks/${audiobookId}`);
      if (data) {
        setBook(data);
        setStatus(data.status);
      }
    } catch (e) {
      console.warn('Poll error:', e);
    }
  }, [audiobookId]);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  const isCompleted = status === 'COMPLETED';
  const isFailed = status === 'FAILED';

  const handleListen = async () => {
    if (book) {
      await loadAudiobook(book);
      nav.navigate('Player', { audiobookId: book.id });
    } else {
      nav.navigate('AudiobookDetails', { audiobookId });
    }
  };

  const handleCancel = async () => {
    if (!jobId) {
      nav.navigate('CreateAudiobook');
      return;
    }
    setIsCancelling(true);
    try {
      await apiClient.post(`/generation/${jobId}/cancel`);
      Alert.alert(isEnglish ? 'Cancelled' : 'বাতিল হয়েছে', isEnglish ? 'Generation request cancelled.' : 'অডিও রূপান্তর অনুরোধটি বাতিল করা হয়েছে।');
      await poll();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || 'Could not cancel job.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetry = async () => {
    if (!jobId) return;
    setIsRetrying(true);
    try {
      await apiClient.post(`/generation/${jobId}/retry`);
      Alert.alert(isEnglish ? 'Retried' : 'পুনরায় শুরু', isEnglish ? 'Job re-enqueued for synthesis.' : 'জবটি পুনরায় কিউতে পাঠানো হয়েছে।');
      await poll();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || 'Could not retry.');
    } finally {
      setIsRetrying(false);
    }
  };

  const stepsList = [
    { key: 'uploading', label: t('stepPdfUploaded'), done: true },
    { key: 'processing', label: t('stepTextOcr'), done: status !== 'PENDING' },
    { key: 'queued', label: isEnglish ? 'Fair Queued & Priority Aging' : 'অগ্রাধিকার কিউ ও এজিং শিডিউলিং', done: status === 'PROCESSING' || isCompleted },
    { key: 'generating', label: t('stepSpeechSynthesis'), done: isCompleted },
    { key: 'completed', label: t('stepGenDone'), done: isCompleted },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <BanglaBookHeader
        title={t('genProgressTitle')}
        subtitle={book?.title || t('genProgressSub')}
        onBack={() => nav.goBack()}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View style={styles.statusHeroCard}>
          <View style={styles.statusBadgeRow}>
            <TagBadge
              label={status}
              variant={isCompleted ? 'free' : isFailed ? 'premium' : 'genre'}
            />
            <Text style={styles.priorityText}>
              {isEnglish ? 'Aging Priority Scheduler' : 'ফেয়ার শিডিউলার সক্রিয়'}
            </Text>
          </View>

          <Text style={styles.statusTitle}>
            {isCompleted
              ? (isEnglish ? 'Audiobook Synthesis Complete!' : 'অডিওবুক সফলভাবে তৈরি হয়েছে!')
              : isFailed
              ? (isEnglish ? 'Generation Failed' : 'জেনারেশন ব্যর্থ হয়েছে')
              : (isEnglish ? 'Synthesizing Audio Chunks...' : 'অডিও চ্যাংক তৈরি হচ্ছে...')}
          </Text>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarTrack}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: isCompleted ? '100%' : isFailed ? '0%' : '65%' },
                ]}
              />
            </View>
            <Text style={styles.progressPercentText}>
              {isCompleted ? '100%' : isFailed ? 'Error' : 'Processing...'}
            </Text>
          </View>
        </View>

        {/* Pipeline Step List */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>
            {isEnglish ? 'Generation Pipeline' : 'রূপান্তর পাইপলাইন'}
          </Text>

          {stepsList.map((step, idx) => (
            <View key={step.key} style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  step.done ? styles.stepDotDone : styles.stepDotPending,
                ]}
              >
                <Text style={styles.stepDotIcon}>{step.done ? '✓' : idx + 1}</Text>
              </View>

              <Text
                style={[
                  styles.stepText,
                  step.done ? styles.stepTextDone : styles.stepTextPending,
                ]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={{ gap: Spacing.sm }}>
          <BanglaBookButton
            label={isCompleted ? (isEnglish ? '▶ Start Listening Now' : '▶ এখনই শোনা শুরু করুন') : (isEnglish ? '🎧 Listen Progressively' : '🎧 প্রগ্রেসিভ শুনুন')}
            onPress={handleListen}
            variant="primary"
          />

          {!isCompleted && !isFailed && (
            <BanglaBookButton
              label={isCancelling ? (isEnglish ? 'Cancelling...' : 'বাতিল হচ্ছে...') : (isEnglish ? 'Cancel Generation' : 'অনুরোধ বাতিল করুন')}
              onPress={handleCancel}
              variant="secondary"
              isLoading={isCancelling}
            />
          )}

          {isFailed && (
            <BanglaBookButton
              label={isRetrying ? (isEnglish ? 'Retrying...' : 'পুনরায় চেষ্টা...') : (isEnglish ? 'Retry Generation' : 'পুনরায় চেষ্টা করুন')}
              onPress={handleRetry}
              variant="primary"
              isLoading={isRetrying}
            />
          )}
        </View>
      </ScrollView>
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
  statusHeroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  statusBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  statusTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  progressContainer: {
    gap: 6,
    marginTop: 4,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#E2DBD2',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  progressPercentText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'right',
    fontWeight: '600',
  },
  stepsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  stepsTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: {
    backgroundColor: Colors.tintGreen,
  },
  stepDotPending: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  stepDotIcon: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stepText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  stepTextDone: {
    color: Colors.textPrimary,
  },
  stepTextPending: {
    color: Colors.textMuted,
  },
});
