/**
 * App-wide configuration.
 *
 * For Android emulator: the host machine's localhost is at 10.0.2.2
 * For iOS simulator: localhost works directly
 * For physical device: use the machine's LAN IP address
 *
 * Change API_BASE_URL to match your development setup.
 */

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

function getDevHost(): string {
  if (Platform.OS === 'web') {
    return 'localhost';
  }
  // 1. Official Expo hostUri
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }
  // 2. NativeModules scriptURL
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    const match = scriptURL.match(/^(?:https?|exps?):\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }
  return '192.168.0.118';
}

const host = getDevHost();

export const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000'
    : `http://${host}:8000`;

export const API_V1 = `${API_BASE_URL}/api/v1`;


/** Playback progress sync interval in milliseconds */
export const PLAYBACK_SYNC_INTERVAL_MS = 10_000;

/** Generation status polling interval in milliseconds */
export const GENERATION_POLL_INTERVAL_MS = 5_000;
