'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@/lib/validation/auth';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/';
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await authApi.login(values);
      setAuth(res.accessToken, res.expiresInSeconds, res.user);
      router.replace(redirect);
    } catch {
      setError('Credenciales inválidas o cuenta bloqueada');
    }
  });

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  const googleLoginUrl = apiUrl.replace(/\/api$/, '') + '/oauth2/authorization/google';

  return (
    <>
      <form className="mt-10 space-y-7" onSubmit={onSubmit} noValidate>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          label="Correo"
          placeholder="tu@correo.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          label="Contraseña"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />
        {error && (
          <div role="alert" className="border border-curtain/40 bg-curtain/5 px-4 py-3 text-sm text-curtain">
            {error}
          </div>
        )}
        <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
          Entrar
        </Button>
      </form>

      <div className="mt-8 flex items-center gap-4">
        <span className="h-px flex-1 bg-ink-300" />
        <span className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">o</span>
        <span className="h-px flex-1 bg-ink-300" />
      </div>

      <a
        href={googleLoginUrl}
        className="mt-8 flex h-12 w-full items-center justify-center border border-ink-300 bg-ink-100 font-mono text-xs uppercase tracking-wider2 text-cream-dim transition-all hover:border-gold/40 hover:text-cream"
      >
        Continuar con Google
      </a>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="relative min-h-[calc(100vh-4rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] stage-light" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-16">
        {/* Marco deco */}
        <div className="deco-frame px-2 pb-10 pt-8 sm:px-6">
          <span className="deco-corner-1" />
          <span className="deco-corner-2" />

          <div className="text-center">
            <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
              Vestíbulo
            </span>
            <h1 className="mt-4 font-display text-5xl font-medium leading-none tracking-tight text-cream">
              Bienvenido
            </h1>
            <p className="mt-4 text-sm text-cream-dim">
              Tu localidad te espera del otro lado.
            </p>
          </div>

          <Suspense fallback={<p className="mt-10 font-mono text-sm text-cream-mute">Cargando…</p>}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-marquee text-cream-mute">
          ¿Sin cuenta?{' '}
          <a href="/register" className="text-gold hover:text-gold-glow transition-colors">
            Regístrate →
          </a>
        </p>
      </div>
    </main>
  );
}
