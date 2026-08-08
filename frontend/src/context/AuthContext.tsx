// ============================================
// Auth Context & State Provider
// ============================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, loginApi, registerApi, getMeApi } from '../services/auth.service';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => void;
  updateUserStorage: (bytesAdded: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      getMeApi()
        .then((res) => {
          if (res.success && res.data) {
            setUser(res.data);
          }
        })
        .catch(() => {});
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const login = async (email: string, pass: string) => {
    const res = await loginApi(email, pass);
    if (res.success && res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
    } else {
      throw new Error(res.error?.message || 'Login failed');
    }
  };

  const register = async (payload: any) => {
    const res = await registerApi(payload);
    if (res.success && res.data) {
      setToken(res.data.accessToken);
      setUser(res.data.user);
    } else {
      throw new Error(res.error?.message || 'Registration failed');
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.clear();
  };

  const updateUserStorage = (bytesAdded: number) => {
    if (user) {
      const current = user.storageUsed || 0;
      setUser({ ...user, storageUsed: Math.max(0, current + bytesAdded) });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        updateUserStorage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
