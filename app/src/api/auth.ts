/**
 * Authentication API functions.
 */

import { apiClient } from './client';
import { LoginRequest, RegisterRequest, TokenResponse } from '../types/auth';
import { User } from '../types/auth';

export const authApi = {
  logout() { return apiClient.post('/auth/logout'); },
  register(data: RegisterRequest): Promise<User> {
    const payload = {
      username: data.username?.trim(),
      account_type: data.account_type || 'listener',
      full_name: data.full_name || '',
      email: data.email.trim().toLowerCase(),
      password: data.password,
    };
    return apiClient.post<User>('/auth/register', payload, false);
  },

  login(data: LoginRequest): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/auth/login', data, false);
  },

  me(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },
};
