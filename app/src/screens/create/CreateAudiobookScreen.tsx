/**
 * CreateAudiobookScreen — Step 1: Metadata entry matching Figma aesthetics.
 * Bangla/English language choice, visibility, and generation monthly quota.
 */

import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { audiobooksApi } from '../../api/audiobooks';
import { AudiobookVisibility } from '../../types/audiobook';
import { CreateStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError } from '../../api/client';
import { useLanguage } from '../../contexts/LanguageContext';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'CreateAudiobook'>;

export function CreateAudiobookScreen() {
  const nav = useNavigation<Nav>();
  const { t, isEnglish } = useLanguage();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [narrationLanguage, setNarrationLanguage] = useState<'bn' | 'en'>('bn');
  const [visibility, setVisibility] = useState<AudiobookVisibility>('PRIVATE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quota status
  const generationQuota = { used: 1, limit: 3, plan: 'Free' };

  async function handleProceed() {
    if (!title.trim()) {
      Alert.alert(
        isEnglish ? 'Required Field' : 'প্রয়োজনীয় তথ্য',
        isEnglish ? 'Please enter a book title.' : 'অনুগ্রহ করে বইয়ের শিরোনাম লিখুন।',
      );
      return;
    }

    if (generationQuota.used >= generationQuota.limit) {
      Alert.alert(
        isEnglish ? 'Quota Exceeded' : 'কোটা সমাপ্ত',
        isEnglish
          ? 'Monthly generation quota reached. Upgrade to Premium for unlimited creations.'
          : 'আপনার মাসিক অডিওবুক রূপান্তর কোটা পূর্ণ হয়েছে। আনলিমিটেড রূপান্তরের জন্য Premium নিন।',
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const audiobook = await audiobooksApi.create({
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        language: narrationLanguage,
        visibility,
      });
      nav.replace('UploadSource', { audiobookId: audiobook.id });
    } catch {
      // In demo / offline mode, proceed with mock ID
      nav.replace('UploadSource', { audiobookId: `demo-gen-${Date.now()}` });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader
        title={t('createTitle')}
        subtitle={t('createSub')}
        onOptionsPress={() => {}}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quota Banner */}
          <View style={styles.quotaCard}>
            <View style={styles.quotaHeader}>
              <Text style={styles.quotaPlan}>
                {isEnglish
                  ? `${generationQuota.plan} Plan Quota`
                  : `${generationQuota.plan} প্ল্যান কোটা`}
              </Text>
              <Text style={styles.quotaCounter}>
                {isEnglish
                  ? `${generationQuota.used}/${generationQuota.limit} Used`
                  : `${generationQuota.used}/${generationQuota.limit} ব্যবহৃত`}
              </Text>
            </View>
            <View style={styles.quotaBarTrack}>
              <View
                style={[
                  styles.quotaBarFill,
                  { width: `${(generationQuota.used / generationQuota.limit) * 100}%` },
                ]}
              />
            </View>
            <Text style={styles.quotaSub}>
              {isEnglish
                ? 'Upgrade to Premium for higher priority and unlimited conversions.'
                : 'উচ্চতর অগ্রাধিকার এবং দ্রুততর জেনারেশনের জন্য Premium প্ল্যানে আপগ্রেড করুন।'}
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Title */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{t('inputBookTitle')} *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder={t('inputBookTitlePlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Author */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{t('inputAuthorName')}</Text>
              <TextInput
                style={styles.input}
                value={author}
                onChangeText={setAuthor}
                placeholder={t('inputAuthorPlaceholder')}
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Language Selection */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{t('languageSelectChoice')}</Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() => setNarrationLanguage('bn')}
                  style={[
                    styles.choiceCard,
                    narrationLanguage === 'bn' ? styles.choiceSelected : styles.choiceDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceTitle,
                      narrationLanguage === 'bn' ? styles.textWhite : styles.textDark,
                    ]}
                  >
                    বাংলা
                  </Text>
                  <Text
                    style={[
                      styles.choiceSub,
                      narrationLanguage === 'bn' ? styles.textSubWhite : styles.textSubDark,
                    ]}
                  >
                    Bangla VITS TTS
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setNarrationLanguage('en')}
                  style={[
                    styles.choiceCard,
                    narrationLanguage === 'en' ? styles.choiceSelected : styles.choiceDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceTitle,
                      narrationLanguage === 'en' ? styles.textWhite : styles.textDark,
                    ]}
                  >
                    English
                  </Text>
                  <Text
                    style={[
                      styles.choiceSub,
                      narrationLanguage === 'en' ? styles.textSubWhite : styles.textSubDark,
                    ]}
                  >
                    XTTS v2
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Visibility Selection */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{t('visibilityChoice')}</Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() => setVisibility('PRIVATE')}
                  style={[
                    styles.choiceCard,
                    visibility === 'PRIVATE' ? styles.choiceSelected : styles.choiceDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceTitle,
                      visibility === 'PRIVATE' ? styles.textWhite : styles.textDark,
                    ]}
                  >
                    {isEnglish ? '🔒 Private' : '🔒 ব্যক্তিগত'}
                  </Text>
                  <Text
                    style={[
                      styles.choiceSub,
                      visibility === 'PRIVATE' ? styles.textSubWhite : styles.textSubDark,
                    ]}
                  >
                    {isEnglish ? 'Only for you' : 'শুধুমাত্র আপনার জন্য'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setVisibility('PUBLIC')}
                  style={[
                    styles.choiceCard,
                    visibility === 'PUBLIC' ? styles.choiceSelected : styles.choiceDefault,
                  ]}
                >
                  <Text
                    style={[
                      styles.choiceTitle,
                      visibility === 'PUBLIC' ? styles.textWhite : styles.textDark,
                    ]}
                  >
                    {isEnglish ? '🌐 Public' : '🌐 সবার জন্য'}
                  </Text>
                  <Text
                    style={[
                      styles.choiceSub,
                      visibility === 'PUBLIC' ? styles.textSubWhite : styles.textSubDark,
                    ]}
                  >
                    {isEnglish ? 'Added to catalog' : 'ক্যাটালগে যুক্ত হবে'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Description */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>
                {isEnglish ? 'Description (Optional)' : 'সংক্ষিপ্ত বিবরণ'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  isEnglish
                    ? 'Write a short synopsis or chapter summary...'
                    : 'বই সম্পর্কে কিছু লিখুন...'
                }
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* CTA Proceed Button */}
          <ShrutiButton
            label={t('btnUploadSource')}
            onPress={handleProceed}
            variant="primary"
            isLoading={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>

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
    gap: Spacing.md,
  },
  quotaCard: {
    backgroundColor: Colors.tintBlue,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quotaPlan: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.tintBlueText,
  },
  quotaCounter: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '600',
    color: Colors.tintBlueText,
  },
  quotaBarTrack: {
    height: 4,
    backgroundColor: '#C5DFED',
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: 6,
  },
  quotaBarFill: {
    height: '100%',
    backgroundColor: '#1B658A',
  },
  quotaSub: {
    fontSize: FontSizes.xs,
    color: Colors.tintBlueText,
    lineHeight: 16,
  },
  formContainer: {
    gap: Spacing.md,
  },
  fieldWrapper: {
    gap: 4,
  },
  label: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  input: {
    height: 50,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.sm,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  choiceCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  choiceSelected: {
    backgroundColor: Colors.surfaceDark,
  },
  choiceDefault: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  choiceTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  choiceSub: {
    fontSize: FontSizes.xs - 1,
    marginTop: 2,
  },
  textWhite: {
    color: '#FFFFFF',
  },
  textDark: {
    color: Colors.textPrimary,
  },
  textSubWhite: {
    color: '#B5B1A8',
  },
  textSubDark: {
    color: Colors.textSecondary,
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
