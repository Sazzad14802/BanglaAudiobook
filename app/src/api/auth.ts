/**
 * Authentication API functions.
 */

import { apiClient } from './client';
import { LoginRequest, RegisterRequest, TokenResponse } from '../types/auth';
import { User } from '../types/auth';

export const authApi = {
  register(data: RegisterRequest): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/auth/register', data, false);
  },

  login(data: LoginRequest): Promise<TokenResponse> {
    return apiClient.post<TokenResponse>('/auth/login', data, false);
  },

  me(): Promise<User> {
    return apiClient.get<User>('/auth/me');
  },
};
