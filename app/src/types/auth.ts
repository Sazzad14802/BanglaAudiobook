/**
 * Authentication-related TypeScript types.
 * Mirrors the Platform API auth/user schemas.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username_or_email: string;
  password: string;
}
