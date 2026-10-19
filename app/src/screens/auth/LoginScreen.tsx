/**
 * LoginScreen — Account access matching Figma Plate 2 Screen 1.
 * Features:
 * - Proper notch-safe edge handling (react-native-safe-area-context)
 * - Sign In & Sign Up connected to live FastAPI backend & PostgreSQL database
 * - Secure JWT storage
 * - Google sign-in via Supabase (verified by the Platform API)
 * - Strategy pattern for auth input validation & registration resolution
 * - Failover resilience: never hangs in loading state
 */

import React, { useState } from 'react';
import {
  Image,
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
import { useLanguage } from '../../contexts/LanguageContext';
import { AuthStackParamList } from '../../navigation/types';
import { AppHeader } from '../../components/AppHeader';
import { AppButton } from '../../components/AppButton';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError, errorMessage } from '../../api/client';
import { GoogleSignInCancelled, isGoogleSignInConfigured, signInWithGoogle } from '../../services/googleAuth';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { login, register, acceptSession } = useAuth();
  const { t, isEnglish } = useLanguage();

  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setValidationError(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    // Passwords are used exactly as typed; spaces are valid characters.
    const cleanPassword = password;

    // Strategy Pattern: Validation Strategy
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setValidationError('সঠিক ইমেইল ঠিকানা লিখুন (যেমন: user@example.com)');
      return;
    }
    if (!cleanPassword || cleanPassword.length < 6) {
      setValidationError('পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে');
      return;
    }

    setIsSubmitting(true);

    // Fail-safe safety timer: guarantees loading state never freezes indefinitely
    const safetyTimer = setTimeout(() => {
      setIsSubmitting(false);
    }, 8000);

    try {
      if (isSignUp) {
        // Strategy Pattern: Username generation strategy
        // Generates an alphanumeric username with random salt to avoid 409 unique constraint errors
        const namePart = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        const emailPart = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
        const basePart =
          namePart.length >= 3 ? namePart : emailPart.length >= 3 ? emailPart : 'user';
        const finalUsername = `${basePart}_${Math.floor(1000 + Math.random() * 9000)}`;

        await register({
          username: finalUsername,
          email: cleanEmail,
          password: cleanPassword,
          full_name: name.trim() || undefined,
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
      console.warn('Backend auth error:', err);
      if (err instanceof ApiError) {
        if (
          err.status === 409 ||
          err.detail?.toLowerCase().includes('already exists') ||
          err.detail?.toLowerCase().includes('already registered')
        ) {
          setValidationError(
            'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। দয়া করে "Sign In" ট্যাবে যান।',
          );
        } else if (
          err.status === 401 ||
          err.detail?.toLowerCase().includes('incorrect')
        ) {
          setValidationError('ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে। আবার চেষ্টা করুন।');
        } else if (err.status === 422) {
          setValidationError(err.detail || 'তথ্যের সঠিক ফরম্যাট দিন।');
        } else {
          setValidationError(err.detail || 'অনুরোধটি সম্পন্ন করা যায়নি।');
        }
      } else if (
        err?.message?.includes('already registered') ||
        err?.message?.includes('already exists') ||
        err?.message?.includes('409')
      ) {
        setValidationError(
          'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে। দয়া করে "Sign In" ট্যাবে যান।',
        );
      } else if (err?.message?.includes('Incorrect') || err?.message?.includes('401')) {
        setValidationError('ভুল ইমেইল বা পাসওয়ার্ড দেওয়া হয়েছে।');
      } else {
        setValidationError(
          'সার্ভারের সাথে সংযোগ করা যায়নি। Wi-Fi বা মোবাইল ডাটা চেক করুন।',
        );
      }
    } finally {
      clearTimeout(safetyTimer);
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setValidationError(null);
    if (!isGoogleSignInConfigured()) {
      setValidationError(
        isEnglish
          ? 'Google sign-in is not set up yet. Use email and password for now.'
          : 'Google সাইন-ইন এখনো চালু করা হয়নি। আপাতত ইমেইল ও পাসওয়ার্ড ব্যবহার করুন।',
      );
      return;
    }
    setIsSubmitting(true);
    try {
      await acceptSession(await signInWithGoogle());
    } catch (err) {
      if (!(err instanceof GoogleSignInCancelled)) setValidationError(errorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={t('authHeaderTitle')}
        subtitle={t('authHeaderSub')}
        onBack={() => nav.goBack()}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Brand Hero */}
          <View style={styles.brandHero}>
            <Image
              source={require('../../../assets/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>{t('appName')}</Text>
            <Text style={styles.brandTagline}>{t('appTagline')}</Text>
          </View>

          {/* Tab Selector for Sign In vs Sign Up */}
          <View style={styles.tabToggleRow}>
            <Pressable
              onPress={() => {
                setIsSignUp(false);
                setValidationError(null);
                setSuccessMessage(null);
              }}
              style={[styles.toggleTab, !isSignUp && styles.toggleTabActive]}
            >
              <Text style={[styles.toggleTabText, !isSignUp && styles.toggleTabTextActive]}>
                {t('tabSignIn')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setIsSignUp(true);
                setValidationError(null);
                setSuccessMessage(null);
              }}
              style={[styles.toggleTab, isSignUp && styles.toggleTabActive]}
            >
              <Text style={[styles.toggleTabText, isSignUp && styles.toggleTabTextActive]}>
                {t('tabSignUp')}
              </Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={styles.formContainer}>
            {/* Name Field (Sign up only) */}
            {isSignUp && (
              <View style={styles.fieldWrapper}>
                <Text style={styles.fieldLabel}>
                  {t('fieldNameLabel')}
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder={t('fieldNamePlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            {/* Email Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>{t('fieldEmailLabel')}</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t('fieldEmailPlaceholder')}
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            {/* Password Field */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.fieldLabel}>{t('fieldPasswordLabel')}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder={t('fieldPasswordPlaceholder')}
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
            <AppButton
              label={
                isSubmitting
                  ? isSignUp
                    ? t('btnCreatingAccount')
                    : t('btnSigningIn')
                  : isSignUp
                  ? t('tabSignUp')
                  : t('tabSignIn')
              }
              onPress={handleSubmit}
              variant="primary"
              isLoading={isSubmitting}
            />

            <AppButton
              label={t('btnGoogleSignIn')}
              onPress={handleGoogleSignIn}
              variant="google"
            />
          </View>

          {/* Validation Error Message Box */}
          {validationError && (
            <View style={styles.validationCard}>
              <Text style={styles.validationTitle}>{t('noticeTitle')}</Text>
              <Text style={styles.validationDetail}>{validationError}</Text>

            </View>
          )}

          {/* Success Message Box */}
          {successMessage && (
            <View style={styles.successCard}>
              <Text style={styles.successTitle}>{t('successTitle')}</Text>
              <Text style={styles.successDetail}>{successMessage}</Text>
            </View>
          )}

          {/* Forgot Password Link */}
          <Pressable
            style={styles.forgotLinkContainer}
            onPress={() => nav.navigate('ForgotPassword')}
          >
            <Text style={styles.forgotLinkText}>
              {t('forgotPasswordLink')}
            </Text>
          </Pressable>
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
  brandHero: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
    gap: 4,
  },
  brandLogo: {
    width: 72,
    height: 72,
    borderRadius: Radius.lg,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  brandTagline: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
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
    backgroundColor: Colors.surfaceElevated,
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
});
