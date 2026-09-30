/**
 * App-wide configuration.
 *
 * For Android emulator: the host machine's localhost is at 10.0.2.2
 * For iOS simulator: localhost works directly
 * For physical device: use the machine's LAN IP address
 *
 * Change API_BASE_URL to match your development setup.
 */

import { Platform } from 'react-native';

// For web browser: localhost works directly
// For Android emulator: 'http://10.0.2.2:8000'
// For physical Android/iOS device (same Wi-Fi): 'http://192.168.0.118:8000'
const DEFAULT_API_URL =
  Platform.OS === 'web'
    ? 'http://localhost:8000'
    : 'http://192.168.0.118:8000';

export const API_BASE_URL = DEFAULT_API_URL;

export const API_V1 = `${API_BASE_URL}/api/v1`;

/** Playback progress sync interval in milliseconds */
export const PLAYBACK_SYNC_INTERVAL_MS = 10_000;

/** Generation status polling interval in milliseconds */
export const GENERATION_POLL_INTERVAL_MS = 5_000;
