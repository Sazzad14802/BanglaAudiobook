/**
 * Authentication repository: email/password sessions, recovery and logout.
 */

import { apiClient } from './client';
import { LoginRequest, RegisterRequest, TokenResponse, User } from '../types/auth';

export const authApi = {
  register(data: RegisterRequest): Promise<User> {
    return apiClient.post<User>(
      '/auth/register',
      {
        username: data.username.trim(),
        account_type: data.account_type ?? 'listener',
        full_name: data.full_name?.trim() ?? '',
        email: data.email.trim().toLowerCase(),
        password: data.password,
      },
      false,
    );
  },

  login(data: LoginRequest): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>(
      '/auth/login',
      { ...data, username_or_email: data.username_or_email.trim() },
      false,
    );
  },

  me(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },

  /** Revokes every session for this account on the server. */
  logout(): Promise<unknown> {
    return apiClient.post('/auth/logout');
  },

  requestRecovery(email: string, accountType: 'listener' | 'publisher'): Promise<{ message: string }> {
    return apiClient.post('/auth/recovery', { email: email.trim().toLowerCase(), account_type: accountType }, false);
  },

  resetPassword(token: string, password: string): Promise<{ message: string }> {
    return apiClient.post('/auth/reset-password', { token: token.trim(), password }, false);
  },
};
