/**
 * Authentication context.
 * Manages the authenticated session: token, current user, login/logout.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/auth';
import { authStorage } from '../storage/authStorage';
import { LoginRequest, RegisterRequest, User, TokenResponse } from '../types/auth';
import { ApiError } from '../api/client';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  acceptSession: (response: TokenResponse) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // On mount: restore session if token exists
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        // Safe timeout for SecureStore read (avoid hanging on locked devices)
        const token = await Promise.race([
          authStorage.getToken(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
        ]);

        if (token && isMounted) {
          try {
            const user = await authApi.me();
            if (isMounted) {
              setState({ user, token, isLoading: false, isAuthenticated: true });
              return;
            }
          } catch (apiErr) {
            if (apiErr instanceof ApiError && apiErr.status === 0) {
              const cached = await authStorage.getUser();
              if (cached && isMounted) {
                setState({user:cached,token,isLoading:false,isAuthenticated:true});
                return;
              }
            }
            // Token is expired or invalid – clear it
            await authStorage.deleteToken().catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Session restoration failed:', err);
      } finally {
        if (isMounted) {
          setState((s) => ({ ...s, isLoading: false }));
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data);
    await authStorage.saveToken(response.access_token);
    await authStorage.saveUser(response.user);
    setState({
      user: response.user,
      token: response.access_token,
      isLoading: false,
      isAuthenticated: true,
    });
  }, []);

  const acceptSession = useCallback(async (response: TokenResponse) => {
    await authStorage.saveToken(response.access_token);
    await authStorage.saveUser(response.user);
    setState({user:response.user,token:response.access_token,isLoading:false,isAuthenticated:true});
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    await authApi.register(data);
    const response = await authApi.login({username_or_email:data.email, password:data.password, account_type:data.account_type});
    await authStorage.saveToken(response.access_token);
    await authStorage.saveUser(response.user);
    setState({user:response.user,token:response.access_token,isLoading:false,isAuthenticated:true});
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    await authStorage.deleteToken();
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const user = await authApi.me();
      await authStorage.saveUser(user);
      setState((s) => ({ ...s, user }));
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        await logout();
      }
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, refreshUser, acceptSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
