import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authApi } from '../api/auth';

interface AuthState {
  user: User | null;
  loading: boolean;
}

type AuthAction =
  | { type: 'SET_USER'; user: User | null }
  | { type: 'SET_LOADING'; loading: boolean };

function reducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SET_USER':    return { ...state, user: action.user, loading: false };
    case 'SET_LOADING': return { ...state, loading: action.loading };
  }
}

interface AuthContextValue extends AuthState {
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { user: null, loading: true });

  const refreshUser = useCallback(async () => {
    try {
      const { user } = await authApi.me();
      dispatch({ type: 'SET_USER', user });
    } catch {
      dispatch({ type: 'SET_USER', user: null });
    }
  }, []);

  const setUser = useCallback((user: User | null) => {
    dispatch({ type: 'SET_USER', user });
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignore */ }
    dispatch({ type: 'SET_USER', user: null });
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ ...state, refreshUser, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
