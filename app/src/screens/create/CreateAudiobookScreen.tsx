/**
 * CreateAudiobookScreen — step 1 of 3: audiobook details.
 *
 * Rules mirrored from the server (which enforces them):
 * - Listeners create private, free audiobooks for themselves.
 * - Only active publishers may publish publicly, use channels or premium access.
 * - A monthly generation quota applies per plan.
 */

import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '../../components/AppHeader';
import { AppButton } from '../../components/AppButton';
import { BookCover } from '../../components/BookCover';
import { ChipGroup } from '../../components/Chip';
import { Field, FormCard, Segmented } from '../../components/Form';
import { StateView } from '../../components/StateView';
import { audiobooksApi } from '../../api/audiobooks';
import { generationApi } from '../../api/generation';
import { publisherApi } from '../../api/account';
import { errorMessage } from '../../api/client';
import { PickedFile } from '../../api/upload';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useResource } from '../../hooks/useResource';
import { useAppNavigation } from '../../navigation/useAppNavigation';
import { GENRES } from '../../constants/genres';
import { isActivePublisher } from '../../types/auth';
import { AccessTier, AudiobookVisibility } from '../../types/audiobook';
import { pickCoverImage } from '../../utils/pickers';
import { Colors, FontSizes, Radius, Spacing } from '../../theme';

