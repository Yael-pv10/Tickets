'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/api/auth';

const AUTH_MARKER = 'auth-present';
const AUTH_ROLE = 'auth-role';

type Role = 'ADMIN' | 'STAFF' | 'CLIENT';

function setMarker(present: boolean, role?: Role | null) {
  if (typeof document === 'undefined') return;
  if (present) {
    // Cookies no HttpOnly: solo para que el middleware sepa si hay sesión y de qué tipo.
    // La autorización real la hace el backend en cada petición.
    document.cookie = `${AUTH_MARKER}=1; Path=/; SameSite=Strict; max-age=${60 * 60 * 24 * 7}`;
    if (role) {
      document.cookie = `${AUTH_ROLE}=${role}; Path=/; SameSite=Strict; max-age=${60 * 60 * 24 * 7}`;
    }
  } else {
    document.cookie = `${AUTH_MARKER}=; Path=/; SameSite=Strict; max-age=0`;
    document.cookie = `${AUTH_ROLE}=; Path=/; SameSite=Strict; max-age=0`;
  }
}

export function useAuth() {
  const { accessToken, user, setAuth, clearAuth, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setMarker(isAuthenticated(), user?.role as Role | undefined);
  }, [accessToken, isAuthenticated, user]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearAuth();
      setMarker(false);
      router.replace('/login');
    }
  }, [clearAuth, router]);

  return {
    user,
    isAuthenticated: isAuthenticated(),
    setAuth,
    logout,
  };
}
