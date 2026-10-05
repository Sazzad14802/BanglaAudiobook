/**
 * App-wide configuration.
 *
 * Supported environments:
 * 1. Cloud Tunnel: https://bangla-audiobook-api.loca.lt (accessible from any network, cellular, Wi-Fi)
 * 2. LAN Wi-Fi: http://192.168.0.118:8000
 * 3. Android Emulator: http://10.0.2.2:8000
 * 4. Web / iOS Simulator: http://localhost:8000
 *
 * Design Pattern: Strategy & Chain of Responsibility (Endpoint Candidate Resolver)
 */

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

export const CLOUD_TUNNEL_URL = 'https://bangla-audiobook-api.loca.lt';
export const LAN_DEFAULT_IP = '192.168.0.118';

function isIpAddress(host: string): boolean {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(host);
}

function getDetectedLanHost(): string {
  // 1. Official Expo hostUri
  const hostUri = Constants.expoConfig?.hostUri || (Constants as any)?.manifest2?.extra?.expoClient?.hostUri;
  if (hostUri) {
    const rawHost = hostUri.split(':')[0];
    if (rawHost && isIpAddress(rawHost) && rawHost !== '127.0.0.1') {
      return rawHost;
    }
  }
  // 2. NativeModules scriptURL
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL as string | undefined;
  if (scriptURL) {
    const match = scriptURL.match(/^(?:https?|exps?):\/\/([^:/]+)/);
    if (match && match[1] && isIpAddress(match[1]) && match[1] !== '127.0.0.1') {
      return match[1];
    }
  }
  return LAN_DEFAULT_IP;
}

export function getApiBaseUrlCandidates(): string[] {
  if (Platform.OS === 'web') {
    return ['http://localhost:8000'];
  }

  const lanHost = getDetectedLanHost();
  const lanUrl = `http://${lanHost}:8000`;
  const emulatorUrl = 'http://10.0.2.2:8000';

  // Check if we are running under an Expo tunnel (e.g. *.exp.direct or *.ngrok)
  const hostUri = Constants.expoConfig?.hostUri || '';
  const isTunnelMode =
    hostUri.includes('exp.direct') ||
    hostUri.includes('ngrok') ||
    hostUri.includes('loca.lt');

  if (isTunnelMode) {
    // In tunnel mode, the phone is accessing via internet, so cloud tunnel is primary
    return [CLOUD_TUNNEL_URL, lanUrl, emulatorUrl];
  }

  // Otherwise, cloud tunnel is still first for reliability, followed by LAN
  return [CLOUD_TUNNEL_URL, lanUrl, emulatorUrl];
}

const candidates = getApiBaseUrlCandidates();
let currentApiBaseUrl = candidates[0];

export function getActiveApiBaseUrl(): string {
  return currentApiBaseUrl;
}

export function setActiveApiBaseUrl(url: string) {
  console.log(`[Config] Active API base URL updated to: ${url}`);
  currentApiBaseUrl = url;
}

export function getActiveApiV1(): string {
  return `${currentApiBaseUrl}/api/v1`;
}

// Default exports for backward compatibility
export const API_BASE_URL = currentApiBaseUrl;
export const API_V1 = `${currentApiBaseUrl}/api/v1`;

/** Playback progress sync interval in milliseconds */
export const PLAYBACK_SYNC_INTERVAL_MS = 10_000;

/** Generation status polling interval in milliseconds */
export const GENERATION_POLL_INTERVAL_MS = 5_000;
