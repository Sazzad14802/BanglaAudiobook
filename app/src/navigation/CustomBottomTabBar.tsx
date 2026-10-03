/**
 * CustomBottomTabBar — Bottom bar matching Figma navigation plates.
 * Sits at bottom with 5 tabs and hosts the persistent mini-player right above it.
 * Tabs: ● হোম, ○ খুঁজুন, ○ লাইব্রেরি, ✦ তৈরি, ○ প্রোফাইল
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { PersistentMiniPlayer } from '../components/PersistentMiniPlayer';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

const TAB_CONFIG: Record<
  string,
  { label: string; icon: string; activeIcon: string }
> = {
  HomeTab: { label: 'হোম', icon: '○', activeIcon: '●' },
  ExploreTab: { label: 'খুঁজুন', icon: '○', activeIcon: '●' },
  LibraryTab: { label: 'লাইব্রেরি', icon: '○', activeIcon: '●' },
  CreateTab: { label: 'তৈরি', icon: '◇', activeIcon: '◆' },
  ProfileTab: { label: 'প্রোফাইল', icon: '○', activeIcon: '●' },
};

export function CustomBottomTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  // Check if current focused route disables mini-player (e.g. on full Player screen)
  const currentRoute = state.routes[state.index];
  const descriptor = descriptors[currentRoute.key];
  const hideMiniPlayer = (descriptor.options as any)?.tabBarHideMiniPlayer === true;

  return (
    <View style={styles.wrapper}>
      {/* Persistent Mini-Player Pinned Above Tabs */}
      {!hideMiniPlayer && <PersistentMiniPlayer />}

      {/* 5-Tab Bar */}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const config = TAB_CONFIG[route.name] ?? {
            label: route.name,
            icon: '○',
            activeIcon: '●',
          };

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
              accessibilityLabel={config.label}
            >
              <View style={styles.tabContent}>
                <Text
                  style={[
                    styles.tabIndicator,
                    isFocused ? styles.tabIndicatorActive : styles.tabIndicatorInactive,
                  ]}
                >
                  {isFocused ? config.activeIcon : config.icon}
                </Text>
                <Text
                  style={[
                    styles.tabLabel,
                    isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
                  ]}
                >
                  {config.label}
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
