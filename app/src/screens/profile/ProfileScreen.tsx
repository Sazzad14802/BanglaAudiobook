/**
 * ProfileScreen — User Profile, Subscriptions, Publisher Application, and Settings.
 * Styled matching Figma aesthetics and business logic.
 */

import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { ShrutiHeader } from '../../components/ShrutiHeader';
import { ShrutiButton } from '../../components/ShrutiButton';
import { TagBadge } from '../../components/TagBadge';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const [isPremium, setIsPremium] = useState(false);
  const [publisherStatus, setPublisherStatus] = useState<
    'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected'
  >('Submitted');

  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [publisherModalVisible, setPublisherModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'bn' | 'en' | 'mixed'>('bn');

  const handleUpgradePayment = () => {
    setIsPremium(true);
    setUpgradeModalVisible(false);
    Alert.alert('অভিনন্দন!', 'আপনার সাবস্ক্রিপশন সফলভাবে Premium-এ আপগ্রেড করা হয়েছে।');
  };

  const handlePublisherSubmit = () => {
    setPublisherStatus('Submitted');
    setPublisherModalVisible(false);
    Alert.alert('আবেদন জমা হয়েছে', 'আপনার প্রকাশক আবেদনটি অ্যাডমিন রিভিউয়ের জন্য জমা করা হয়েছে।');
  };

  const handleLogout = () => {
    Alert.alert('লগআউট', 'আপনি কি নিশ্চিত যে লগআউট করতে চান?', [
      { text: 'বাতিল', style: 'cancel' },
      { text: 'লগআউট', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ShrutiHeader
        title="প্রোফাইল ও সেটিংস"
        subtitle="User Account & Ecosystem"
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarChar}>না</Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{user?.full_name ?? 'নাবিলা'}</Text>
            <Text style={styles.userEmail}>{user?.email ?? 'nabila@example.com'}</Text>
            <View style={styles.badgeRow}>
              <TagBadge
                label={isPremium ? 'PREMIUM MEMBER' : 'FREE PLAN'}
                variant={isPremium ? 'premium' : 'free'}
              />
              <TagBadge label="Google Connected" variant="genre" />
            </View>
          </View>
        </View>

        {/* Subscription Plan Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>সাবস্ক্রিপশন প্ল্যান</Text>
            <TagBadge
              label={isPremium ? 'PREMIUM' : 'FREE'}
              variant={isPremium ? 'premium' : 'free'}
            />
          </View>
          <Text style={styles.sectionDescription}>
            {isPremium
              ? 'আপনি সকল প্রিমিয়াম অডিওবুক শুনতে পারবেন, অফলাইনে সংরক্ষণ করতে পারবেন এবং আনলিমিটেড রূপান্তর সুবিধা পাবেন।'
              : 'ফ্রি প্ল্যানে প্রতি মাসে ৩টি অডিওবুক তৈরি ও ফ্রি ক্যাটালগ শোনা যায়।'}
          </Text>
          {!isPremium && (
            <ShrutiButton
              label="Premium-এ আপগ্রেড করুন (৳১৯৯/মাস)"
              onPress={() => setUpgradeModalVisible(true)}
              variant="primary"
            />
          )}
        </View>

        {/* Publisher Program Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>প্রকাশক প্রোগ্রাম (Publisher)</Text>
            <TagBadge
              label={publisherStatus}
              variant={publisherStatus === 'Approved' ? 'free' : 'genre'}
            />
          </View>
          <Text style={styles.sectionDescription}>
            অনুমোদিত প্রকাশক হিসেবে নিজের চ্যানেল খুলুন, একাধিক বইয়ের প্লেলিস্ট তৈরি করুন এবং চ্যানেল পরিচালনা করুন।
          </Text>

          <ShrutiButton
            label={publisherStatus === 'Approved' ? 'চ্যানেল পরিচালনা করুন' : 'প্রকাশক হিসেবে আবেদন করুন'}
            onPress={() => setPublisherModalVisible(true)}
            variant="secondary"
          />
        </View>

        {/* Language Selection Setting */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>অ্যাপের ভাষা (Language)</Text>
          <View style={styles.langChoicesRow}>
            {[
              { id: 'bn' as const, label: 'বাংলা' },
              { id: 'en' as const, label: 'English' },
              { id: 'mixed' as const, label: 'বাংলা + English' },
            ].map((lang) => (
              <Pressable
                key={lang.id}
                onPress={() => setSelectedLanguage(lang.id)}
                style={[
                  styles.langChoiceButton,
                  selectedLanguage === lang.id && styles.langChoiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.langChoiceText,
                    selectedLanguage === lang.id && styles.langChoiceTextActive,
                  ]}
                >
                  {selectedLanguage === lang.id ? `✓ ${lang.label}` : lang.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Copyright Management Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>কপিরাইট ও স্বত্বাধিকার নীতিমালা</Text>
          <Text style={styles.sectionDescription}>
            শ্রুতি প্ল্যাটফর্মে সকল স্বত্বাধিকারীর অধিকার সুরক্ষিত রাখা হয়। যে কোনো বইয়ের বিরুদ্ধে লঙ্ঘনের অভিযোগ সরাসরি প্রতিটি বইয়ের বিস্তারিত পাতা থেকে রিপোর্ট করা যায়।
          </Text>
        </View>

        {/* Logout Button */}
        <ShrutiButton
          label="লগআউট করুন"
          onPress={handleLogout}
          variant="secondary"
        />
      </ScrollView>

      {/* Upgrade Modal Sheet */}
      <ModalBottomSheet
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Upgrade to Premium</Text>
          <Text style={styles.modalSub}>মাসিক ৳১৯৯ / আনলিমিটেড লিসেনিং ও অফলাইন</Text>

          <View style={styles.benefitsList}>
            <Text style={styles.benefitItem}>✓ সকল প্রিমিয়াম অডিওবুক আনলকড</Text>
            <Text style={styles.benefitItem}>✓ অফলাইন শোনার জন্য সরাসরি ক্যাশ সংরক্ষণ</Text>
            <Text style={styles.benefitItem}>✓ উচ্চ অগ্রাধিকার (High Priority Queue) রূপান্তর</Text>
            <Text style={styles.benefitItem}>✓ বিজ্ঞাপন ও সীমা মুক্ত অভিজ্ঞতা</Text>
          </View>

          <ShrutiButton
            label="পেমেন্ট সম্পন্ন করুন (bKash / Card)"
            onPress={handleUpgradePayment}
            variant="primary"
          />
        </View>
      </ModalBottomSheet>

      {/* Publisher Application Modal */}
      <ModalBottomSheet
        visible={publisherModalVisible}
        onClose={() => setPublisherModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>প্রকাশক আবেদন ফর্ম</Text>
          <Text style={styles.modalSub}>
            জাতীয় পরিচয়পত্র (NID), ট্রেড লাইসেন্স ও প্রকাশনা সংক্রান্ত তথ্য
          </Text>

          <View style={styles.docUploadCard}>
            <Text style={styles.docUploadTitle}>সংযুক্ত ডকুমেন্টস:</Text>
            <Text style={styles.docItem}>📄 NID_Front_Back.pdf (সংযুক্ত)</Text>
            <Text style={styles.docItem}>📄 Trade_License_2026.pdf (সংযুক্ত)</Text>
          </View>

          <ShrutiButton
            label="আবেদনপত্র দাখিল করুন"
            onPress={handlePublisherSubmit}
            variant="primary"
          />
        </View>
      </ModalBottomSheet>

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
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    gap: Spacing.md,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FDEAE4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  userEmail: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sectionDescription: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  langChoicesRow: {
    flexDirection: 'row',
    gap: Spacing.xs + 2,
    marginTop: 4,
  },
  langChoiceButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  langChoiceActive: {
    backgroundColor: Colors.surfaceDark,
  },
  langChoiceText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  langChoiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalContent: {
    gap: Spacing.md,
    paddingTop: Spacing.xs,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSub: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
  },
  benefitsList: {
    backgroundColor: Colors.tintPurple,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs + 2,
  },
  benefitItem: {
    fontSize: FontSizes.sm,
    color: Colors.tintPurpleText,
    fontWeight: '600',
  },
  docUploadCard: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  docUploadTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  docItem: {
    fontSize: FontSizes.xs + 1,
    color: Colors.textSecondary,
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
