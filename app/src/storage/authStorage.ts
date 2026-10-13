/**
 * Secure token storage using expo-secure-store.
 * Tokens are never stored in AsyncStorage (unencrypted).
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export const authStorage = {
  async saveToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },

  async deleteToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync('session_user');
  },
  async saveUser(user: unknown) { await SecureStore.setItemAsync('session_user', JSON.stringify(user)); },
  async getUser() { const value=await SecureStore.getItemAsync('session_user');return value?JSON.parse(value):null; },
};
