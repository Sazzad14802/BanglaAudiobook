/**
 * UploadSourceScreen — Step 2: Pick and upload the source PDF.
 * Step 3: Start generation.
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { audiobooksApi } from '../../api/audiobooks';
import { generationApi } from '../../api/generation';
import { CreateStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError } from '../../api/client';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'UploadSource'>;
type Route = RouteProp<CreateStackParamList, 'UploadSource'>;

type StepState = 'idle' | 'uploading' | 'starting' | 'done' | 'error';

export function UploadSourceScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [step, setStep] = useState<StepState>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  async function handlePickPDF() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedFile(asset);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document.');
    }
  }

  async function handleUploadAndGenerate() {
    if (!pickedFile) {
      Alert.alert('Error', 'Please select a PDF file first.');
      return;
    }

    // Validate PDF extension
    const name = pickedFile.name ?? '';
    if (!name.toLowerCase().endsWith('.pdf')) {
      Alert.alert('Error', 'Only PDF files are supported.');
      return;
    }

    try {
      // Step 1: Upload
      setStep('uploading');
      setStatusMessage('Uploading PDF...');

      // Convert local URI to a standard Blob (required by React Native New Architecture / WinterCG standard)
      const fileResponse = await fetch(pickedFile.uri);
      const blob = await fileResponse.blob();

      // Sanitize filename to ensure ASCII safety
      const originalName = pickedFile.name || 'document.pdf';
      let safeFileName = originalName.replace(/[^\x20-\x7E]/g, '_');
      if (!safeFileName.toLowerCase().endsWith('.pdf')) {
        safeFileName += '.pdf';
      }

      const formData = new FormData();
      if (typeof File !== 'undefined') {
        try {
          const fileObj = new File([blob], safeFileName, {
            type: pickedFile.mimeType || 'application/pdf',
          });
          formData.append('file', fileObj, safeFileName);
        } catch {
          formData.append('file', blob, safeFileName);
        }
      } else {
        formData.append('file', blob, safeFileName);
      }

      await audiobooksApi.uploadSource(params.audiobookId, formData);

      // Step 2: Start generation
      setStep('starting');
      setStatusMessage('Starting generation...');
      await generationApi.start(params.audiobookId);

      setStep('done');
      nav.replace('GenerationStatus', { audiobookId: params.audiobookId });
    } catch (err: any) {
      setStep('error');
      const errorMsg =
        err instanceof ApiError
          ? err.detail
          : err?.detail || err?.message || 'Upload failed.';
      setStatusMessage(errorMsg);
      Alert.alert('Upload Error', errorMsg);
    }
  }

  const isProcessing = step === 'uploading' || step === 'starting';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressStep, s <= 2 && styles.progressStepActive]} />
        ))}
      </View>
      <Text style={styles.progressLabel}>Step 2 of 3 — Upload PDF</Text>

      {/* Pick area */}
      <Pressable
        style={({ pressed }) => [
          styles.dropZone,
          pickedFile && styles.dropZoneFilled,
          pressed && styles.dropZonePressed,
        ]}
        onPress={handlePickPDF}
        disabled={isProcessing}
        accessibilityRole="button"
        accessibilityLabel="Select PDF file"
      >
        {pickedFile ? (
          <View style={styles.pickedFileInfo}>
            <Text style={styles.pickedIcon}>📄</Text>
            <Text style={styles.pickedName} numberOfLines={2}>{pickedFile.name}</Text>
            {pickedFile.size && (
              <Text style={styles.pickedSize}>
                {(pickedFile.size / 1024 / 1024).toFixed(2)} MB
              </Text>
            )}
            <Text style={styles.changeTip}>Tap to choose a different PDF</Text>
          </View>
        ) : (
          <View style={styles.dropZoneEmpty}>
            <Text style={styles.dropIcon}>📁</Text>
            <Text style={styles.dropTitle}>Select PDF File</Text>
            <Text style={styles.dropSub}>Tap to browse and choose a PDF from your device</Text>
          </View>
        )}
      </Pressable>

      {/* Status */}
      {isProcessing && (
        <View style={styles.statusBox}>
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}
      {step === 'error' && (
        <View style={[styles.statusBox, styles.statusError]}>
          <Text style={styles.statusText}>⚠️ {statusMessage}</Text>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          📌 Once uploaded, audiobook generation will process asynchronously on the backend server.
        </Text>
      </View>

      {/* Button */}
      <Pressable
        style={({ pressed }) => [
          styles.btn,
          (!pickedFile || isProcessing) && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
        onPress={handleUploadAndGenerate}
        disabled={!pickedFile || isProcessing}
        accessibilityRole="button"
      >
        <Text style={styles.btnText}>
          {isProcessing ? statusMessage : 'Upload & Start Generation'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
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
  },
  dropZone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  dropZoneFilled: {
    borderColor: Colors.primary,
    borderStyle: 'solid',
    backgroundColor: Colors.primarySurface,
  },
  dropZonePressed: { opacity: 0.75 },
  dropZoneEmpty: { alignItems: 'center', gap: Spacing.sm },
  dropIcon: { fontSize: 56 },
  dropTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
  },
  dropSub: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  pickedFileInfo: { alignItems: 'center', gap: Spacing.xs },
  pickedIcon: { fontSize: 48 },
  pickedName: {
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    fontWeight: '600',
    textAlign: 'center',
  },
  pickedSize: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  changeTip: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    marginTop: Spacing.xs,
  },
  statusBox: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  statusError: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
  statusText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  infoBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  infoText: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { opacity: 0.85 },
  btnText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
});
