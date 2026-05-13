'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/api/auth';

const AUTH_MARKER = 'auth-present';

function setMarker(present: boolean) {
  if (typeof document === 'undefined') return;
  if (present) {
    // Cookie no HttpOnly, solo para que el middleware sepa que hay sesión.
    document.cookie = `${AUTH_MARKER}=1; Path=/; SameSite=Strict; max-age=${60 * 60 * 24 * 7}`;
  } else {
    document.cookie = `${AUTH_MARKER}=; Path=/; SameSite=Strict; max-age=0`;
  }
}

export function useAuth() {
  const { accessToken, user, setAuth, clearAuth, isAuthenticated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    setMarker(isAuthenticated());
  }, [accessToken, isAuthenticated]);

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
