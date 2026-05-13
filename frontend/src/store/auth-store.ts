import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSummary } from '@/lib/api/auth';

interface AuthState {
  accessToken: string | null;
  expiresAt: number | null;
  user: UserSummary | null;
  setAuth: (accessToken: string, expiresInSeconds: number, user: UserSummary) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      expiresAt: null,
      user: null,
      setAuth: (accessToken, expiresInSeconds, user) =>
        set({
          accessToken,
          user,
          expiresAt: Date.now() + expiresInSeconds * 1000,
        }),
      clearAuth: () => set({ accessToken: null, expiresAt: null, user: null }),
      isAuthenticated: () => {
        const { accessToken, expiresAt } = get();
        return !!accessToken && !!expiresAt && expiresAt > Date.now();
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        expiresAt: state.expiresAt,
        user: state.user,
      }),
    }
  )
);
