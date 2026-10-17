/**
 * Authentication-related TypeScript types.
 * Mirrors the Platform API auth/user schemas.
 */

export type AccountType = 'listener' | 'publisher' | 'admin';
export type PublisherStatus = 'pending_approval' | 'approved_pending_payment' | 'active' | 'rejected';

export interface User {
  id: string;
  account_type: AccountType;
  publisher_status: PublisherStatus;
  premium_until: string | null;
  subscription_cancelled: boolean;
  suspended: boolean;
  username: string;
  email: string;
  full_name: string | null;
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
  username: string;
  email: string;
  password: string;
  full_name?: string;
}

export interface LoginRequest {
  account_type?: 'listener' | 'publisher';
  username_or_email: string;
  password: string;
}

/** Entitlement checks mirrored from the server; the server remains the authority. */
export function isPremium(user: User | null | undefined): boolean {
  return Boolean(
    user &&
      user.account_type === 'listener' &&
      !user.suspended &&
      user.premium_until &&
      new Date(user.premium_until).getTime() > Date.now(),
  );
}

export function isActivePublisher(user: User | null | undefined): boolean {
  return Boolean(user && user.account_type === 'publisher' && user.publisher_status === 'active');
}
