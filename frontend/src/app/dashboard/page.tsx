'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

export default function DashboardHome() {
  const user = useAuthStore((s) => s.user);

  if (user && user.role !== 'ADMIN') {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-curtain">Solo administradores pueden acceder al panel.</p>
      </main>
    );
  }

  const sections = [
    {
      num: '01',
      eyebrow: 'Salas',
      href: '/dashboard/venues',
      title: 'Auditorios',
      copy: 'Crea recintos, secciones y carga butacas por rangos (A1–A20, B1–B20…).',
    },
    {
      num: '02',
      eyebrow: 'Programación',
      href: '/dashboard/events',
      title: 'Funciones',
      copy: 'Crea funciones, publícalas a la venta y gestiona cancelaciones.',
    },
    {
      num: '03',
      eyebrow: 'Equipo',
      href: '/dashboard/users',
      title: 'Usuarios',
      copy: 'Promueve usuarios a STAFF para validar entradas o a ADMIN para gestión.',
    },
  ];

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] stage-light" />

      <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-gold/60" />
          <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
            Tras bambalinas
          </span>
        </div>
        <h1 className="mt-6 max-w-3xl font-display text-6xl font-medium leading-[0.95] tracking-tight">
          Panel <span className="italic text-gold-gradient">administrativo</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-dim">
          Gestiona auditorios, programación y equipo. Todos los cambios se aplican
          en tiempo real al catálogo público.
        </p>

        <div className="stagger mt-16 grid gap-6 sm:grid-cols-3">
          {sections.map((s) => (
            <Link
              key={s.num}
              href={s.href}
              className="group block border border-ink-300/60 bg-ink-100 p-8 transition-all hover:border-gold/50 hover:bg-ink-50"
            >
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs tracking-wider2 text-gold">{s.num}</span>
                <span className="eyebrow">{s.eyebrow}</span>
              </div>
              <h2 className="mt-6 font-display text-3xl font-medium leading-tight tracking-tight text-cream group-hover:text-gold transition-colors">
                {s.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">{s.copy}</p>
              <p className="mt-8 font-mono text-[11px] uppercase tracking-marquee text-cream-mute group-hover:text-gold transition-all group-hover:translate-x-1">
                Entrar →
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
