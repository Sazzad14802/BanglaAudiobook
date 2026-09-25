/**
 * CreateAudiobookScreen — Step 1: Enter audiobook metadata.
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { audiobooksApi } from '../../api/audiobooks';
import { AudiobookVisibility } from '../../types/audiobook';
import { CreateStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError } from '../../api/client';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'CreateAudiobook'>;

const VISIBILITY_OPTIONS: { label: string; value: AudiobookVisibility; icon: string; desc: string }[] = [
  {
    label: 'Private',
    value: 'PRIVATE',
    icon: '🔒',
    desc: 'Only you can view and listen',
  },
  {
    label: 'Public',
    value: 'PUBLIC',
    icon: '🌐',
    desc: 'Discoverable by all community members',
  },
];

const LANGUAGE_OPTIONS = [
  { label: 'Bangla', value: 'bn' },
  { label: 'English', value: 'en' },
];

export function CreateAudiobookScreen() {
  const nav = useNavigation<Nav>();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState('bn');
  const [visibility, setVisibility] = useState<AudiobookVisibility>('PRIVATE');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title.');
      return;
    }
    setIsSubmitting(true);
    try {
      const audiobook = await audiobooksApi.create({
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        language,
        visibility,
      });
      nav.replace('UploadSource', { audiobookId: audiobook.id });
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.detail : 'Failed to create audiobook.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Progress */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map((step) => (
            <View key={step} style={[styles.progressStep, step === 1 && styles.progressStepActive]} />
          ))}
        </View>
        <Text style={styles.progressLabel}>Step 1 of 3 — Audiobook Details</Text>

        <View style={styles.form}>
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Audiobook title"
              placeholderTextColor={Colors.textMuted}
              maxLength={255}
            />
          </View>

          {/* Author */}
          <View style={styles.field}>
            <Text style={styles.label}>Author</Text>
            <TextInput
              style={styles.input}
              value={author}
              onChangeText={setAuthor}
              placeholder="Author's name"
              placeholderTextColor={Colors.textMuted}
              maxLength={255}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={description}
              onChangeText={setDescription}
              placeholder="Brief summary of the audiobook..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Language */}
          <View style={styles.field}>
            <Text style={styles.label}>Language</Text>
            <View style={styles.optionRow}>
              {LANGUAGE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.optionBtn, language === opt.value && styles.optionBtnSelected]}
                  onPress={() => setLanguage(opt.value)}
                  accessibilityRole="radio"
                >
                  <Text style={[styles.optionBtnText, language === opt.value && styles.optionBtnTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.field}>
            <Text style={styles.label}>Visibility</Text>
            <View style={styles.visibilityOptions}>
              {VISIBILITY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.visibilityCard, visibility === opt.value && styles.visibilityCardSelected]}
                  onPress={() => setVisibility(opt.value)}
                  accessibilityRole="radio"
                >
                  <Text style={styles.visibilityIcon}>{opt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.visibilityLabel, visibility === opt.value && styles.visibilityLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.visibilityDesc}>{opt.desc}</Text>
                  </View>
                  {visibility === opt.value && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, isSubmitting && styles.btnDisabled, pressed && styles.btnPressed]}
            onPress={handleCreate}
            disabled={isSubmitting}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>{isSubmitting ? 'Creating...' : 'Next Step →'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.xl },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  progressStep: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfaceElevated,
  },
  progressStepActive: {
    backgroundColor: Colors.primary,
  },
  progressLabel: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.md,
  },
  form: { gap: Spacing.md },
  field: { gap: 6 },
  label: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  optionBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  optionBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  optionBtnTextSelected: {
    color: Colors.primaryDark,
    fontWeight: '700',
  },
  visibilityOptions: { gap: Spacing.sm },
  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  visibilityCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySurface,
  },
  visibilityIcon: { fontSize: 24 },
  visibilityLabel: {
    color: Colors.textSecondary,
    fontSize: FontSizes.base,
    fontWeight: '600',
  },
  visibilityLabelSelected: { color: Colors.primaryDark, fontWeight: '700' },
  visibilityDesc: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  checkmark: {
    color: Colors.primary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  btnDisabled: { opacity: 0.6 },
  btnPressed: { opacity: 0.85 },
  btnText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
});
