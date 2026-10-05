/**
 * LanguageSelectScreen — Language selection matching Figma Plate 1 Screen 5.
 * Bangla, English, and Bangla + English options.
 */

import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

interface LanguageSelectScreenProps {
  onBack: () => void;
  onContinue: (lang: 'bn' | 'en' | 'mixed') => void;
}

export function LanguageSelectScreen({ onBack, onContinue }: LanguageSelectScreenProps) {
  const [selectedLang, setSelectedLang] = useState<'bn' | 'en' | 'mixed'>('bn');

  const options = [
    {
      id: 'bn' as const,
      title: 'বাংলা',
      subtitle: 'বাংলা UI · selected',
      styleType: 'dark',
    },
    {
      id: 'en' as const,
      title: 'English',
      subtitle: 'English interface',
      styleType: 'neutral',
    },
    {
      id: 'mixed' as const,
      title: 'বাংলা + English',
      subtitle: 'Mixed labels',
      styleType: 'blue',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader

        title="ভাষা বেছে নিন"
        subtitle="Bangla-first"
        onBack={onBack}
        onOptionsPress={() => {}}
      />

      <View style={styles.content}>
        <View style={styles.optionsList}>
          {options.map((opt) => {
            const isSelected = selectedLang === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedLang(opt.id)}
                style={({ pressed }) => [
                  styles.optionCard,
                  opt.styleType === 'dark' && styles.cardDark,
                  opt.styleType === 'neutral' && styles.cardNeutral,
                  opt.styleType === 'blue' && styles.cardBlue,
                  isSelected && styles.cardSelectedBorder,
                  pressed && styles.cardPressed,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <Text
                  style={[
                    styles.cardTitle,
                    opt.styleType === 'dark' ? styles.textWhite : styles.textDark,
                  ]}
                >
                  {opt.title}
                </Text>
                <Text
                  style={[
                    styles.cardSub,
                    opt.styleType === 'dark' ? styles.subMutedWhite : styles.subMutedDark,
                  ]}
                >
                  {opt.subtitle}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* CTA Button */}
        <View style={styles.buttonWrapper}>
          <ShrutiButton
            label="চালিয়ে যান"
            onPress={() => onContinue(selectedLang)}
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
  optionsList: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  optionCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  cardDark: {
    backgroundColor: Colors.surfaceDark,
  },
  cardNeutral: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardBlue: {
    backgroundColor: Colors.tintBlue,
    borderWidth: 1,
    borderColor: '#C8E3F2',
  },
  cardSelectedBorder: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  cardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  cardTitle: {
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  cardSub: {
    fontSize: FontSizes.xs + 1,
    marginTop: 4,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textDark: {
    color: Colors.textPrimary,
  },
  subMutedWhite: {
    color: '#B5B1A8',
  },
  subMutedDark: {
    color: Colors.textSecondary,
  },
  buttonWrapper: {
    marginTop: Spacing.md,
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
