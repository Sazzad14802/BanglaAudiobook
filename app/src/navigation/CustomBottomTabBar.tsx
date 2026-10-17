/**
 * CustomBottomTabBar — Bottom bar matching Figma navigation plates.
 * Sits at bottom with 5 tabs and hosts the persistent mini-player right above it.
 * Tabs: ● হোম, ○ খুঁজুন, ○ লাইব্রেরি, ✦ তৈরি, ○ প্রোফাইল
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PersistentMiniPlayer } from '../components/PersistentMiniPlayer';
import { Colors, FontSizes, Radius, Spacing } from '../theme';
import { useLanguage } from '../contexts/LanguageContext';

const TAB_ICONS: Record<string, { icon: string; activeIcon: string }> = {
  HomeTab: { icon: '○', activeIcon: '●' },
  ExploreTab: { icon: '○', activeIcon: '●' },
  LibraryTab: { icon: '○', activeIcon: '●' },
  CreateTab: { icon: '◇', activeIcon: '◆' },
  ProfileTab: { icon: '○', activeIcon: '●' },
};

export function CustomBottomTabBar({
  state,
  navigation,
}: BottomTabBarProps) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const getTabLabel = (routeName: string) => {
    switch (routeName) {
      case 'HomeTab':
        return t('tabHome');
      case 'ExploreTab':
        return t('tabExplore');
      case 'LibraryTab':
        return t('tabLibrary');
      case 'CreateTab':
        return t('tabCreate');
      case 'ProfileTab':
        return t('tabProfile');
      default:
        return routeName;
    }
  };

  // The mini player is redundant on the full-screen player of the focused tab.
  const currentRoute = state.routes[state.index];
  const focusedScreen = getFocusedRouteNameFromRoute(currentRoute);
  const hideMiniPlayer = focusedScreen === 'Player';

  return (
    <View style={[styles.wrapper, { paddingBottom: insets.bottom }]}>
      {/* Persistent Mini-Player Pinned Above Tabs */}
      {!hideMiniPlayer && (
        <PersistentMiniPlayer
          onPress={() => navigation.navigate(currentRoute.name, { screen: 'Player' } as any)}
        />
      )}

      {/* 5-Tab Bar */}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? { icon: '○', activeIcon: '●' };
          const label = getTabLabel(route.name);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                styles.tabItem,
                pressed && styles.tabItemPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.tabIndicator,
                    isFocused ? styles.tabIndicatorActive : styles.tabIndicatorInactive,
                  ]}
                >
                  {isFocused ? icons.activeIcon : icons.icon}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {label}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    height: 54,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xs,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabIndicator: {
    fontSize: 10,
    lineHeight: 12,
  },
  tabIndicatorActive: {
    color: Colors.textPrimary,
  },
  tabIndicatorInactive: {
    color: Colors.textSecondary,
  },
  tabLabel: {
    fontSize: FontSizes.xs,
    letterSpacing: -0.2,
  },
  tabLabelActive: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  tabLabelInactive: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
