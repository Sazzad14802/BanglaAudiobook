/**
 * UploadSourceScreen — Document Picker matching Figma design.
 * Supports PDF generation as well as direct MP3 uploads.
 */

import React, { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';

import { CreateStackParamList } from '../../navigation/types';
import { BanglaBookHeader } from '../../components/BanglaBookHeader';
import { BanglaBookButton } from '../../components/BanglaBookButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';
import { apiClient } from '../../api/client';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'UploadSource'>;
type Route = RouteProp<CreateStackParamList, 'UploadSource'>;

export function UploadSourceScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const audiobookId = route.params?.audiobookId ?? 'new-book';
  const { t, isEnglish } = useLanguage();

  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePickFile = async (type = 'application/pdf') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [type, 'audio/mpeg', 'audio/mp3', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets?.length > 0) {
        setPickedFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleStartGeneration = async () => {
    if (!pickedFile) {
      Alert.alert(t('noticeTitle'), t('fileRequiredAlert'));
      return;
    }
    setIsProcessing(true);
    try {
      const form = new FormData();
      if (Platform.OS === 'web') {
        form.append('file', await (await fetch(pickedFile.uri)).blob(), pickedFile.name);
      } else {
        form.append('file', {
          uri: pickedFile.uri,
          name: pickedFile.name,
          type: pickedFile.mimeType || (pickedFile.name.endsWith('.mp3') ? 'audio/mpeg' : 'application/pdf'),
        } as any);
      }

      const isMp3 = pickedFile.name.toLowerCase().endsWith('.mp3') || pickedFile.mimeType === 'audio/mpeg';

      if (isMp3) {
        await apiClient.uploadFile(`/audiobooks/${audiobookId}/audio`, form);
        Alert.alert(
          isEnglish ? 'Upload Complete' : 'আপলোড সম্পন্ন',
          isEnglish ? 'Audio uploaded and chapters indexed!' : 'অডিওবুক সফলভাবে আপলোড হয়েছে!'
        );
        nav.replace('AudiobookDetails', { audiobookId });
      } else {
        await apiClient.uploadFile(`/audiobooks/${audiobookId}/source`, form);
        nav.replace('GenerationStatus', { audiobookId });
      }
    } catch (err: any) {
      Alert.alert(
        isEnglish ? 'Upload Failed' : 'আপলোড ব্যর্থ',
        err.detail || err.message || 'Could not upload file.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <BanglaBookHeader
        title={t('uploadPdfTitle')}
        subtitle={isEnglish ? 'Select PDF or MP3 audio' : 'PDF বই বা অডিও ফাইল নির্বাচন করুন'}
        onBack={() => nav.goBack()}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Upload Dropzone */}
        <Pressable
          style={({ pressed }) => [styles.dropzone, pressed && styles.dropzonePressed]}
          onPress={() => handlePickFile()}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.pdfIcon}>
              {pickedFile?.name.endsWith('.mp3') ? '🎵' : '📄'}
            </Text>
          </View>
          <Text style={styles.dropzoneTitle}>
            {pickedFile ? pickedFile.name : (isEnglish ? 'Tap to choose PDF or MP3' : 'PDF বা MP3 ফাইল নির্বাচন করুন')}
          </Text>
          <Text style={styles.dropzoneSub}>
            {pickedFile
              ? `${((pickedFile.size ?? 0) / 1024 / 1024).toFixed(1)} MB · ${t('tapToChange')}`
              : (isEnglish ? 'Maximum 20 MB · OCR & Speech Synthesis' : 'সর্বোচ্চ ২০ মেগাবাইট · ওসিআর ও স্পিচ সিন্থেসিস')}
          </Text>
        </Pressable>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            {isEnglish ? 'Asynchronous Progressive Synthesis' : 'অগ্রাধিকার ভিত্তিক লাইভ জেনারেশন'}
          </Text>
          <Text style={styles.infoText}>
            {isEnglish
              ? 'Our worker extracts text page by page. As soon as page 1 is ready, you can start streaming while subsequent pages continue synthesizing in the background.'
              : 'প্রথম পৃষ্ঠা তৈরি হওয়া মাত্রই আপনি শোনা শুরু করতে পারবেন, বাকি পৃষ্ঠাগুলো স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ডে তৈরি হতে থাকবে।'}
          </Text>
        </View>

        {/* Start Button */}
        <BanglaBookButton
          label={
            isProcessing
              ? (isEnglish ? 'Uploading file...' : 'ফাইল আপলোড হচ্ছে...')
              : (isEnglish ? 'Start Audiobook Generation ⚡' : 'অডিওবুক তৈরি শুরু করুন ⚡')
          }
          onPress={handleStartGeneration}
          variant="primary"
          isLoading={isProcessing}
        />
      </ScrollView>
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
  dropzone: {
    borderWidth: 2,
    borderColor: '#E2DBD2',
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  dropzonePressed: {
    backgroundColor: '#FDEAE4',
    borderColor: Colors.primary,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7E7CE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  pdfIcon: {
    fontSize: 28,
  },
  dropzoneTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  dropzoneSub: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: 4,
  },
  infoTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  infoText: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
