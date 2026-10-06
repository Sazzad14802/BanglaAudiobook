import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShrutiHeader } from '../../components/ShrutiHeader';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

interface SplashScreenProps {
  onContinue: () => void;
}

export function SplashScreen({ onContinue }: SplashScreenProps) {
  const { t } = useLanguage();

  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, 2400);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader
        title={t('appName')}
        subtitle={t('appTagline')}
        onOptionsPress={() => {}}
      />

      <Pressable style={styles.mainContainer} onPress={onContinue}>
        {/* Dark Charcoal Hero Card */}
        <View style={styles.darkCard}>
          {/* Official App Logo */}
          <View style={styles.logoWrapper}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Brand Name */}
          <Text style={styles.brandTitle}>{t('appName')}</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>{t('appTagline')}</Text>

          {/* Badge */}
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{t('splashBadge')}</Text>
          </View>
        </View>
      </Pressable>

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
  mainContainer: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    justifyContent: 'center',
  },
  darkCard: {
    flex: 1,
    backgroundColor: Colors.surfaceDark,
    borderRadius: Radius.xl + 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  logoWrapper: {
    width: 140,
    height: 140,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.xl,
  },
  brandTitle: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSizes.sm,
    color: '#B5B1A8',
    letterSpacing: 0.2,
    marginBottom: Spacing.md,
  },
  badgeContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: Spacing.xs,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    color: '#F4ECE1',
    fontWeight: '600',
    letterSpacing: 0.5,
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
