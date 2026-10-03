/**
 * ActionPillBar — Segmented pill action bar matching Figma plates.
 * Used on Audiobook Details (`Save · Playlist · Offline · Report`)
 * and Player (`Chapters · Queue · Bookmark · Offline`).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

export interface ActionItem {
  id: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}

interface ActionPillBarProps {
  items: ActionItem[];
}

export function ActionPillBar({ items }: ActionPillBarProps) {
  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={item.id}>
            <Pressable
              onPress={item.onPress}
              style={({ pressed }) => [
                styles.itemPressable,
                pressed && styles.itemPressed,
              ]}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.itemLabel,
                  item.active && styles.itemLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
            {!isLast && <Text style={styles.separator}>·</Text>}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    marginVertical: Spacing.sm,
  },
  itemPressable: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  itemPressed: {
    opacity: 0.6,
  },
  itemLabel: {
    fontSize: FontSizes.base,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  itemLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  separator: {
    fontSize: FontSizes.base,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.sm,
    fontWeight: 'bold',
  },
});
