/**
 * EditorialHeroCard — featured audiobook card: artwork with a dark caption panel.
 * Without uploaded artwork it falls back to the book's generated typographic cover.
 */

import React from 'react';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { TagBadge } from './TagBadge';
import { BookCover } from './BookCover';
import { resolveMediaUrl } from '../config';
import { Colors, FontSizes, Radius, Spacing } from '../theme';

interface EditorialHeroCardProps {
  title: string;
  meta: string;
  coverUrl?: string | null;
  badge?: string;
  onPress?: () => void;
  height?: number;
}

export function EditorialHeroCard({ title, meta, coverUrl, badge, onPress, height = 220 }: EditorialHeroCardProps) {
  const source = resolveMediaUrl(coverUrl);

  const caption = (
    <>
      {badge ? (
        <View style={styles.topBadgeContainer}>
          <TagBadge label={badge} variant="editorial" />
        </View>
      ) : (
        <View />
      )}
      <View style={styles.darkOverlay}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.wrapper, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={title}
    >
      {source ? (
        <ImageBackground source={{ uri: source }} style={[styles.imageBg, { height }]} imageStyle={styles.image}>
          {caption}
        </ImageBackground>
      ) : (
        <View style={[styles.imageBg, { height }]}>
          <View style={StyleSheet.absoluteFill}>
            <BookCover title={title} size={height} fill radius={Radius.xl} />
          </View>
          {caption}
        </View>
      )}
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
    backgroundColor: Colors.darkGlass,
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
    color: Colors.textOnDarkSecondary,
    fontSize: FontSizes.xs,
    marginTop: 2,
    fontWeight: '500',
  },
});