export function CreateAudiobookScreen() {
  const { navigation, goToTab } = useAppNavigation();
  const { t, tx, isEnglish } = useLanguage();
  const { user } = useAuth();
  const isPublisher = user?.account_type === 'publisher';
  const canPublish = isActivePublisher(user);

  const setup = useResource(async () => {
    const [quota, channels] = await Promise.all([
      generationApi.quota(),
      canPublish ? publisherApi.channels() : Promise.resolve([]),
    ]);
    return { quota, channels: channels.filter((c) => !c.moderated) };
  }, [canPublish]);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [genre, setGenre] = useState('');
  const [tier, setTier] = useState<AccessTier>('free');
  const [visibility, setVisibility] = useState<AudiobookVisibility>('PUBLIC');
  const [channelId, setChannelId] = useState('');
  const [cover, setCover] = useState<PickedFile | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const quota = setup.data?.quota;
  const quotaFull = !!quota && quota.used >= quota.limit;

  const chooseCover = async () => {
    try {
      const picked = await pickCoverImage();
      if (picked) setCover(picked);
    } catch (error) {
      Alert.alert(tx('কভার', 'Cover'), errorMessage(error));
    }
  };

  const submit = async () => {
    if (!title.trim()) {
      setTitleError(tx('শিরোনাম দিন', 'Enter a title'));
      return;
    }
    if (quotaFull) {
      Alert.alert(
        tx('মাসিক কোটা শেষ', 'Monthly quota reached'),
        tx('এই মাসের অডিও তৈরির সীমা পূর্ণ। প্রিমিয়ামে সীমা বেশি।', 'You have used this month’s generations. Premium has a higher limit.'),
      );
      return;
    }
    setSubmitting(true);
    try {
      const book = await audiobooksApi.create({
        title: title.trim(),
        author: author.trim() || undefined,
        description: description.trim() || undefined,
        language,
        genre: genre || undefined,
        visibility: canPublish ? visibility : 'PRIVATE',
        access_tier: canPublish ? tier : 'free',
        channel_id: canPublish && channelId ? channelId : undefined,
      });
      if (cover) {
        // A failed cover upload should not lose the created audiobook.
        await audiobooksApi.uploadCover(book.id, cover).catch((error) =>
          Alert.alert(tx('কভার আপলোড হয়নি', 'Cover not uploaded'), errorMessage(error)),
        );
      }
      setTitle('');
      setAuthor('');
      setDescription('');
      setCover(null);
      navigation.navigate('UploadSource', { audiobookId: book.id, title: book.title });
    } catch (error) {
      Alert.alert(tx('তৈরি করা যায়নি', 'Could not create'), errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (isPublisher && !canPublish) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <AppHeader title={t('createTitle')} subtitle={tx('প্রকাশক অ্যাকাউন্ট', 'Publisher account')} />
        <View style={styles.scrollContent}>
          <StateView
            kind="empty"
            title={tx('প্রকাশক অ্যাকাউন্ট এখনো চালু হয়নি', 'Your publisher account is not active yet')}
            message={
              user?.publisher_status === 'approved_pending_payment'
                ? tx('আবেদন অনুমোদিত হয়েছে। নিবন্ধন ফি পরিশোধ করলেই অডিওবুক প্রকাশ করতে পারবেন।', 'Your application is approved. Pay the registration fee to start publishing.')
                : tx('যাচাইকরণ নথি জমা দিন। অনুমোদনের পর নিবন্ধন ফি দিয়ে অ্যাকাউন্ট চালু করুন।', 'Submit your verification document. After approval, pay the registration fee to activate.')
            }
            actionLabel={tx('প্রকাশক সেটআপ', 'Publisher setup')}
            onAction={() => goToTab('ProfileTab', { screen: 'Publisher' })}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AppHeader
        title={t('createTitle')}
        subtitle={tx('ধাপ ১/৩ · তথ্য', 'Step 1 of 3 · Details')}
      />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {quota ? (
            <View style={styles.quotaCard}>
              <View style={styles.quotaHeader}>
                <Text style={styles.quotaPlan}>
                  {tx('এই মাসের অডিও তৈরি', 'Generations this month')} ·{' '}
                  {quota.plan === 'publisher' ? tx('প্রকাশক', 'Publisher') : quota.plan === 'premium' ? tx('প্রিমিয়াম', 'Premium') : tx('ফ্রি', 'Free')}
                </Text>
                <Text style={[styles.quotaCounter, quotaFull && styles.quotaFull]}>
                  {quota.used}/{quota.limit}
                </Text>
              </View>
              <View style={styles.quotaBarTrack}>
                <View style={[styles.quotaBarFill, { width: `${Math.min(100, quota.limit ? (quota.used / quota.limit) * 100 : 100)}%` }]} />
              </View>
            </View>
          ) : null}

          <FormCard>
            <View style={styles.coverRow}>
              <Pressable onPress={chooseCover} style={styles.coverPicker} accessibilityRole="button" accessibilityLabel={tx('কভার বেছে নিন', 'Choose cover')}>
                {cover ? (
                  <BookCover title={title || '?'} uri={cover.uri} size={84} />
                ) : (
                  <View style={styles.coverPlaceholder}>
                    <Text style={styles.coverPlus}>＋</Text>
                    <Text style={styles.coverLabel}>{tx('কভার', 'Cover')}</Text>
                  </View>
                )}
              </Pressable>
              <View style={styles.flex}>
                <Field
                  label={t('inputBookTitle')}
                  required
                  value={title}
                  onChangeText={(value) => {
                    setTitle(value);
                    setTitleError(null);
                  }}
                  placeholder={t('inputBookTitlePlaceholder')}
                  maxLength={255}
                  error={titleError}
                />
              </View>
            </View>
            <Field label={tx('লেখক', 'Author')} value={author} onChangeText={setAuthor} placeholder={tx('লেখকের নাম', 'Author name')} maxLength={255} />
            <Field
              label={tx('বিবরণ', 'Description')}
              value={description}
              onChangeText={setDescription}
              placeholder={tx('সংক্ষিপ্ত বিবরণ…', 'Short description…')}
              multiline
              maxLength={2000}
            />
            <Segmented
              label={tx('বর্ণনার ভাষা', 'Narration language')}
              value={language}
              onChange={setLanguage}
              options={[
                { value: 'bn', label: 'বাংলা' },
                { value: 'en', label: 'English' },
              ]}
              hint={tx('PDF-এর লেখা যে ভাষায়, সেটি বেছে নিন।', 'Choose the language the PDF is written in.')}
            />
            <View style={styles.field}>
              <Text style={styles.label}>{tx('ধরন', 'Genre')}</Text>
              <ChipGroup
                scrollable
                value={genre}
                onChange={setGenre}
                options={[{ value: '', label: tx('নেই', 'None') }, ...GENRES.map((g) => ({ value: g.key, label: isEnglish ? g.en : g.bn }))]}
              />
            </View>
          </FormCard>

          {canPublish ? (
            <FormCard>
              <Segmented
                label={tx('দৃশ্যমানতা', 'Visibility')}
                value={visibility}
                onChange={setVisibility}
                options={[
                  { value: 'PUBLIC', label: tx('🌐 পাবলিক', '🌐 Public') },
                  { value: 'PRIVATE', label: tx('🔒 প্রাইভেট', '🔒 Private') },
                ]}
                hint={
                  visibility === 'PUBLIC'
                    ? tx('অডিও তৈরি শেষ হলেই সবার জন্য প্রকাশিত হবে।', 'Published to everyone as soon as audio is ready.')
                    : tx('শুধু আপনি দেখতে পাবেন।', 'Only you can see it.')
                }
              />
              <Segmented
                label={tx('অ্যাক্সেস', 'Access')}
                value={tier}
                onChange={setTier}
                options={[
                  { value: 'free', label: tx('ফ্রি', 'Free') },
                  { value: 'premium', label: tx('⭐ প্রিমিয়াম', '⭐ Premium') },
                ]}
                hint={tier === 'premium' ? tx('প্রিমিয়াম শ্রোতাদের যোগ্য শোনা থেকে আয় হয়।', 'Earns revenue from eligible premium listens.') : undefined}
              />
              {setup.data?.channels.length ? (
                <View style={styles.field}>
                  <Text style={styles.label}>{tx('চ্যানেল', 'Channel')}</Text>
                  <ChipGroup
                    scrollable
                    value={channelId}
                    onChange={setChannelId}
                    options={[{ value: '', label: tx('কোনোটি নয়', 'None') }, ...setup.data.channels.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                </View>
              ) : null}
            </FormCard>
          ) : (
            <Text style={styles.note}>
              {tx(
                'আপনার তৈরি অডিওবুক প্রাইভেট থাকবে — শুধু আপনি শুনতে পারবেন।',
                'Audiobooks you create are private — only you can listen.',
              )}
            </Text>
          )}

          <AppButton
            label={tx('পরবর্তী: ফাইল আপলোড →', 'Next: upload file →')}
            onPress={submit}
            isLoading={submitting}
            disabled={quotaFull}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  quotaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    gap: Spacing.xs,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quotaPlan: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quotaCounter: {
    fontSize: FontSizes.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  quotaFull: {
    color: Colors.error,
  },
  quotaBarTrack: {
    height: 6,
    backgroundColor: Colors.track,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  quotaBarFill: {
    height: '100%',
    backgroundColor: Colors.brand,
    borderRadius: Radius.full,
  },
  coverRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  coverPicker: {
    marginTop: 22,
  },
  coverPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.textMuted,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPlus: {
    fontSize: 22,
    color: Colors.textSecondary,
  },
  coverLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: FontSizes.xs + 1,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  note: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
  },
});
