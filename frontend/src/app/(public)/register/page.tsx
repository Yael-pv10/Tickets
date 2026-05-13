'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, type RegisterInput } from '@/lib/validation/auth';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await authApi.register(values);
      setAuth(res.accessToken, res.expiresInSeconds, res.user);
      router.replace('/');
    } catch {
      setError('No se pudo crear la cuenta. ¿El correo ya está registrado?');
    }
  });

  return (
    <main className="relative min-h-[calc(100vh-4rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] stage-light" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-6 py-16">
        <div className="deco-frame px-2 pb-10 pt-8 sm:px-6">
          <span className="deco-corner-1" />
          <span className="deco-corner-2" />

          <div className="text-center">
            <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
              Primera función
            </span>
            <h1 className="mt-4 font-display text-5xl font-medium leading-none tracking-tight text-cream">
              Crear cuenta
            </h1>
            <p className="mt-4 text-sm text-cream-dim">
              Únete al programa. Tendrás acceso a toda la cartelera.
            </p>
          </div>

          <form className="mt-10 space-y-7" onSubmit={onSubmit} noValidate>
            <Input
              id="name"
              type="text"
              autoComplete="name"
              label="Nombre"
              placeholder="Ada Lovelace"
              error={errors.name?.message}
              {...register('name')}
            />
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
              autoComplete="new-password"
              label="Contraseña"
              placeholder="••••••••"
              hint="Mínimo 8 caracteres con mayúscula, minúscula, número y símbolo."
              error={errors.password?.message}
              {...register('password')}
            />
            {error && (
              <div role="alert" className="border border-curtain/40 bg-curtain/5 px-4 py-3 text-sm text-curtain">
                {error}
              </div>
            )}
            <Button type="submit" loading={isSubmitting} className="w-full" size="lg">
              Crear cuenta
            </Button>
          </form>
        </div>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-marquee text-cream-mute">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-gold hover:text-gold-glow transition-colors">
            Entrar →
          </a>
        </p>
      </div>
    </main>
  );
}
