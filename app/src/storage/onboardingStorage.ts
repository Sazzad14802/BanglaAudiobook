/**
 * Remembers that the first-run onboarding (intro, language, notifications) was completed,
 * so returning users go straight to sign-in.
 */

import * as SecureStore from 'expo-secure-store';

const KEY = 'bornoverse_onboarding_done';

export const onboardingStorage = {
  async isDone(): Promise<boolean> {
    try {
      return (await SecureStore.getItemAsync(KEY)) === '1';
    } catch {
      return false;
    }
  },

  async markDone(): Promise<void> {
    try {
      await SecureStore.setItemAsync(KEY, '1');
    } catch {}
  },
};
