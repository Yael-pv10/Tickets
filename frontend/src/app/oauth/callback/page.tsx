'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { authApi } from '@/lib/api/auth';

export default function OAuthCallback() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.substring(1)
      : window.location.hash;
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const expiresIn = parseInt(params.get('expires_in') || '900', 10);

    if (!accessToken) {
      router.replace('/login?error=oauth');
      return;
    }

    (async () => {
      try {
        setAuth(accessToken, expiresIn, { id: '', email: '', name: '', role: 'CLIENT' });
        const user = await authApi.me();
        setAuth(accessToken, expiresIn, user);
        router.replace('/');
      } catch {
        router.replace('/login?error=oauth');
      }
    })();
  }, [router, setAuth]);

  return (
    <main className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] stage-light" />
      <div className="relative text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
        <p className="mt-6 font-mono text-xs uppercase tracking-marquee text-cream-dim">
          · Entrando al teatro ·
        </p>
      </div>
    </main>
  );
}
