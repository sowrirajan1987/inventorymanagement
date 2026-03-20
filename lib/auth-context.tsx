'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { fetchApi } from '@/lib/api';
import { usePathname, useRouter } from 'next/navigation';
import { DISABLE_AUTH } from '@/lib/config';

interface User {
  id: string;
  name: string;
  email: string;
  picture?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    if (DISABLE_AUTH) {
      setUser({ id: 'dev-user', name: 'Local Developer', email: 'dev@localhost', picture: '' });
      setLoading(false);
      if (pathname === '/login') {
        router.push('/');
      }
      return;
    }

    try {
      setLoading(true);
      const response = await fetchApi('/api/me');
      const data = await response.json();
      
      const userData = data.user || data;
      if (!userData || (!userData.id && !userData.email && !userData.name)) {
        throw new Error('Not authenticated');
      }
      
      setUser(userData);
      if (pathname === '/login') {
        router.push('/');
      }
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  const logout = useCallback(async () => {
    try {
      await fetchApi('/logout').catch(() => {});
    } catch (e) {
      // ignore
    }
    setUser(null);
    router.push('/login');
  }, [router]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, checkAuth, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

