/**
 * Persistent Language Preference Storage.
 *
 * Design Pattern:
 * - Singleton Pattern: Single storage accessor for language preferences.
 */

import * as SecureStore from 'expo-secure-store';

const LANGUAGE_KEY = 'shruti_app_language';

export type AppLanguage = 'bn' | 'en' | 'mixed';

export const languageStorage = {
  async saveLanguage(lang: AppLanguage): Promise<void> {
    try {
      await SecureStore.setItemAsync(LANGUAGE_KEY, lang);
    } catch (e) {
      console.warn('Failed to save language preference:', e);
    }
  },

  async getLanguage(): Promise<AppLanguage | null> {
    try {
      const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
      if (stored === 'bn' || stored === 'en' || stored === 'mixed') {
        return stored;
      }
      return null;
    } catch (e) {
      console.warn('Failed to read language preference:', e);
      return null;
    }
  },
};
