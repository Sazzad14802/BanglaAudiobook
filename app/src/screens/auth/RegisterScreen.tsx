/**
 * RegisterScreen
 */

import React, { useState } from 'react';
import {
  Alert,
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { AuthStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError } from '../../api/client';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const nav = useNavigation<Nav>();
  const { register } = useAuth();
  const { t, isEnglish } = useLanguage();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', isEnglish ? 'Please fill in all fields.' : 'অনুগ্রহ করে সব ঘর পূরণ করুন।');
      return;
    }
    if (username.trim().length < 3) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', isEnglish ? 'Username must be at least 3 characters.' : 'ব্যবহারকারীর নাম কমপক্ষে ৩ অক্ষরের হতে হবে।');
      return;
    }
    if (!email.includes('@')) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', isEnglish ? 'Please enter a valid email address.' : 'একটি সঠিক ইমেইল ঠিকানা দিন।');
      return;
    }
    if (password.length < 6) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', isEnglish ? 'Password must be at least 6 characters.' : 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', isEnglish ? 'Passwords do not match.' : 'পাসওয়ার্ড দুটি মেলেনি।');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ username: username.trim(), email: email.trim(), password });
    } catch (err) {
      console.error('Registration failed:', err);
      const message =
        err instanceof ApiError
          ? err.detail
          : err instanceof Error
          ? err.message
          : (isEnglish ? 'Registration failed.' : 'নিবন্ধন ব্যর্থ হয়েছে।');
      Alert.alert(isEnglish ? 'Registration Failed' : 'নিবন্ধন ব্যর্থ হয়েছে', message);
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
        <View style={styles.header}>
          <Image
            source={require('../../../assets/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('registerTitle')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.formTitle}>{t('tabSignUp')}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t('fieldUsername')}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder={isEnglish ? 'Unique username' : 'ইউনিক ইউজারনেম'}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              autoComplete="username"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('fieldEmailLabel')}</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder={t('fieldEmailPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('fieldPasswordLabel')}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t('fieldPasswordPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t('fieldConfirmPassword')}</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={isEnglish ? 'Re-enter your password' : 'পাসওয়ার্ড আবার লিখুন'}
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoComplete="new-password"
            />
          </View>

          <Pressable
            style={({ pressed }) => [styles.btn, isSubmitting && styles.btnDisabled, pressed && styles.btnPressed]}
            onPress={handleRegister}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel={t('btnCreateAccount')}
          >
            <Text style={styles.btnText}>
              {isSubmitting ? t('btnCreatingAccount') : t('btnCreateAccount')}
            </Text>
          </Pressable>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchText}>{t('alreadyHaveAccount')} </Text>
          <Pressable onPress={() => nav.navigate('Login')} accessibilityRole="link">
            <Text style={styles.switchLink}>{t('linkLogIn')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.xs,
  },
  logoImage: {
    width: 84,
    height: 84,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xs,
  },
  appName: {
    color: Colors.textPrimary,
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
    letterSpacing: 1,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
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
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  btnDisabled: { opacity: 0.6 },
  btnPressed: { opacity: 0.85 },
  btnText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
  switchText: { color: Colors.textSecondary, fontSize: FontSizes.base },
  switchLink: { color: Colors.primary, fontSize: FontSizes.base, fontWeight: '700' },
});
