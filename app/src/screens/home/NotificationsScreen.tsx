/**
 * NotificationsScreen — the user's inbox. Tapping an item marks it read and
 * opens the screen it refers to. Shows a hint when OS notifications are off.
 */

import React from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { StateView } from '../../components/StateView';
import { AppNotification, notificationsApi } from '../../api/notifications';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../../contexts/NotificationsContext';
import { useResource } from '../../hooks/useResource';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { openNotificationTarget } from '../../navigation/navigationRef';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

function timeAgo(iso: string, english: boolean): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return english ? 'just now' : 'এইমাত্র';
  if (minutes < 60) return english ? `${minutes}m ago` : `${minutes} মিনিট আগে`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return english ? `${hours}h ago` : `${hours} ঘণ্টা আগে`;
  const days = Math.round(hours / 24);
  return english ? `${days}d ago` : `${days} দিন আগে`;
}

export function NotificationsScreen() {
  const { navigation } = useAppNavigation();
  const { tx, isEnglish } = useLanguage();
  const { permission, requestPermission, setUnreadCount } = useNotifications();
  const inbox = useResource(() => notificationsApi.list());

  const items = inbox.data ?? [];
  const hasUnread = items.some((n) => !n.read_at);

  const open = async (item: AppNotification) => {
    if (!item.read_at) {
      inbox.setData((current) =>
        (current ?? []).map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)),
      );
      notificationsApi.markRead(item.id).catch(() => {});
      setUnreadCount(Math.max(0, items.filter((n) => !n.read_at).length - 1));
    }
    openNotificationTarget({ ...item.data, kind: item.kind });
  };

  const markAll = async () => {
    await notificationsApi.markAllRead().catch(() => {});
    setUnreadCount(0);
    inbox.setData((current) => (current ?? []).map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const enable = async () => {
    const granted = await requestPermission();
    if (!granted) Linking.openSettings();
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={tx('নোটিফিকেশন', 'Notifications')}
        onBack={() => navigation.goBack()}
        rightActionText={hasUnread ? tx('সব পড়া হয়েছে', 'Mark all read') : undefined}
        onRightAction={hasUnread ? markAll : undefined}
      />

      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={inbox.isRefreshing} onRefresh={inbox.refresh} tintColor={Colors.primary} />
        }
        ListHeaderComponent={
          permission !== 'granted' ? (
            <Pressable style={styles.permissionCard} onPress={enable} accessibilityRole="button">
              <Text style={styles.permissionTitle}>{tx('নোটিফিকেশন বন্ধ আছে', 'Notifications are off')}</Text>
              <Text style={styles.permissionText}>
                {tx(
                  'অডিওবুক তৈরি শেষ হলে বা পেমেন্ট সফল হলে জানতে চালু করুন।',
                  'Turn them on to hear when an audiobook is ready or a payment succeeds.',
                )}
              </Text>
              <Text style={styles.permissionAction}>{tx('চালু করুন →', 'Turn on →')}</Text>
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          inbox.isLoading ? (
            <StateView kind="loading" />
          ) : inbox.error ? (
            <StateView kind="error" message={inbox.error} actionLabel={tx('আবার চেষ্টা', 'Retry')} onAction={inbox.reload} />
          ) : (
            <StateView
              kind="empty"
              title={tx('কোনো নোটিফিকেশন নেই', 'No notifications yet')}
              message={tx('গুরুত্বপূর্ণ আপডেট এখানে দেখা যাবে।', 'Important updates will show up here.')}
            />
          )
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => open(item)}
            style={({ pressed }) => [styles.item, !item.read_at && styles.itemUnread, pressed && styles.pressed]}
            accessibilityRole="button"
          >
            {!item.read_at ? <View style={styles.dot} /> : <View style={styles.dotSpacer} />}
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              {item.body ? <Text style={styles.itemBody}>{item.body}</Text> : null}
              <Text style={styles.itemTime}>{timeAgo(item.created_at, isEnglish)}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  list: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  permissionCard: {
    backgroundColor: Colors.tintBrand,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  permissionTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  permissionText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  permissionAction: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  item: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  itemUnread: {
    borderColor: Colors.primaryLight,
  },
  pressed: {
    opacity: 0.8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  dotSpacer: {
    width: 8,
  },
  itemText: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    fontSize: FontSizes.base,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  itemBody: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  itemTime: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
