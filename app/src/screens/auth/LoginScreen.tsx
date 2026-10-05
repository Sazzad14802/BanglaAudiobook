/**
 * LoginScreen — Account access matching Figma Plate 2 Screen 1.
 * Features:
 * - Proper notch-safe edge handling (react-native-safe-area-context)
 * - Sign In & Sign Up connected to live FastAPI backend & PostgreSQL database
 * - Secure JWT storage
 * - Quick Google Sign-In / Demo Login bypass
 * - Strategy pattern for auth input validation
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
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackParamList } from '../../navigation/types';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError } from '../../api/client';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { login, register } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('nabila@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    // Strategy Pattern: Validation Strategy
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setValidationError('nabila@ - সঠিক ইমেইল লিখুন');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setValidationError('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        // Derive unique username from name or email prefix
        const derivedUsername =
          (name.trim() ? name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : '') ||
          cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');

        const finalUsername =
          derivedUsername.length >= 3 ? derivedUsername : `user_${Math.floor(Math.random() * 10000)}`;

        await register({
          username: finalUsername,
          email: cleanEmail,
          password: cleanPassword,
          full_name: name.trim() || 'নাবিলা',
        });
        setSuccessMessage('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');
      } else {
        await login({
          username_or_email: cleanEmail,
          password: cleanPassword,
        });
        setSuccessMessage('সফলভাবে সাইন ইন হয়েছে!');
      }
    } catch (err: any) {
      console.log('Backend auth error:', err);
      if (err instanceof ApiError) {
        setValidationError(err.detail || 'অনুরোধটি সম্পন্ন করা যায়নি।');
      } else if (err?.message?.includes('already registered') || err?.message?.includes('400')) {
        setValidationError('এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। Sign In করুন।');
      } else if (err?.message?.includes('Incorrect') || err?.message?.includes('401')) {
        setValidationError('ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে।');
      } else {
        // In case local network is unreachable from phone, offer clear diagnostics
        setValidationError(
          'সার্ভার রেসপন্স করছে না। Wi-Fi IP বা backend চালু আছে কিনা নিশ্চিত করুন।'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    setValidationError(null);
    try {
      // Connects with standard demo account on backend or creates user session
      try {
        await login({
          username_or_email: 'salehsadid16@gmail.com',
          password: 'password123',
        });
      } catch {
        await login({
          username_or_email: 'nabila@example.com',
          password: 'password123',
        });
      }
    } catch {
      // If server unreachable, proceed gracefully in demo state
      await login({
        username_or_email: 'nabila@example.com',
        password: 'password123',
      }).catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ShrutiHeader
        title="Account access"
        subtitle="Sign in / Sign up / Google"
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
          {/* Tab Selector for Sign In vs Sign Up */}
          <View style={styles.tabToggleRow}>
            <Pressable
              onPress={() => {
                setIsSignUp(false);
                setValidationError(null);
              }}
              style={[styles.toggleTab, !isSignUp && styles.toggleTabActive]}
            >
              <Text style={[styles.toggleTabText, !isSignUp && styles.toggleTabTextActive]}>
                Sign In
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsSignUp(true);
                setValidationError(null);
              }}
              style={[styles.toggleTab, isSignUp && styles.toggleTabActive]}
            >
              <Text style={[styles.toggleTabText, isSignUp && styles.toggleTabTextActive]}>
                Sign Up
              </Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Name Field (Sign up only) */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>নাম · Sign up only</Text>
              <TextInput
                style={[styles.textInput, !isSignUp && styles.inputDisabled]}
                placeholder="আপনার নাম"
                placeholderTextColor={Colors.textMuted}
                value={name}
                onChangeText={setName}
                editable={isSignUp}
              />
            </View>

            {/* Email Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>ইমেইল</Text>
              <TextInput
                style={styles.textInput}
                placeholder="nabila@example.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>পাসওয়ার্ড</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="••••••••"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
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

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <ShrutiButton
              label={isSignUp ? 'Sign up' : 'Sign in'}
              onPress={handleSubmit}
              variant="primary"
              isLoading={isSubmitting}
            />

            <ShrutiButton
              label="Google দিয়ে চালিয়ে যান"
              onPress={handleGoogleSignIn}
              variant="google"
            />
          </View>

          {/* Validation Error Message Box */}
          {validationError && (
            <View style={styles.validationCard}>
              <Text style={styles.validationTitle}>Validation notice</Text>
              <Text style={styles.validationDetail}>{validationError}</Text>
            </View>
          )}

          {/* Success Message Box */}
          {successMessage && (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>Success</Text>
              <Text style={styles.successDetail}>{successMessage}</Text>
            </View>
          )}

          {/* Forgot Password Link */}
          <Pressable
            style={styles.forgotLinkContainer}
            onPress={() => nav.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotLinkText}>
              পাসওয়ার্ড ভুলে গেছেন? রিকভারি করুন ›
            </Text>
          </Pressable>
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
  tabToggleRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: 3,
    marginBottom: Spacing.xs,
  },
  toggleTab: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  toggleTabActive: {
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleTabText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  toggleTabTextActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  formContainer: {
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
  inputDisabled: {
    backgroundColor: '#F3EFE9',
    color: Colors.textMuted,
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
  actionsContainer: {
    gap: Spacing.sm + 2,
    marginTop: Spacing.xs,
  },
  validationCard: {
    backgroundColor: Colors.tintError,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  validationTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: Colors.tintErrorText,
    marginBottom: 2,
  },
  validationDetail: {
    fontSize: FontSizes.xs,
    color: Colors.tintErrorText,
  },
  successCard: {
    backgroundColor: Colors.tintGreen,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  successTitle: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '700',
    color: Colors.tintGreenText,
    marginBottom: 2,
  },
  successDetail: {
    fontSize: FontSizes.xs,
    color: Colors.tintGreenText,
  },
  forgotLinkContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  forgotLinkText: {
    fontSize: FontSizes.sm,
    color: Colors.primary,
    fontWeight: '600',
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
