/**
 * CreateAudiobookScreen — Step 1: Metadata entry matching Figma aesthetics.
 * Bangla/English language choice, visibility, publisher channel picker, and generation quota.
 */

import React, { useEffect, useState } from 'react';
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
import { BanglaBookHeader } from '../../components/BanglaBookHeader';
import { BanglaBookButton } from '../../components/BanglaBookButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { apiClient } from '../../api/client';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'CreateAudiobook'>;

export function CreateAudiobookScreen() {
  const nav = useNavigation<Nav>();
  const { t, isEnglish } = useLanguage();
  const { user } = useAuth();

  const isPublisher = user?.account_type === 'publisher';

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [genre, setGenre] = useState('Literature');
  const [narrationLanguage, setNarrationLanguage] = useState<'bn' | 'en'>('bn');
  const [visibility, setVisibility] = useState<AudiobookVisibility>('PRIVATE');
  const [accessTier, setAccessTier] = useState<'free' | 'premium'>('free');

  // Channels for publishers
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('');

  // Generation quota
  const [quota, setQuota] = useState({ used: 0, limit: 5, plan: 'Free' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get<any>('/generation/quota')
      .then(setQuota)
      .catch(() => {});

    if (isPublisher) {
      apiClient
        .get<any[]>('/publisher/channels')
        .then((chs) => {
          setChannels(chs);
          if (chs.length > 0) setSelectedChannelId(chs[0].id);
        })
        .catch(() => {});
    }
  }, [isPublisher]);

  async function handleProceed() {
    if (!title.trim()) {
      Alert.alert(
        isEnglish ? 'Required Field' : 'প্রয়োজনীয় তথ্য',
        isEnglish ? 'Please enter a book title.' : 'অনুগ্রহ করে বইয়ের শিরোনাম লিখুন।',
      );
      return;
    }

    if (quota.used >= quota.limit) {
      Alert.alert(
        isEnglish ? 'Quota Exceeded' : 'কোটা সমাপ্ত',
        isEnglish
          ? 'Monthly generation quota reached. Upgrade to Premium for higher limits.'
          : 'আপনার মাসিক অডিওবুক রূপান্তর কোটা পূর্ণ হয়েছে। উচ্চতর কোটার জন্য Premium নিন।',
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
        genre: genre || undefined,
        visibility: isPublisher ? visibility : 'PRIVATE',
      });
      nav.replace('UploadSource', { audiobookId: audiobook.id });
    } catch (err: any) {
      Alert.alert(
        isEnglish ? 'Creation Error' : 'ত্রুটি',
        err.detail || err.message || 'Could not create audiobook record.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <BanglaBookHeader
        title={t('createTitle')}
        subtitle={isPublisher ? (isEnglish ? 'Publish new title' : 'নতুন অডিওবুক প্রকাশ') : t('createSub')}
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
                  ? `${quota.plan} Plan Quota`
                  : `${quota.plan} প্ল্যান কোটা`}
              </Text>
              <Text style={styles.quotaCounter}>
                {isEnglish
                  ? `${quota.used}/${quota.limit} Used`
                  : `${quota.used}/${quota.limit} ব্যবহৃত`}
              </Text>
            </View>
            <View style={styles.quotaBarTrack}>
              <View
                style={[
                  styles.quotaBarFill,
                  { width: `${Math.min(100, quota.limit ? (quota.used / quota.limit) * 100 : 0)}%` },
                ]}
              />
            </View>
            <Text style={styles.quotaSub}>
              {isEnglish
                ? 'Requests gain priority over wait time in our fair scheduling queue.'
                : 'আমাদের অগ্রাধিকার ও এজ-শিডিউলিং সিস্টেমে প্রসেসিং সম্পন্ন হয়।'}
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
              <Text style={styles.label}>{isEnglish ? 'Author' : 'লেখক'}</Text>
              <TextInput
                style={styles.input}
                value={author}
                onChangeText={setAuthor}
                placeholder={isEnglish ? 'Author name' : 'লেখকের নাম'}
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            {/* Description */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{isEnglish ? 'Description' : 'বিবরণ'}</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={isEnglish ? 'Short description or summary...' : 'সংক্ষিপ্ত বিবরণ বা সারসংক্ষেপ...'}
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Language Choice */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.label}>{isEnglish ? 'Narration Language' : 'আবৃত্তির ভাষা'}</Text>
              <View style={styles.pillRow}>
                <Pressable
                  style={[styles.pill, narrationLanguage === 'bn' && styles.pillActive]}
                  onPress={() => setNarrationLanguage('bn')}
                >
                  <Text style={[styles.pillText, narrationLanguage === 'bn' && styles.pillTextActive]}>
                    🇧🇩 বাংলা (Bangla)
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.pill, narrationLanguage === 'en' && styles.pillActive]}
                  onPress={() => setNarrationLanguage('en')}
                >
                  <Text style={[styles.pillText, narrationLanguage === 'en' && styles.pillTextActive]}>
                    🇬🇧 English
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Publisher Channel & Tier Selection */}
            {isPublisher && (
              <>
                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>{isEnglish ? 'Access Tier' : 'অ্যাক্সেস টিয়ার'}</Text>
                  <View style={styles.pillRow}>
                    <Pressable
                      style={[styles.pill, accessTier === 'free' && styles.pillActive]}
                      onPress={() => setAccessTier('free')}
                    >
                      <Text style={[styles.pillText, accessTier === 'free' && styles.pillTextActive]}>
                        Free Audiobook
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.pill, accessTier === 'premium' && styles.pillActive]}
                      onPress={() => setAccessTier('premium')}
                    >
                      <Text style={[styles.pillText, accessTier === 'premium' && styles.pillTextActive]}>
                        ⭐ Premium (Revenue Eligible)
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {channels.length > 0 && (
                  <View style={styles.fieldWrapper}>
                    <Text style={styles.label}>{isEnglish ? 'Select Channel' : 'চ্যানেল নির্বাচন করুন'}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                      {channels.map((ch) => (
                        <Pressable
                          key={ch.id}
                          style={[styles.pill, selectedChannelId === ch.id && styles.pillActive]}
                          onPress={() => setSelectedChannelId(ch.id)}
                        >
                          <Text style={[styles.pillText, selectedChannelId === ch.id && styles.pillTextActive]}>
                            📺 {ch.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.fieldWrapper}>
                  <Text style={styles.label}>{isEnglish ? 'Visibility' : 'দৃশ্যমানতা'}</Text>
                  <View style={styles.pillRow}>
                    <Pressable
                      style={[styles.pill, visibility === 'PUBLIC' && styles.pillActive]}
                      onPress={() => setVisibility('PUBLIC')}
                    >
                      <Text style={[styles.pillText, visibility === 'PUBLIC' && styles.pillTextActive]}>
                        🌐 {isEnglish ? 'Public' : 'পাবলিক'}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.pill, visibility === 'PRIVATE' && styles.pillActive]}
                      onPress={() => setVisibility('PRIVATE')}
                    >
                      <Text style={[styles.pillText, visibility === 'PRIVATE' && styles.pillTextActive]}>
                        🔒 {isEnglish ? 'Private' : 'প্রাইভেট'}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </>
            )}
          </View>

          {/* CTA Proceed Button */}
          <BanglaBookButton
            label={isSubmitting ? t('btnCreatingAccount') : (isEnglish ? 'Proceed to Upload →' : 'পরবর্তী ধাপে যান →')}
            onPress={handleProceed}
            variant="primary"
            isLoading={isSubmitting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
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
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.xs,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quotaPlan: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quotaCounter: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.primary,
  },
  quotaBarTrack: {
    height: 6,
    backgroundColor: '#E2DBD2',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  quotaBarFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  quotaSub: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
  },
  fieldWrapper: {
    gap: 6,
  },
  label: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  input: {
    height: 48,
    backgroundColor: Colors.surfaceElevated,
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
  },
  pillRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: '700',
  },
});
