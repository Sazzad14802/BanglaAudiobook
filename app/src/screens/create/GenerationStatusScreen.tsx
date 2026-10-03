/**
 * GenerationStatusScreen — Live generation pipeline tracker.
 * Communicates: Uploading → Processing → Queued → Generating → Completed/Failed.
 * Shows queue priority (Premium > Free, FCFS).
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CreateStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { TagBadge } from '../../components/TagBadge';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'GenerationStatus'>;
type Route = RouteProp<CreateStackParamList, 'GenerationStatus'>;

type PipelineStep = 'uploading' | 'processing' | 'queued' | 'generating' | 'completed' | 'failed';

export function GenerationStatusScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const audiobookId = route.params?.audiobookId ?? 'new-book';

  const [currentStep, setCurrentStep] = useState<PipelineStep>('queued');
  const [queuePosition, setQueuePosition] = useState(2);
  const [progressPercent, setProgressPercent] = useState(45);

  useEffect(() => {
    // Simulate real pipeline progression
    const timer1 = setTimeout(() => {
      setCurrentStep('generating');
      setQueuePosition(1);
    }, 2500);

    const timer2 = setTimeout(() => {
      setProgressPercent(85);
    }, 4500);

    const timer3 = setTimeout(() => {
      setCurrentStep('completed');
      setProgressPercent(100);
    }, 6500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  const stepsList = [
    { key: 'uploading', label: 'PDF আপলোড সম্পন্ন' },
    { key: 'processing', label: 'টেক্সট নিষ্কাশন ও ওসিআর' },
    { key: 'queued', label: `কিউতে অপেক্ষারত (অগ্রাধিকার: উচ্চ, অবস্থান: #${queuePosition})` },
    { key: 'generating', label: 'বাংলা এআই স্পিচ সংশ্লেষণ (TTS)' },
    { key: 'completed', label: 'অডিওবুক তৈরি সম্পন্ন' },
  ];

  const isCompleted = currentStep === 'completed';

  const handleListen = () => {
    nav.navigate('AudiobookDetails', { audiobookId: 'pather-panchali' });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ShrutiHeader
        title="রূপান্তর অগ্রগতি"
        subtitle="AI Audiobook Generation"
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
              label={isCompleted ? 'COMPLETED' : 'IN PROGRESS'}
              variant={isCompleted ? 'free' : 'premium'}
            />
            <Text style={styles.priorityText}>Priority: High (FCFS)</Text>
          </View>

          <Text style={styles.statusTitle}>
            {isCompleted
              ? 'অডিওবুক সফলভাবে তৈরি হয়েছে!'
              : 'কৃত্রিম বুদ্ধিমত্তা দিয়ে অডিও তৈরি হচ্ছে'}
          </Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarTrack}>
              <View
                style={[styles.progressBarFill, { width: `${progressPercent}%` }]}
              />
            </View>
            <Text style={styles.progressPercentText}>{progressPercent}%</Text>
          </View>
        </View>

        {/* Pipeline Step List */}
        <View style={styles.pipelineContainer}>
          <Text style={styles.pipelineHeading}>ধাপসমূহ (Pipeline)</Text>

          {stepsList.map((step, idx) => {
            const isDone =
              currentStep === 'completed' ||
              (currentStep === 'generating' && idx <= 2) ||
              (currentStep === 'queued' && idx <= 1);
            const isCurrent =
              (currentStep === 'queued' && idx === 2) ||
              (currentStep === 'generating' && idx === 3) ||
              (currentStep === 'completed' && idx === 4);

            return (
              <View key={step.key} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepBullet,
                    isDone && styles.bulletDone,
                    isCurrent && styles.bulletCurrent,
                  ]}
                >
                  {isDone ? (
                    <Text style={styles.checkmark}>✓</Text>
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.bulletNumber}>{idx + 1}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isCurrent && styles.stepLabelActive,
                    isDone && styles.stepLabelDone,
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Action Button */}
        {isCompleted && (
          <ShrutiButton
            label="• অডিওবুক শুনুন"
            onPress={handleListen}
            variant="primary"
          />
        )}
      </ScrollView>

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
    gap: Spacing.lg,
  },
  statusHeroCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
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
    lineHeight: 26,
    marginTop: 4,
  },
  progressContainer: {
    marginTop: Spacing.xs,
    gap: 4,
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#EAE4DA',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  progressPercentText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    alignSelf: 'flex-end',
    fontWeight: '600',
  },
  pipelineContainer: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  pipelineHeading: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stepBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DCD4C9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletDone: {
    backgroundColor: Colors.tintGreenText,
  },
  bulletCurrent: {
    backgroundColor: Colors.primary,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bulletNumber: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  stepLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  stepLabelDone: {
    color: Colors.tintGreenText,
    fontWeight: '600',
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
