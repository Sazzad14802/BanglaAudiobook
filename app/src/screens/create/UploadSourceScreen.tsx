/**
 * UploadSourceScreen — PDF Document Picker matching Figma design.
 */

import React, { useState } from 'react';
import {
  Alert,
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
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { useLanguage } from '../../contexts/LanguageContext';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'UploadSource'>;
type Route = RouteProp<CreateStackParamList, 'UploadSource'>;

export function UploadSourceScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const audiobookId = route.params?.audiobookId ?? 'new-book';
  const { t } = useLanguage();

  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>({
    name: 'aranyak_bangla_book.pdf',
    size: 2450000,
    uri: 'mock-uri',
  } as any);

  const [isProcessing, setIsProcessing] = useState(false);

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        setPickedFile(result.assets[0]);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleStartGeneration = () => {
    if (!pickedFile) {
      Alert.alert(t('noticeTitle'), t('fileRequiredAlert'));
      return;
    }
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      nav.replace('GenerationStatus', { audiobookId });
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader
        title={t('uploadPdfTitle')}
        subtitle={t('uploadPdfSub')}
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
          onPress={handlePickPDF}
        >
          <View style={styles.iconCircle}>
            <Text style={styles.pdfIcon}>📄</Text>
          </View>
          <Text style={styles.dropzoneTitle}>
            {pickedFile ? pickedFile.name : t('pickPdfPrompt')}
          </Text>
          <Text style={styles.dropzoneSub}>
            {pickedFile
              ? `${((pickedFile.size ?? 0) / 1024 / 1024).toFixed(1)} MB · ${t('tapToChange')}`
              : t('pickPdfSub')}
          </Text>
        </Pressable>

        {/* Feature Information Cards */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>{t('processingPipelineFeatures')}</Text>
          <Text style={styles.infoBullet}>{t('pipelineFeature1')}</Text>
          <Text style={styles.infoBullet}>{t('pipelineFeature2')}</Text>
          <Text style={styles.infoBullet}>{t('pipelineFeature3')}</Text>
          <Text style={styles.infoBullet}>{t('pipelineFeature4')}</Text>
        </View>

        {/* CTA Button */}
        <ShrutiButton
          label={t('btnStartGeneration')}
          onPress={handleStartGeneration}
          variant="primary"
          isLoading={isProcessing}
        />
      </ScrollView>

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
    gap: Spacing.lg,
  },
  dropzone: {
    height: 220,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: '#DFD7CA',
    borderStyle: 'dashed',
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.xs,
  },
  dropzonePressed: {
    backgroundColor: '#F5EFE6',
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDEAE4',
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
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs + 2,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  infoTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  infoBullet: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
    lineHeight: 18,
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
