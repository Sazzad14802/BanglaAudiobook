/**
 * SplashScreen — Branded entry splash matching Figma Plate 1 Screen 1.
 */

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShrutiHeader } from '../../components/ShrutiHeader';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

interface SplashScreenProps {
  onContinue: () => void;
}

export function SplashScreen({ onContinue }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onContinue();
    }, 2400);
    return () => clearTimeout(timer);
  }, [onContinue]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader

        title="শ্রুতি"
        subtitle="বাংলা অডিওবুক, নিজের মতো"
        onOptionsPress={() => {}}
      />

      <Pressable style={styles.mainContainer} onPress={onContinue}>
        {/* Dark Charcoal Hero Card */}
        <View style={styles.darkCard}>
          {/* Logo Squircle Badge */}
          <View style={styles.logoSquircle}>
            <Text style={styles.logoCharacter}>শ্র</Text>
          </View>

          {/* Brand Name */}
          <Text style={styles.brandTitle}>শ্রুতি</Text>

          {/* Tagline */}
          <Text style={styles.tagline}>
            শুনুন · সংরক্ষণ করুন · তৈরি করুন
          </Text>
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
  logoSquircle: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg + 2,
    backgroundColor: '#E5A93C', // Warm golden amber badge
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoCharacter: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.surfaceDark,
  },
  brandTitle: {
    fontSize: FontSizes['3xl'],
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  tagline: {
    fontSize: FontSizes.sm,
    color: '#B5B1A8',
    letterSpacing: 0.2,
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
