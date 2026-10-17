import React, { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '../../components/AppHeader';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

interface SplashScreenProps {
  onContinue: () => void;
  /** False until the app knows where to go next (first run vs. returning user). */
  ready?: boolean;
}

export function SplashScreen({ onContinue, ready = true }: SplashScreenProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(onContinue, 1400);
    return () => clearTimeout(timer);
  }, [onContinue, ready]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={t('appName')}
        subtitle={t('appTagline')}
      />

      <Pressable style={styles.mainContainer} onPress={ready ? onContinue : undefined}>
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
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.onDarkHairline,
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
    color: Colors.textOnDarkSecondary,
    letterSpacing: 0.2,
    marginBottom: Spacing.md,
  },
  badgeContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.onDarkFill,
    marginTop: Spacing.xs,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    color: Colors.textOnDark,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});
