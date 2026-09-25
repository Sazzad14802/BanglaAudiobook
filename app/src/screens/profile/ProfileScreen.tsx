/**
 * ProfileScreen — user info, own audiobooks, and logout.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../contexts/AuthContext';
import { audiobooksApi } from '../../api/audiobooks';
import { Audiobook } from '../../types/audiobook';
import { AudiobookCard } from '../../components/AudiobookCard';
import { Loading } from '../../components/Loading';
import { EmptyState } from '../../components/EmptyState';
import { ProfileStackParamList } from '../../navigation/types';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';
import { ApiError } from '../../api/client';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'Profile'>;

const STATUS_LABELS: Record<string, string> = {
  PENDING: '⏳ Queued',
  PROCESSING: '⚙️ Processing',
  COMPLETED: '✅ Ready',
  FAILED: '❌ Failed',
};

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [myAudiobooks, setMyAudiobooks] = useState<Audiobook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await audiobooksApi.listMine(1, 50);
      setMyAudiobooks(data.items);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    load().finally(() => setIsLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    setIsRefreshing(false);
  }, [load]);

  function handleLogout() {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => logout(),
      },
    ]);
  }

  if (isLoading) return <Loading fullScreen message="Loading profile..." />;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.username?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <Text style={styles.joinDate}>
            Joined {user?.created_at ? new Date(user.created_at).toLocaleDateString() : ''}
          </Text>
        </View>
      </View>

      {/* Logout */}
      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && styles.btnPressed]}
        onPress={handleLogout}
        accessibilityRole="button"
        accessibilityLabel="Log Out"
      >
        <Text style={styles.logoutText}>🚪 Log Out</Text>
      </Pressable>

      {/* My Audiobooks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Audiobooks ({myAudiobooks.length})</Text>
        {myAudiobooks.length === 0 ? (
          <EmptyState
            icon="🎙️"
            title="No Audiobooks Yet"
            subtitle='Create your first audiobook from the "Create" tab.'
          />
        ) : (
          myAudiobooks.map((ab) => (
            <AudiobookCard
              key={ab.id}
              audiobook={ab}
              onPress={() => nav.navigate('AudiobookDetails', { audiobookId: ab.id })}
              subtitle={STATUS_LABELS[ab.status]}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: Spacing.xl, gap: Spacing.md },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textOnPrimary,
    fontSize: FontSizes['2xl'],
    fontWeight: '800',
  },
  userInfo: { flex: 1, gap: 2 },
  username: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: '700',
  },
  email: {
    color: Colors.textSecondary,
    fontSize: FontSizes.sm,
  },
  joinDate: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  logoutBtn: {
    backgroundColor: '#FEF2F2',
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  btnPressed: { opacity: 0.75 },
  logoutText: {
    color: Colors.error,
    fontSize: FontSizes.base,
    fontWeight: '700',
  },
  section: { gap: Spacing.sm },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
});
