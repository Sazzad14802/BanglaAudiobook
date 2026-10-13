/**
 * Authentication-related TypeScript types.
 * Mirrors the Platform API auth/user schemas.
 */

export interface User {
  id: string;
  account_type: 'listener' | 'publisher' | 'admin';
  publisher_status: string;
  premium_until?: string;
  suspended: boolean;
  username: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterRequest {
  account_type?: 'listener' | 'publisher';
  username?: string;
  email: string;
  password: string;
  full_name?: string;
}


export interface LoginRequest {
  account_type?: 'listener' | 'publisher';
  username_or_email: string;
  password: string;
}
