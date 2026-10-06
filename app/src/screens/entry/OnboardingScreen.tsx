/**
 * OnboardingScreen — 3-step carousel matching Figma Plate 1 Screens 2, 3, 4.
 * Features Discover, Listen, and Create slides with exact artwork, indicators, and CTA.
 */

import React, { useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { TagBadge } from '../../components/TagBadge';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

interface OnboardingScreenProps {
  onFinish: () => void;
}

export function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { t, isEnglish } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const steps = [
    {
      key: 'discover',
      title: t('onboardingStep1Title'),
      stepLabel: isEnglish ? 'Discover · 1/3' : 'Discover · ১/৩',
      cardTitle: t('onboardingStep1Title'),
      cardSub: isEnglish ? 'Bangla · English · Offline' : 'বাংলা · English · Offline',
      description: t('onboardingStep1Desc'),
      ctaText: t('btnNext'),
      image: require('../../../assets/illustrations/onboarding_discover.jpg'),
    },
    {
      key: 'listen',
      title: t('onboardingStep2Title'),
      stepLabel: isEnglish ? 'Listen · 2/3' : 'Listen · ২/৩',
      cardTitle: t('onboardingStep2Title'),
      cardSub: isEnglish ? 'Bangla · English · Offline' : 'বাংলা · English · Offline',
      description: t('onboardingStep2Desc'),
      ctaText: t('btnNext'),
      image: require('../../../assets/illustrations/onboarding_listen.jpg'),
    },
    {
      key: 'create',
      title: t('onboardingStep3Title'),
      stepLabel: isEnglish ? 'Create · 3/3' : 'Create · ৩/৩',
      cardTitle: t('onboardingStep3Title'),
      cardSub: isEnglish ? 'Bangla · English · Offline' : 'বাংলা · English · Offline',
      description: t('onboardingStep3Desc'),
      ctaText: t('btnGetStarted'),
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

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader

        title={currentStep.title}
        subtitle={currentStep.stepLabel}
        onOptionsPress={() => {}}
      />

      <View style={styles.content}>
        {/* Visual Artwork Card */}
        <View style={styles.cardContainer}>
          <Image source={currentStep.image} style={styles.illustration} resizeMode="cover" />

          {/* Top Pill Badge */}
          <View style={styles.badgeWrapper}>
            <TagBadge label="SHRUTI EDITOR'S PICK" variant="editorial" />
          </View>

          {/* Bottom Dark Overlay */}
          <View style={styles.cardBottomOverlay}>
            <Text style={styles.overlayTitle}>{currentStep.cardTitle}</Text>
            <Text style={styles.overlaySub}>{currentStep.cardSub}</Text>
          </View>
        </View>

        {/* Descriptive Text */}
        <Text style={styles.descriptionText}>{currentStep.description}</Text>

        {/* Step Indicator Tabs */}
        <View style={styles.indicatorContainer}>
          <View style={styles.stepColumn}>
            <View
              style={[
                styles.stepLine,
                currentIndex >= 0 && styles.stepLineActive,
              ]}
            />
            <Text style={styles.stepLabel}>Discover</Text>
          </View>

          <View style={styles.stepColumn}>
            <View
              style={[
                styles.stepLine,
                currentIndex >= 1 && styles.stepLineActive,
              ]}
            />
            <Text style={styles.stepLabel}>Listen</Text>
          </View>

          <View style={styles.stepColumn}>
            <View
              style={[
                styles.stepLine,
                currentIndex >= 2 && styles.stepLineActive,
              ]}
            />
            <Text style={styles.stepLabel}>Create</Text>
          </View>
        </View>

        {/* CTA Button */}
        <View style={styles.buttonWrapper}>
          <ShrutiButton
            label={currentStep.ctaText}
            onPress={handleNext}
            variant="primary"
          />
        </View>
      </View>

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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
    paddingBottom: Spacing.md,
  },
  cardContainer: {
    height: 300,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  badgeWrapper: {
    position: 'absolute',
    top: Spacing.md,
    left: Spacing.md,
  },
  cardBottomOverlay: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(25, 24, 27, 0.90)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },
  overlayTitle: {
    color: '#FFFFFF',
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  overlaySub: {
    color: '#CCC8C0',
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  descriptionText: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginVertical: Spacing.sm,
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginVertical: Spacing.sm,
  },
  stepColumn: {
    flex: 1,
  },
  stepLine: {
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: '#E0DAD1',
    marginBottom: 4,
  },
  stepLineActive: {
    backgroundColor: Colors.primary,
  },
  stepLabel: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textSecondary,
  },
  buttonWrapper: {
    marginTop: Spacing.sm,
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
