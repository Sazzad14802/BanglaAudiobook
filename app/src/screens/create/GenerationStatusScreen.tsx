/**
 * GenerationStatusScreen — Step 3: Poll generation status until done or failed.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { generationApi } from '../../api/generation';
import { AudiobookGenerationStatusResponse } from '../../types/generation';
import { AudiobookStatus } from '../../types/audiobook';
import { CreateStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { GENERATION_POLL_INTERVAL_MS } from '../../config';
import { ApiError } from '../../api/client';

type Nav = NativeStackNavigationProp<CreateStackParamList, 'GenerationStatus'>;
type Route = RouteProp<CreateStackParamList, 'GenerationStatus'>;

const STATUS_DISPLAY: Record<AudiobookStatus, { icon: string; label: string; color: string }> = {
  PENDING: { icon: '⏳', label: 'Queued', color: Colors.warning },
  PROCESSING: { icon: '⚙️', label: 'Processing...', color: Colors.info },
  COMPLETED: { icon: '✅', label: 'Completed!', color: Colors.success },
  FAILED: { icon: '❌', label: 'Failed', color: Colors.error },
};

export function GenerationStatusScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const [statusData, setStatusData] = useState<AudiobookGenerationStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTerminal = (status?: AudiobookStatus) =>
    status === 'COMPLETED' || status === 'FAILED';

  const poll = useCallback(async () => {
    try {
      const data = await generationApi.getStatus(params.audiobookId);
      setStatusData(data);
      setError(null);

      if (isTerminal(data.audiobook_status) && timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to fetch status.');
    } finally {
      setIsLoading(false);
    }
  }, [params.audiobookId]);

  useEffect(() => {
    poll();
    timerRef.current = setInterval(poll, GENERATION_POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [poll]);

  async function handleRetry() {
    try {
      await generationApi.start(params.audiobookId);
      setStatusData(null);
      setIsLoading(true);
      setError(null);
      // Restart polling
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(poll, GENERATION_POLL_INTERVAL_MS);
      poll();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.detail : 'Failed to restart generation.');
    }
  }

  const currentStatus = statusData?.audiobook_status;
  const latestJob = statusData?.latest_job;
  const display = currentStatus ? STATUS_DISPLAY[currentStatus] : null;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.progressStep, styles.progressStepActive]} />
        ))}
      </View>
      <Text style={styles.progressLabel}>Step 3 of 3 — Audio Generation</Text>

      {/* Status Card */}
      <View style={styles.statusCard}>
        {isLoading && !statusData ? (
          <Text style={styles.loadingText}>Checking status...</Text>
        ) : error ? (
          <Text style={[styles.statusLabel, { color: Colors.error }]}>⚠️ {error}</Text>
        ) : display ? (
          <>
            <Text style={styles.statusIcon}>{display.icon}</Text>
            <Text style={[styles.statusLabel, { color: display.color }]}>{display.label}</Text>

            {currentStatus === 'PROCESSING' && (
              <Text style={styles.statusHint}>Generating audiobook chapters and audio. This may take a few minutes.</Text>
            )}
            {currentStatus === 'PENDING' && (
              <Text style={styles.statusHint}>Queued for processing. Generation will start shortly.</Text>
            )}

            {latestJob?.error_message && (
              <View style={styles.errorBox}>
                <Text style={styles.errorBoxText}>{latestJob.error_message}</Text>
              </View>
            )}
          </>
        ) : null}
      </View>

      {/* Polling indicator */}
      {currentStatus && !isTerminal(currentStatus) && (
        <View style={styles.pollingBadge}>
          <Text style={styles.pollingText}>🔄 Polling every {GENERATION_POLL_INTERVAL_MS / 1000}s</Text>
        </View>
      )}

      {/* Actions */}
      {currentStatus === 'COMPLETED' && (
        <View style={styles.actions}>
          <Text style={styles.successText}>🎉 Your audiobook was generated successfully!</Text>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={() => nav.replace('AudiobookDetails', { audiobookId: params.audiobookId })}
            accessibilityRole="button"
          >
            <Text style={styles.btnTextPrimary}>View Audiobook →</Text>
          </Pressable>
        </View>
      )}

      {currentStatus === 'FAILED' && (
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handleRetry}
            accessibilityRole="button"
          >
            <Text style={styles.btnText}>🔄 Retry Generation</Text>
          </Pressable>
        </View>
      )}

      {/* History */}
      {statusData?.history && statusData.history.length > 1 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>Job History</Text>
          {statusData.history.map((job) => (
            <View key={job.id} style={styles.historyItem}>
              <Text style={styles.historyStatus}>{STATUS_DISPLAY[job.status]?.icon} {STATUS_DISPLAY[job.status]?.label}</Text>
              <Text style={styles.historyTime}>
                {new Date(job.created_at).toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      )}
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
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    minHeight: 200,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.base,
  },
  statusIcon: { fontSize: 64 },
  statusLabel: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
  },
  statusHint: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    width: '100%',
  },
  errorBoxText: {
    color: '#DC2626',
    fontSize: FontSizes.sm,
    textAlign: 'center',
  },
  pollingBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    alignSelf: 'center',
  },
  pollingText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  actions: { gap: Spacing.sm },
  successText: {
    color: Colors.success,
    fontSize: FontSizes.md,
    fontWeight: '700',
    textAlign: 'center',
  },
  btn: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  btnPressed: { opacity: 0.75 },
  btnText: {
    color: Colors.textPrimary,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  btnTextPrimary: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  historySection: {
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    paddingTop: Spacing.md,
  },
  historyTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  historyStatus: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
  },
  historyTime: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
});
