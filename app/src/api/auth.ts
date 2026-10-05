/**
 * Authentication API functions.
 */

import { apiClient } from './client';
import { LoginRequest, RegisterRequest, TokenResponse } from '../types/auth';
import { User } from '../types/auth';

export const authApi = {
  register(data: RegisterRequest): Promise<User> {
    const payload = {
      username: data.username?.trim(),
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
