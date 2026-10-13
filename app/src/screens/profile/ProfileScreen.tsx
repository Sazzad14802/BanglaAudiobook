/**
 * ProfileScreen — User Profile, Subscriptions, Publisher Operations, and Settings.
 * Fully connected to FastAPI backend & PostgreSQL schema.
 * Matches Figma visual design system.
 */

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { randomUUID } from 'expo-crypto';

import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { BanglaBookHeader } from '../../components/BanglaBookHeader';
import { BanglaBookButton } from '../../components/BanglaBookButton';
import { TagBadge } from '../../components/TagBadge';
import { ModalBottomSheet } from '../../components/ModalBottomSheet';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { apiClient } from '../../api/client';
import { offline } from '../../storage/offline';
import { Audiobook } from '../../types/audiobook';

interface Plan {
  id: string;
  name: string;
  months: number;
  price: string;
  active: boolean;
}

interface PaymentOrder {
  id: string;
  kind: string;
  amount: string;
  status: string;
  created_at: string;
}

interface Channel {
  id: string;
  name: string;
  description: string;
  moderated: boolean;
}

export function ProfileScreen() {
  const nav = useNavigation<any>();
  const { user, refreshUser, logout } = useAuth();
  const { language, setLanguage, t, isEnglish } = useLanguage();

  const isPublisher = user?.account_type === 'publisher';
  const isPremium = Boolean(user?.premium_until && new Date(user.premium_until) > new Date());

  // Data states
  const [plans, setPlans] = useState<Plan[]>([]);
  const [payments, setPayments] = useState<PaymentOrder[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [books, setBooks] = useState<Audiobook[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals & form states
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [checkoutOrder, setCheckoutOrder] = useState<PaymentOrder | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Publisher forms
  const [legalName, setLegalName] = useState(user?.full_name || '');
  const [isApplying, setIsApplying] = useState(false);

  // Channel form
  const [channelModalVisible, setChannelModalVisible] = useState(false);
  const [channelEditId, setChannelEditId] = useState<string | null>(null);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [isSavingChannel, setIsSavingChannel] = useState(false);

  // Withdrawal form
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalDest, setWithdrawalDest] = useState('bKash: 01700000000');
  const [isSubmittingWithdrawal, setIsSubmittingWithdrawal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      await refreshUser().catch(() => {});
      const orders = await apiClient.get<PaymentOrder[]>('/payments').catch(() => []);
      setPayments(orders);

      if (isPublisher) {
        const apps = await apiClient.get<any[]>('/publisher/applications').catch(() => []);
        setApplications(apps);
        const userChannels = await apiClient.get<Channel[]>('/publisher/channels').catch(() => []);
        setChannels(userChannels);

        if (user?.publisher_status === 'active') {
          const dash = await apiClient.get<any>('/publisher/dashboard').catch(() => null);
          setDashboard(dash);
          const myBooks = await apiClient.get<{ items: Audiobook[] }>('/audiobooks/my').catch(() => ({ items: [] }));
          setBooks(myBooks.items);
        }
      } else {
        const subPlans = await apiClient.get<Plan[]>('/subscriptions/plans').catch(() => []);
        setPlans(subPlans);
      }
    } catch (e) {
      console.warn('Failed to refresh profile data:', e);
    }
  }, [isPublisher, user?.publisher_status]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  // Payment initiation (Subscription or Publisher registration)
  const handleInitiateOrder = async (kind: 'subscription' | 'publisher_registration', planId?: string) => {
    try {
      const order = await apiClient.post<PaymentOrder>('/payments', {
        kind,
        plan_id: planId || null,
        idempotency_key: randomUUID(),
      });
      setUpgradeModalVisible(false);
      setCheckoutOrder(order);
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || err.message || 'Payment initiation failed.');
    }
  };

  // Mock checkout confirmation
  const handleConfirmMockPayment = async (status: 'success' | 'failed' | 'cancelled') => {
    if (!checkoutOrder) return;
    setIsProcessingPayment(true);
    try {
      await apiClient.post(`/payments/${checkoutOrder.id}/mock-confirm`, { status });
      setCheckoutOrder(null);
      Alert.alert(
        status === 'success' ? (isEnglish ? 'Payment Successful' : 'পেমেন্ট সফল') : (isEnglish ? 'Payment Update' : 'পেমেন্ট আপডেট'),
        status === 'success'
          ? (isEnglish ? 'Your account has been activated!' : 'আপনার অ্যাকাউন্ট সক্রিয় হয়েছে!')
          : (isEnglish ? `Order marked as ${status}.` : `অর্ডারের স্ট্যাটাস: ${status}।`)
      );
      await loadData();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || err.message || 'Failed to confirm payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Publisher verification PDF upload
  const handlePickAndSubmitVerification = async () => {
    if (!legalName.trim() || legalName.trim().length < 2) {
      Alert.alert(isEnglish ? 'Required' : 'প্রয়োজনীয়', isEnglish ? 'Please enter your legal name.' : 'আপনার আইনি নাম লিখুন।');
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (picked.canceled || !picked.assets?.length) return;

      const file = picked.assets[0];
      const form = new FormData();
      form.append('legal_name', legalName.trim());
      if (Platform.OS === 'web') {
        form.append('file', await (await fetch(file.uri)).blob(), file.name);
      } else {
        form.append('file', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || 'application/pdf',
        } as any);
      }

      setIsApplying(true);
      await apiClient.uploadFile('/publisher/applications', form);
      Alert.alert(
        isEnglish ? 'Application Submitted' : 'আবেদন জমা হয়েছে',
        isEnglish ? 'Your application is awaiting admin review.' : 'আপনার আবেদনটি অ্যাডমিন পর্যালোচনার জন্য জমা হয়েছে।'
      );
      await loadData();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || err.message || 'Upload failed.');
    } finally {
      setIsApplying(false);
    }
  };

  // Channel create/edit
  const handleSaveChannel = async () => {
    if (!channelName.trim()) {
      Alert.alert(isEnglish ? 'Required' : 'প্রয়োজনীয়', isEnglish ? 'Please enter a channel name.' : 'চ্যানেলের নাম লিখুন।');
      return;
    }
    setIsSavingChannel(true);
    try {
      if (channelEditId) {
        await apiClient.put(`/publisher/channels/${channelEditId}`, {
          name: channelName.trim(),
          description: channelDesc.trim(),
        });
      } else {
        await apiClient.post('/publisher/channels', {
          name: channelName.trim(),
          description: channelDesc.trim(),
        });
      }
      setChannelModalVisible(false);
      setChannelName('');
      setChannelDesc('');
      setChannelEditId(null);
      await loadData();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || err.message || 'Failed to save channel.');
    } finally {
      setIsSavingChannel(false);
    }
  };

  // Publisher withdrawal
  const handleRequestWithdrawal = async () => {
    const num = parseFloat(withdrawalAmount);
    if (isNaN(num) || num <= 0) {
      Alert.alert(isEnglish ? 'Invalid Amount' : 'ভুল পরিমাণ', isEnglish ? 'Enter a valid amount in BDT.' : 'সঠিক টাকার পরিমাণ লিখুন।');
      return;
    }
    if (dashboard && num > parseFloat(dashboard.available_balance)) {
      Alert.alert(isEnglish ? 'Insufficient Balance' : 'অপর্যাপ্ত ব্যালেন্স', isEnglish ? 'Amount exceeds available balance.' : 'ব্যালেন্সের চেয়ে বেশি টাকা তোলা যাবে না।');
      return;
    }
    setIsSubmittingWithdrawal(true);
    try {
      await apiClient.post('/publisher/withdrawals', {
        amount: withdrawalAmount,
        destination: withdrawalDest.trim(),
      });
      setWithdrawalModalVisible(false);
      setWithdrawalAmount('');
      Alert.alert(
        isEnglish ? 'Withdrawal Requested' : 'উত্তোলন অনুরোধ সম্পন্ন',
        isEnglish ? 'Your payout request is submitted for review.' : 'আপনার টাকা তোলার অনুরোধ অ্যাডমিনের কাছে জমা হয়েছে।'
      );
      await loadData();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || err.message || 'Failed to request withdrawal.');
    } finally {
      setIsSubmittingWithdrawal(false);
    }
  };

  // Audiobook visibility toggle
  const handleToggleVisibility = async (book: Audiobook) => {
    try {
      const nextVis = book.visibility === 'PUBLIC' ? 'PRIVATE' : 'PUBLIC';
      await apiClient.patch(`/audiobooks/${book.id}/visibility`, { visibility: nextVis });
      await loadData();
    } catch (err: any) {
      Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || err.message || 'Failed to update visibility.');
    }
  };

  // Cancel subscription auto-renewal
  const handleCancelSubscription = () => {
    Alert.alert(
      isEnglish ? 'Cancel Auto-Renewal' : 'অটো-রিনিউ বাতিল',
      isEnglish
        ? 'Are you sure? Your premium access will continue until the paid expiry date.'
        : 'আপনি কি নিশ্চিত? মেয়াদ শেষ হওয়া পর্যন্ত প্রিমিয়াম সুবিধা বজায় থাকবে।',
      [
        { text: isEnglish ? 'Keep Subscription' : 'বাতিল নয়', style: 'cancel' },
        {
          text: isEnglish ? 'Confirm' : 'নিশ্চিত করুন',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.post('/subscriptions/cancel');
              Alert.alert(
                isEnglish ? 'Cancelled' : 'বাতিল হয়েছে',
                isEnglish ? 'Future auto-renewals have been cancelled.' : 'ভবিষ্যতের অটো-রিনিউয়াল বাতিল করা হয়েছে।'
              );
              await loadData();
            } catch (err: any) {
              Alert.alert(isEnglish ? 'Error' : 'ত্রুটি', err.detail || err.message || 'Failed to cancel.');
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(t('logoutConfirmTitle'), t('logoutConfirmMessage'), [
      { text: t('btnCancel'), style: 'cancel' },
      {
        text: t('btnLogout'),
        style: 'destructive',
        onPress: async () => {
          if (user?.id) await offline.clear(user.id).catch(() => {});
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <BanglaBookHeader
        title={t('profileTitle')}
        subtitle={isPublisher ? (isEnglish ? 'Publisher Workspace' : 'প্রকাশক পোর্টাল') : t('profileSub')}
        onOptionsPress={() => {}}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarChar}>
              {(user?.full_name ?? user?.username ?? 'ব').charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userMeta}>
            <Text style={styles.userName}>{user?.full_name ?? user?.username ?? 'ইউজার'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>

            <View style={styles.badgeRow}>
              <TagBadge
                label={isPublisher ? 'PUBLISHER' : isPremium ? 'PREMIUM MEMBER' : 'FREE LISTENER'}
                variant={isPublisher ? 'genre' : isPremium ? 'premium' : 'free'}
              />
              {isPublisher && (
                <TagBadge
                  label={user?.publisher_status.toUpperCase().replaceAll('_', ' ')}
                  variant={user?.publisher_status === 'active' ? 'free' : 'premium'}
                />
              )}
            </View>
          </View>
        </View>

        {/* ─── PUBLISHER SPECIFIC WORKFLOWS ─── */}
        {isPublisher && (
          <>
            {/* Publisher Application Status Card (if not active yet) */}
            {user?.publisher_status !== 'active' && (
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>
                    {isEnglish ? 'Publisher Verification Status' : 'প্রকাশক ভেরিফিকেশন স্ট্যাটাস'}
                  </Text>
                  <TagBadge
                    label={user?.publisher_status.toUpperCase().replaceAll('_', ' ')}
                    variant={user?.publisher_status === 'approved_pending_payment' ? 'free' : 'genre'}
                  />
                </View>

                {user?.publisher_status === 'pending_approval' && (
                  <Text style={styles.sectionDescription}>
                    {isEnglish
                      ? 'Your verification documents are awaiting review by administrators.'
                      : 'আপনার ভেরিফিকেশন ডকুমেন্ট অ্যাডমিন পর্যালোচনার জন্য জমা রয়েছে।'}
                  </Text>
                )}

                {user?.publisher_status === 'rejected' && (
                  <View style={styles.rejectedBanner}>
                    <Text style={styles.rejectedTitle}>
                      {isEnglish ? 'Application Declined' : 'আবেদন বাতিল করা হয়েছে'}
                    </Text>
                    <Text style={styles.rejectedReason}>
                      {applications[0]?.reason || (isEnglish ? 'Please check requirements and re-upload verification documents.' : 'অনুগ্রহ করে সঠিক তথ্য দিয়ে পুনরায় আবেদন করুন।')}
                    </Text>
                  </View>
                )}

                {['pending_approval', 'rejected'].includes(user?.publisher_status || '') && (
                  <View style={{ gap: Spacing.sm }}>
                    <TextInput
                      style={styles.textInput}
                      value={legalName}
                      onChangeText={setLegalName}
                      placeholder={isEnglish ? 'Your legal publisher/author name' : 'আপনার আইনি নাম'}
                      placeholderTextColor={Colors.textMuted}
                    />
                    <BanglaBookButton
                      label={isApplying ? (isEnglish ? 'Uploading...' : 'আপলোড হচ্ছে...') : (isEnglish ? '📄 Upload Verification PDF' : '📄 ভেরিফিকেশন PDF আপলোড করুন')}
                      onPress={handlePickAndSubmitVerification}
                      variant="primary"
                      isLoading={isApplying}
                    />
                  </View>
                )}

                {user?.publisher_status === 'approved_pending_payment' && (
                  <View style={{ gap: Spacing.sm }}>
                    <Text style={styles.sectionDescription}>
                      {isEnglish
                        ? '🎉 Your publisher verification has been approved! Complete the one-time registration payment to activate publishing.'
                        : '🎉 আপনার আবেদন অনুমোদিত হয়েছে! প্রকাশনা শুরু করতে এককালীন রেজিস্ট্রেশন ফি প্রদান করুন।'}
                    </Text>
                    <BanglaBookButton
                      label={isEnglish ? 'Pay Registration Fee (৳1,000)' : 'রেজিস্ট্রেশন ফি দিন (৳১,০০০)'}
                      onPress={() => handleInitiateOrder('publisher_registration')}
                      variant="primary"
                    />
                  </View>
                )}
              </View>
            )}

            {/* Active Publisher Dashboard & Channels */}
            {user?.publisher_status === 'active' && dashboard && (
              <>
                {/* Stats Metrics Card */}
                <View style={styles.statsCard}>
                  <Text style={styles.statsCardTitle}>{isEnglish ? 'Monthly Performance' : 'মাসিক কর্মক্ষমতা'}</Text>
                  <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>৳{dashboard.available_balance}</Text>
                      <Text style={styles.statLabel}>{isEnglish ? 'Available Balance' : 'উত্তোলনযোগ্য ব্যালেন্স'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{dashboard.eligible_views}</Text>
                      <Text style={styles.statLabel}>{isEnglish ? 'Eligible Views' : 'যোগ্য ভিউ (মাসিক)'}</Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text style={styles.statValue}>{dashboard.audiobooks}</Text>
                      <Text style={styles.statLabel}>{isEnglish ? 'Audiobooks' : 'মোট অডিওবুক'}</Text>
                    </View>
                  </View>
                  <View style={{ marginTop: Spacing.sm }}>
                    <BanglaBookButton
                      label={isEnglish ? 'Request Withdrawal' : 'টাকা তোলার অনুরোধ'}
                      onPress={() => setWithdrawalModalVisible(true)}
                      variant="primary"
                    />
                  </View>
                </View>

                {/* Channels Management */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{isEnglish ? 'Channels' : 'চ্যানেলসমূহ'}</Text>
                    <Pressable
                      style={styles.actionPill}
                      onPress={() => {
                        setChannelEditId(null);
                        setChannelName('');
                        setChannelDesc('');
                        setChannelModalVisible(true);
                      }}
                    >
                      <Text style={styles.actionPillText}>+ {isEnglish ? 'New Channel' : 'নতুন চ্যানেল'}</Text>
                    </Pressable>
                  </View>
                  {channels.length === 0 ? (
                    <Text style={styles.sectionDescription}>
                      {isEnglish ? 'No channels yet. Create one to organize your audiobooks.' : 'কোনো চ্যানেল নেই। অডিওবুক প্রকাশের জন্য নতুন চ্যানেল খুলুন।'}
                    </Text>
                  ) : (
                    channels.map((c) => (
                      <View key={c.id} style={styles.itemRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRowTitle}>
                            {c.name} {c.moderated ? `(${isEnglish ? 'Restricted' : 'সীমাবদ্ধ'})` : ''}
                          </Text>
                          <Text style={styles.itemRowSub} numberOfLines={1}>{c.description || 'No description'}</Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setChannelEditId(c.id);
                            setChannelName(c.name);
                            setChannelDesc(c.description);
                            setChannelModalVisible(true);
                          }}
                          style={styles.editBtn}
                        >
                          <Text style={styles.editBtnText}>✏️</Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>

                {/* Published Audiobooks Management */}
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>{isEnglish ? 'Your Audiobooks' : 'আপনার অডিওবুকসমূহ'}</Text>
                    <TagBadge label={`${books.length}`} variant="genre" />
                  </View>
                  {books.length === 0 ? (
                    <Text style={styles.sectionDescription}>
                      {isEnglish ? 'You have not uploaded any audiobooks yet.' : 'এখনো কোনো অডিওবুক আপলোড করেননি।'}
                    </Text>
                  ) : (
                    books.map((b) => (
                      <View key={b.id} style={styles.itemRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRowTitle}>{b.title}</Text>
                          <Text style={styles.itemRowSub}>
                            {b.status} · {b.visibility} · {b.access_tier || 'free'}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleToggleVisibility(b)}
                          style={[styles.visBtn, b.visibility === 'PUBLIC' && styles.visBtnPublic]}
                        >
                          <Text style={styles.visBtnText}>
                            {b.visibility === 'PUBLIC' ? (isEnglish ? 'Public' : 'পাবলিক') : (isEnglish ? 'Private' : 'প্রাইভেট')}
                          </Text>
                        </Pressable>
                      </View>
                    ))
                  )}
                </View>

                {/* Revenue & Withdrawal History */}
                <View style={styles.sectionCard}>
                  <Text style={styles.sectionTitle}>{isEnglish ? 'Payout History' : 'উত্তোলন বিবরণী'}</Text>
                  {dashboard.withdrawals?.length === 0 ? (
                    <Text style={styles.sectionDescription}>{isEnglish ? 'No withdrawal requests yet.' : 'কোনো উত্তোলন রেকর্ড নেই।'}</Text>
                  ) : (
                    dashboard.withdrawals?.map((w: any) => (
                      <View key={w.id} style={styles.itemRowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemRowTitle}>৳{w.amount} → {w.destination}</Text>
                          <Text style={styles.itemRowSub}>{new Date(w.created_at).toLocaleDateString()}</Text>
                        </View>
                        <TagBadge
                          label={w.status.toUpperCase()}
                          variant={w.status === 'completed' ? 'free' : w.status === 'rejected' ? 'premium' : 'genre'}
                        />
                      </View>
                    ))
                  )}
                </View>
              </>
            )}
          </>
        )}

        {/* ─── LISTENER SPECIFIC WORKFLOWS ─── */}
        {!isPublisher && (
          <>
            {/* Subscription Card */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{t('subscriptionSection')}</Text>
                <TagBadge
                  label={isPremium ? 'PREMIUM' : 'FREE'}
                  variant={isPremium ? 'premium' : 'free'}
                />
              </View>

              <Text style={styles.sectionDescription}>
                {isPremium
                  ? isEnglish
                    ? `Premium active until ${new Date(user?.premium_until!).toLocaleDateString()}. Enjoy ad-free listening and encrypted offline downloads.`
                    : `${new Date(user?.premium_until!).toLocaleDateString()} পর্যন্ত প্রিমিয়াম সক্রিয়। অফলাইন ডাউনলোড ও আনলিমিটেড রূপান্তর সুবিধা পান।`
                  : isEnglish
                  ? 'Upgrade to Premium for eligible offline listening, unlimited conversions, and premium titles.'
                  : 'অফলাইন লিসেনিং, আনলিমিটেড এআই অডিও রূপান্তর ও প্রিমিয়াম টাইটেল পেতে আপগ্রেড করুন।'}
              </Text>

              {isPremium ? (
                <BanglaBookButton
                  label={isEnglish ? 'Cancel Future Renewal' : 'ভবিষ্যতের অটো-রিনিউ বাতিল করুন'}
                  onPress={handleCancelSubscription}
                  variant="secondary"
                />
              ) : (
                <BanglaBookButton
                  label={t('upgradeToPremium')}
                  onPress={() => setUpgradeModalVisible(true)}
                  variant="primary"
                />
              )}
            </View>

            {/* Payment History */}
            {payments.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{isEnglish ? 'Payment History' : 'পেমেন্ট হিস্ট্রি'}</Text>
                {payments.slice(0, 5).map((p) => (
                  <View key={p.id} style={styles.itemRowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemRowTitle}>৳{p.amount} ({p.kind})</Text>
                      <Text style={styles.itemRowSub}>{new Date(p.created_at).toLocaleDateString()}</Text>
                    </View>
                    <TagBadge
                      label={p.status.toUpperCase()}
                      variant={p.status === 'success' ? 'free' : p.status === 'failed' ? 'premium' : 'genre'}
                    />
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {/* Language Selection Setting */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('appLanguageSection')}</Text>
          <View style={styles.langChoicesRow}>
            {[
              { id: 'bn' as const, label: 'বাংলা' },
              { id: 'en' as const, label: 'English' },
            ].map((lang) => (
              <Pressable
                key={lang.id}
                onPress={() => setLanguage(lang.id)}
                style={[
                  styles.langChoiceButton,
                  language === lang.id && styles.langChoiceActive,
                ]}
              >
                <Text
                  style={[
                    styles.langChoiceText,
                    language === lang.id && styles.langChoiceTextActive,
                  ]}
                >
                  {language === lang.id ? `✓ ${lang.label}` : lang.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <BanglaBookButton
          label={t('btnLogout')}
          onPress={handleLogout}
          variant="secondary"
        />
      </ScrollView>

      {/* ─── UPGRADE SUBSCRIPTION MODAL ─── */}
      <ModalBottomSheet
        visible={upgradeModalVisible}
        onClose={() => setUpgradeModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{t('paymentModalTitle')}</Text>
          <Text style={styles.modalSub}>{t('paymentModalSub')}</Text>

          <View style={{ gap: Spacing.sm }}>
            {plans.map((p) => (
              <Pressable
                key={p.id}
                style={styles.planCard}
                onPress={() => handleInitiateOrder('subscription', p.id)}
              >
                <View>
                  <Text style={styles.planName}>{p.name}</Text>
                  <Text style={styles.planDuration}>{p.months} {isEnglish ? 'Month(s)' : 'মাস'}</Text>
                </View>
                <Text style={styles.planPrice}>৳{p.price}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ModalBottomSheet>

      {/* ─── DEVELOPMENT bKASH CHECKOUT MODAL ─── */}
      <Modal
        visible={Boolean(checkoutOrder)}
        transparent
        animationType="slide"
        onRequestClose={() => setCheckoutOrder(null)}
      >
        <View style={styles.checkoutOverlay}>
          <View style={styles.checkoutBox}>
            <View style={styles.checkoutHeader}>
              <Text style={styles.bKashBrand}>bKash Payment Simulation</Text>
              <Text style={styles.checkoutOrderText}>Order: {checkoutOrder?.id.slice(0, 8)}</Text>
            </View>

            <View style={styles.checkoutAmountRow}>
              <Text style={styles.checkoutAmountLabel}>{isEnglish ? 'Total Amount' : 'মোট পরিমাণ'}:</Text>
              <Text style={styles.checkoutAmountVal}>৳{checkoutOrder?.amount}</Text>
            </View>

            <Text style={styles.checkoutNotice}>
              {isEnglish
                ? 'Development gateway: No real money is transferred. Choose an outcome to test payment webhooks and status changes.'
                : 'ডেভেলপমেন্ট মোড: কোনো আসল টাকা কাটা হবে না। সিস্টেমের পেমেন্ট যাচাই করতে নিচের বাটনে চাপ দিন।'}
            </Text>

            <View style={{ gap: Spacing.sm, marginTop: Spacing.sm }}>
              <BanglaBookButton
                label={isEnglish ? '✓ Confirm Payment (Success)' : '✓ পেমেন্ট সফল করুন (Success)'}
                onPress={() => handleConfirmMockPayment('success')}
                variant="primary"
                isLoading={isProcessingPayment}
              />
              <BanglaBookButton
                label={isEnglish ? '✗ Simulate Payment Failure' : '✗ পেমেন্ট ব্যর্থ সিমুলেট করুন'}
                onPress={() => handleConfirmMockPayment('failed')}
                variant="outline"
                isLoading={isProcessingPayment}
              />
              <BanglaBookButton
                label={isEnglish ? 'Cancel Order' : 'অর্ডার বাতিল করুন'}
                onPress={() => handleConfirmMockPayment('cancelled')}
                variant="secondary"
                isLoading={isProcessingPayment}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ─── CHANNEL CREATE/EDIT MODAL ─── */}
      <ModalBottomSheet
        visible={channelModalVisible}
        onClose={() => setChannelModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{channelEditId ? (isEnglish ? 'Edit Channel' : 'চ্যানেল সম্পাদনা') : (isEnglish ? 'Create New Channel' : 'নতুন চ্যানেল তৈরি')}</Text>
          <View style={{ gap: Spacing.sm }}>
            <TextInput
              style={styles.textInput}
              value={channelName}
              onChangeText={setChannelName}
              placeholder={isEnglish ? 'Channel Name (e.g. Classic Bengali)' : 'চ্যানেলের নাম'}
              placeholderTextColor={Colors.textMuted}
            />
            <TextInput
              style={[styles.textInput, { height: 80 }]}
              value={channelDesc}
              onChangeText={setChannelDesc}
              placeholder={isEnglish ? 'Description' : 'চ্যানেলের বিবরণ'}
              placeholderTextColor={Colors.textMuted}
              multiline
            />
            <BanglaBookButton
              label={isSavingChannel ? (isEnglish ? 'Saving...' : 'সংরক্ষণ হচ্ছে...') : (isEnglish ? 'Save Channel' : 'চ্যানেল সংরক্ষণ করুন')}
              onPress={handleSaveChannel}
              variant="primary"
              isLoading={isSavingChannel}
            />
          </View>
        </View>
      </ModalBottomSheet>

      {/* ─── WITHDRAWAL REQUEST MODAL ─── */}
      <ModalBottomSheet
        visible={withdrawalModalVisible}
        onClose={() => setWithdrawalModalVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{isEnglish ? 'Request Revenue Withdrawal' : 'উত্তোলন অনুরোধ'}</Text>
          <Text style={styles.modalSub}>
            {isEnglish ? `Available: ৳${dashboard?.available_balance || '0.00'}` : `ব্যালেন্স: ৳${dashboard?.available_balance || '০.০০'}`}
          </Text>

          <View style={{ gap: Spacing.sm }}>
            <TextInput
              style={styles.textInput}
              value={withdrawalAmount}
              onChangeText={setWithdrawalAmount}
              placeholder={isEnglish ? 'Amount in BDT (e.g. 500)' : 'টাকার পরিমাণ'}
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.textInput}
              value={withdrawalDest}
              onChangeText={setWithdrawalDest}
              placeholder={isEnglish ? 'Payout destination (bKash/Nagad number)' : 'বিকাশ/নগদ নম্বর'}
              placeholderTextColor={Colors.textMuted}
            />
            <BanglaBookButton
              label={isSubmittingWithdrawal ? (isEnglish ? 'Submitting...' : 'জমা হচ্ছে...') : (isEnglish ? 'Submit Withdrawal Request' : 'অনুরোধ জমা দিন')}
              onPress={handleRequestWithdrawal}
              variant="primary"
              isLoading={isSubmittingWithdrawal}
            />
          </View>
        </View>
      </ModalBottomSheet>
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
  statsCard: {
    backgroundColor: '#201A1E',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  statsCardTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: '#FFF',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: FontSizes.xs - 1,
    color: '#A09CA8',
    textAlign: 'center',
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.sm,
  },
  itemRowTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemRowSub: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionPill: {
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
  },
  actionPillText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  editBtn: {
    padding: Spacing.xs,
  },
  editBtnText: {
    fontSize: 18,
  },
  visBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
    backgroundColor: '#E2DBD2',
  },
  visBtnPublic: {
    backgroundColor: '#D1E7DD',
  },
  visBtnText: {
    fontSize: FontSizes.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  rejectedBanner: {
    backgroundColor: Colors.tintError,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  rejectedTitle: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.tintErrorText,
  },
  rejectedReason: {
    fontSize: FontSizes.xs,
    color: Colors.tintErrorText,
  },
  textInput: {
    height: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  planCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  planName: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  planDuration: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  planPrice: {
    fontSize: FontSizes.md,
    fontWeight: '800',
    color: Colors.primary,
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
  checkoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  checkoutBox: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    gap: Spacing.md,
  },
  checkoutHeader: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
    paddingBottom: Spacing.sm,
  },
  bKashBrand: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: '#D12053',
  },
  checkoutOrderText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
  },
  checkoutAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  checkoutAmountLabel: {
    fontSize: FontSizes.base,
    color: Colors.textPrimary,
  },
  checkoutAmountVal: {
    fontSize: FontSizes.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  checkoutNotice: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    backgroundColor: Colors.surfaceElevated,
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    lineHeight: 18,
  },
});
