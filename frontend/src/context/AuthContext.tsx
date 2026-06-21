import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '../services/api';
import type { User, Account, AuthContextType } from '../types';
import toast from 'react-hot-toast';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [token, setToken] = useState<string | null>(localStorage.getItem('gb_token'));
  const [isLoading, setIsLoading] = useState(true);
  // Prevents redundant /auth/me call when login() or register() already set user state
  const skipNextRefreshRef = useRef(false);

  const refreshUser = useCallback(async () => {
    try {
      const res = await authAPI.getMe();
      setUser(res.data.user);
      setAccounts(res.data.accounts || []);
    } catch {
      setUser(null);
      setAccounts([]);
      localStorage.removeItem('gb_token');
      localStorage.removeItem('gb_refresh_token');
      setToken(null);
    }
  }, []);

  useEffect(() => {
    if (token) {
      if (skipNextRefreshRef.current) {
        skipNextRefreshRef.current = false;
        setIsLoading(false);
      } else {
        refreshUser().finally(() => setIsLoading(false));
      }
    } else {
      setIsLoading(false);
    }
  }, [token, refreshUser]);

  const login = async (identifier: string, password: string) => {
    const res = await authAPI.login({ email: identifier, password });
    const { access_token, refresh_token, user: userData, accounts: accs } = res.data;
    localStorage.setItem('gb_token', access_token);
    localStorage.setItem('gb_refresh_token', refresh_token);
    skipNextRefreshRef.current = true;
    setToken(access_token);
    setUser(userData);
    setAccounts(accs || []);
    return userData;
  };

  const register = async (data: object) => {
    const res = await authAPI.register(data);
    const { access_token, refresh_token, user: userData, account } = res.data;
    localStorage.setItem('gb_token', access_token);
    localStorage.setItem('gb_refresh_token', refresh_token);
    skipNextRefreshRef.current = true;
    setToken(access_token);
    setUser(userData);
    setAccounts(account ? [account] : []);
  };

  const logout = () => {
    localStorage.removeItem('gb_token');
    localStorage.removeItem('gb_refresh_token');
    setToken(null);
    setUser(null);
    setAccounts([]);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{ user, accounts, token, isLoading, login, logout, register, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
