/**
 * Replacement for expo-notifications' TopicSubscriptionModule (wired in metro.config.js).
 * Uses the native module when the build has it, otherwise a no-op so Expo Go can load.
 */
import { requireOptionalNativeModule } from 'expo-modules-core';

const noop = {
  addListener: () => {},
  removeListeners: () => {},
  subscribeToTopicAsync: () => Promise.resolve(null),
  unsubscribeFromTopicAsync: () => Promise.resolve(null),
};

export default requireOptionalNativeModule('ExpoTopicSubscriptionModule') ?? noop;
