/**
 * EditorialHeroCard — Featured audiobook card matching Figma Plates 3 & 4.
 * Features background artwork, SHRUTI EDITOR'S PICK pill, and dark overlay.
 */

import React from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { TagBadge } from './TagBadge';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface EditorialHeroCardProps {
  title: string;
  meta: string;
  coverUrl?: string;
  onPress?: () => void;
  height?: number;
}

export function EditorialHeroCard({
  title,
  meta,
  coverUrl,
  onPress,
  height = 240,
}: EditorialHeroCardProps) {
  const defaultBg = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=800&auto=format&fit=crop';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`Featured: ${title}`}
    >
      <ImageBackground
        source={{ uri: coverUrl || defaultBg }}
        style={[styles.imageBg, { height }]}
        imageStyle={styles.image}
      >
        {/* Top Tag */}
        <View style={styles.topBadgeContainer}>
          <TagBadge label="SHRUTI EDITOR'S PICK" variant="editorial" />
        </View>

        {/* Bottom Dark Card Overlay */}
        <View style={styles.darkOverlay}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </ImageBackground>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceElevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  pressed: {
    opacity: 0.95,
    transform: [{ scale: 0.99 }],
  },
  imageBg: {
    width: '100%',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  image: {
    borderRadius: Radius.xl,
  },
  topBadgeContainer: {
    alignSelf: 'flex-start',
  },
  darkOverlay: {
    backgroundColor: 'rgba(25, 24, 27, 0.88)',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
  },

  title: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  meta: {
    color: '#D1CDC7',
    fontSize: FontSizes.xs,
    marginTop: 2,
    fontWeight: '500',
  },
});
