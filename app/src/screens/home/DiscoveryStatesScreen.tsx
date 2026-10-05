/**
 * DiscoveryStatesScreen — States matching Figma Plate 4 Screen 1.
 * Demonstrates Loading skeleton, No results, Offline notice, and Error with Retry.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

export function DiscoveryStatesScreen() {
  const nav = useNavigation();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setTimeout(() => {
      setIsRetrying(false);
      nav.goBack();
    }, 700);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader

        title="Discovery states"
        subtitle="Loading · no results · offline · error"
        onBack={() => nav.goBack()}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Loading Skeleton Placeholder */}
        <View style={styles.skeletonCard}>
          <ActivityIndicator size="small" color={Colors.textSecondary} />
        </View>

        {/* No Results Card */}
        <View style={styles.neutralCard}>
          <Text style={styles.cardTitle}>No results</Text>
          <Text style={styles.cardSub}>বানান দেখুন বা filters সরান</Text>
        </View>

        {/* Offline Card */}
        <View style={styles.amberCard}>
          <Text style={styles.amberTitle}>Offline</Text>
          <Text style={styles.amberSub}>শুধু downloaded audiobook available</Text>
        </View>

        {/* Error Card */}
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorSub}>Query preserved · Retry</Text>
        </View>

        {/* Retry Button */}
        <View style={styles.buttonWrapper}>
          <ShrutiButton
            label="Retry"
            onPress={handleRetry}
            variant="primary"
            isLoading={isRetrying}
          />
        </View>
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
    gap: Spacing.md,
  },
  skeletonCard: {
    height: 90,
    backgroundColor: '#EBE5DC', // soft skeleton fill
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  neutralCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  cardTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
  },
  amberCard: {
    backgroundColor: Colors.tintAmber,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  amberTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.tintAmberText,
    marginBottom: 4,
  },
  amberSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.tintAmberText,
  },
  errorCard: {
    backgroundColor: Colors.tintError,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  errorTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.tintErrorText,
    marginBottom: 4,
  },
  errorSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.tintErrorText,
  },
  buttonWrapper: {
    marginTop: Spacing.xs,
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
