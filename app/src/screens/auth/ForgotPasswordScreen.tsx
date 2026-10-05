/**
 * ForgotPasswordScreen — Password recovery matching Figma Plate 2 Screen 2.
 * 4-step path: Email, Verify, Reset, Success.
 */

import React, { useState } from 'react';
import {
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
import { AuthStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const nav = useNavigation<Nav>();

  const [email, setEmail] = useState('nabila@example.com');
  const [verificationCode, setVerificationCode] = useState('482169');
  const [newPassword, setNewPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetPassword = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
    }, 800);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader

        title="Forgot, verify & reset"
        subtitle="Complete recovery path"
        onBack={() => nav.goBack()}
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
          {/* 4-Step Indicator Bar */}
          <View style={styles.stepIndicatorRow}>
            <View style={styles.stepColumn}>
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <Text style={[styles.stepText, styles.stepTextActive]}>Email</Text>
            </View>

            <View style={styles.stepColumn}>
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <Text style={[styles.stepText, styles.stepTextActive]}>Verify</Text>
            </View>

            <View style={styles.stepColumn}>
              <View style={[styles.stepBar, styles.stepBarActive]} />
              <Text style={[styles.stepText, styles.stepTextActive]}>Reset</Text>
            </View>

            <View style={styles.stepColumn}>
              <View style={[styles.stepBar, isSuccess && styles.stepBarActive]} />
              <Text style={[styles.stepText, isSuccess && styles.stepTextActive]}>Success</Text>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.fieldsContainer}>
            {/* Email Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>Forgot password email</Text>
              <TextInput
                style={styles.textInput}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* 6-Digit Verification Code */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>6-digit verification</Text>
              <TextInput
                style={styles.textInput}
                value={verificationCode}
                onChangeText={setVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>

            {/* New Password */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>New password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  hitSlop={8}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '👁' : '👁‍🗨'}</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Verification Banner */}
          <View style={styles.verificationBanner}>
            <Text style={styles.verificationTitle}>Email sent · code verified</Text>
            <Text style={styles.verificationSub}>
              Reset link 15 minutes valid · resend in 00:42
            </Text>
          </View>

          {/* CTA Button */}
          <ShrutiButton
            label="পাসওয়ার্ড বদলান"
            onPress={handleResetPassword}
            variant="primary"
            isLoading={isSubmitting}
          />

          {/* Success Banner */}
          {isSuccess && (
            <View style={styles.successBanner}>
              <Text style={styles.successTitle}>Success</Text>
              <Text style={styles.successSub}>
                Password updated · other sessions signed out
              </Text>
            </View>
          )}
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
  stepIndicatorRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginVertical: Spacing.xs,
  },
  stepColumn: {
    flex: 1,
  },
  stepBar: {
    height: 3,
    backgroundColor: '#E2DBD2',
    borderRadius: Radius.full,
    marginBottom: 4,
  },
  stepBarActive: {
    backgroundColor: Colors.primary,
  },
  stepText: {
    fontSize: FontSizes.xs - 1,
    color: Colors.textSecondary,
  },
  stepTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  fieldsContainer: {
    gap: Spacing.sm + 4,
  },
  fieldWrapper: {
    gap: 4,
  },
  fieldLabel: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  textInput: {
    height: 50,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  passwordRow: {
    height: 50,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  eyeButton: {
    padding: Spacing.xs,
  },
  eyeIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  verificationBanner: {
    backgroundColor: Colors.tintGreen,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  verificationTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: Colors.tintGreenText,
    marginBottom: 2,
  },
  verificationSub: {
    fontSize: FontSizes.xs,
    color: Colors.tintGreenText,
  },
  successBanner: {
    backgroundColor: Colors.tintBlue,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  successTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: Colors.tintBlueText,
    marginBottom: 2,
  },
  successSub: {
    fontSize: FontSizes.xs,
    color: Colors.tintBlueText,
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
