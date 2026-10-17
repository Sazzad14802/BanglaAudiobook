/**
 * Google sign-in through Supabase Auth (browser OAuth, no native SDK).
 *
 * 1. Open Supabase's /authorize endpoint for the Google provider.
 * 2. Supabase redirects back to the app deep link with an access token.
 * 3. The Platform API verifies that token with Supabase and issues its own session,
 *    so roles and authorization stay with the Platform API.
 */

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { apiClient } from '../api/client';
import { TokenResponse } from '../types/auth';

WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/+$/, '');

export class GoogleSignInCancelled extends Error {}

export function isGoogleSignInConfigured(): boolean {
  return SUPABASE_URL.startsWith('https://');
}

/** Deep link Supabase returns to; must be in Supabase → Auth → URL Configuration → Redirect URLs. */
export function googleRedirectUrl(): string {
  return Linking.createURL('auth-callback');
}

function tokenFromRedirect(url: string): { accessToken?: string; error?: string } {
  // Implicit flow returns tokens in the fragment: …#access_token=…&expires_in=…
  const [, fragment = ''] = url.split('#');
  const [, query = ''] = url.split('?');
  const params = new URLSearchParams(fragment || query.split('#')[0]);
  return {
    accessToken: params.get('access_token') ?? undefined,
    error: params.get('error_description') ?? params.get('error') ?? undefined,
  };
}

export async function signInWithGoogle(accountType: 'listener' | 'publisher'): Promise<TokenResponse> {
  if (!isGoogleSignInConfigured()) {
    throw new Error('Google sign-in is not configured. Set EXPO_PUBLIC_SUPABASE_URL in app/.env.');
  }
  const redirectTo = googleRedirectUrl();
  const authorizeUrl =
    `${SUPABASE_URL}/auth/v1/authorize?provider=google` +
    `&redirect_to=${encodeURIComponent(redirectTo)}` +
    `&scopes=${encodeURIComponent('email profile')}`;

  const result = await WebBrowser.openAuthSessionAsync(authorizeUrl, redirectTo);
  if (result.type !== 'success') throw new GoogleSignInCancelled('Sign-in was cancelled');

  const { accessToken, error } = tokenFromRedirect(result.url);
  if (!accessToken) throw new Error(error || 'Google did not return a session');

  return apiClient.post<TokenResponse>('/auth/supabase', { access_token: accessToken, account_type: accountType }, false);
}
