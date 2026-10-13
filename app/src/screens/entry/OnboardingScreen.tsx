/**
 * OnboardingScreen — 3-step carousel matching Figma Plate 1 Screens 2, 3, 4.
 * Features Discover, Listen, and Create slides with exact artwork, indicators, and CTA.
 *
 * Design Patterns:
 * - Strategy Pattern: Dynamic step content mapped to active language strategy.
 * - Composite UI Pattern: Responsive artwork card, interactive progress tabs, dual-action buttons.
 */

import React, { useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BanglaBookHeader } from '../../components/BanglaBookHeader';
import { BanglaBookButton } from '../../components/BanglaBookButton';
import { TagBadge } from '../../components/TagBadge';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

interface OnboardingScreenProps {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { t, isEnglish } = useLanguage();
  const { height: screenHeight } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);

  const steps = [
    {
      key: 'discover',
      title: t('onboardingStep1Title'),
      stepLabel: isEnglish ? 'Discover · 1/3' : 'খুঁজুন · ১/৩',
      tabLabel: isEnglish ? 'Discover' : 'খুঁজুন',
      cardTitle: t('onboardingStep1Title'),
      cardSub: isEnglish ? 'Bangla · English · Offline' : 'বাংলা · ইংরেজি · অফলাইন',
      description: t('onboardingStep1Desc'),
      ctaText: isEnglish ? 'Next ›' : 'পরবর্তী ›',
      image: require('../../../assets/illustrations/onboarding_discover.jpg'),
    },
    {
      key: 'listen',
      title: t('onboardingStep2Title'),
      stepLabel: isEnglish ? 'Listen · 2/3' : 'শুনুন · ২/৩',
      tabLabel: isEnglish ? 'Listen' : 'শুনুন',
      cardTitle: t('onboardingStep2Title'),
      cardSub: isEnglish ? 'Bangla · English · Offline' : 'বাংলা · ইংরেজি · অফলাইন',
      description: t('onboardingStep2Desc'),
      ctaText: isEnglish ? 'Next ›' : 'পরবর্তী ›',
      image: require('../../../assets/illustrations/onboarding_listen.jpg'),
    },
    {
      key: 'create',
      title: t('onboardingStep3Title'),
      stepLabel: isEnglish ? 'Create · 3/3' : 'তৈরি · ৩/৩',
      tabLabel: isEnglish ? 'Create' : 'তৈরি',
      cardTitle: t('onboardingStep3Title'),
      cardSub: isEnglish ? 'AI Speech · Natural Voice' : 'এআই ভয়েস · ন্যাচারাল স্পিচ',
      description: t('onboardingStep3Desc'),
      ctaText: isEnglish ? 'Get Started ✦' : 'শুরু করুন ✦',
      image: require('../../../assets/illustrations/onboarding_create.jpg'),
    },
  ];

  const currentStep = steps[currentIndex];

  const handleNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      onFinish();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Dynamically size the illustration card to fit any screen height comfortably
  const cardHeight = Math.min(300, Math.max(220, Math.round(screenHeight * 0.33)));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header with title, step counter, back button and skip action */}
      <BanglaBookHeader
        title={currentStep.title}
        subtitle={currentStep.stepLabel}
        onBack={currentIndex > 0 ? handlePrev : undefined}
        rightActionText={isEnglish ? 'Skip' : 'এড়িয়ে যান'}
        onRightAction={onFinish}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Artwork Card */}
        <View style={[styles.cardContainer, { height: cardHeight }]}>
          <Image
            source={currentStep.image}
            style={styles.illustration}
            resizeMode="cover"
          />

          {/* Top Pill Badge */}
          <View style={styles.badgeWrapper}>
            <TagBadge label={t('editorialPick')} variant="editorial" />
          </View>

          {/* Bottom Dark Translucent Overlay matching Figma */}
          <View style={styles.cardBottomOverlay}>
            <Text style={styles.overlayTitle} numberOfLines={1}>
              {currentStep.cardTitle}
            </Text>
            <Text style={styles.overlaySub} numberOfLines={1}>
              {currentStep.cardSub}
            </Text>
          </View>
        </View>

        {/* Informative Description Card */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionText}>
            {currentStep.description}
          </Text>
        </View>

        {/* Step Indicator Tabs with Labels on TOP and Lines BELOW */}
        <View style={styles.indicatorContainer}>
          {steps.map((step, idx) => {
            const isActive = currentIndex === idx;
            const isPassed = idx < currentIndex;
            return (
              <Pressable
                key={step.key}
                onPress={() => setCurrentIndex(idx)}
                style={styles.stepColumn}
                hitSlop={10}
                accessibilityRole="tab"
                accessibilityLabel={`${step.tabLabel} slide`}
                accessibilityState={{ selected: isActive }}
              >
                <Text
                  style={[
                    styles.stepLabel,
                    isActive && styles.stepLabelActive,
                    isPassed && styles.stepLabelPassed,
                  ]}
                >
                  {step.tabLabel}
                </Text>
                <View
                  style={[
                    styles.stepLine,
                    isActive && styles.stepLineActive,
                    isPassed && styles.stepLinePassed,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>

        {/* Actions Section: Primary Button & Secondary Text Actions */}
        <View style={styles.actionsContainer}>
          <BanglaBookButton
            label={currentStep.ctaText}
            onPress={handleNext}
            variant="primary"
          />

          {/* Secondary Text Buttons Row */}
          <View style={styles.textButtonsRow}>
            {currentIndex > 0 ? (
              <Pressable
                style={({ pressed }) => [styles.textBtn, pressed && styles.btnPressed]}
                onPress={handlePrev}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go to previous slide"
              >
                <Text style={styles.prevBtnText}>
                  {isEnglish ? '‹ Previous' : '‹ পূর্ববর্তী'}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.textBtnSpacer} />
            )}

            <Pressable
              style={({ pressed }) => [styles.textBtn, pressed && styles.btnPressed]}
              onPress={onFinish}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Skip intro"
            >
              <Text style={styles.skipBtnText}>
                {currentIndex < steps.length - 1
                  ? (isEnglish ? 'Skip Tour ›' : 'স্কিপ করুন ›')
                  : (isEnglish ? 'Explore App ›' : 'এখনই দেখুন ›')}
              </Text>
            </Pressable>
          </View>
        </View>
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
    flexGrow: 1,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '100%',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: '#ECE5DB',
    shadowColor: '#2C2216',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  badgeWrapper: {
    position: 'absolute',
    top: Spacing.sm + 2,
    left: Spacing.sm + 2,
  },
  cardBottomOverlay: {
    position: 'absolute',
    bottom: Spacing.sm + 2,
    left: Spacing.sm + 2,
    right: Spacing.sm + 2,
    backgroundColor: 'rgba(23, 22, 26, 0.92)',
    borderRadius: Radius.lg,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: FontSizes.base,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  overlaySub: {
    color: '#D1CBC2',
    fontSize: FontSizes.xs,
    marginTop: 2,
    fontWeight: '500',
  },
  descriptionCard: {
    marginVertical: Spacing.sm,
    paddingHorizontal: 2,
  },
  descriptionText: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    lineHeight: 23,
    letterSpacing: -0.1,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  stepColumn: {
    flex: 1,
    paddingVertical: 4,
  },
  stepLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  stepLabelPassed: {
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  stepLine: {
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: '#E4DDD3',
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  stepLinePassed: {
    backgroundColor: '#D17C69',
  },
  actionsContainer: {
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  textButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    minHeight: 36,
  },
  textBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  textBtnSpacer: {
    flex: 1,
  },
  btnPressed: {
    opacity: 0.65,
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  prevBtnText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  skipBtnText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
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
