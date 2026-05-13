'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ticketsApi, type TicketDto } from '@/lib/api/tickets';
import { Badge } from '@/components/ui/Badge';

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('es', { day: '2-digit' }),
    month: d.toLocaleDateString('es', { month: 'short' }).replace('.', '').toUpperCase(),
    time: d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
  };
}

function statusTone(status: TicketDto['status']) {
  switch (status) {
    case 'PAID': return 'sage' as const;
    case 'USED': return 'muted' as const;
    case 'RESERVED': return 'ember' as const;
    case 'CANCELLED': return 'curtain' as const;
    case 'REFUNDED': return 'gold' as const;
  }
}

function statusLabel(status: TicketDto['status']) {
  switch (status) {
    case 'PAID': return 'Vigente';
    case 'USED': return 'Usado';
    case 'RESERVED': return 'Reservado';
    case 'CANCELLED': return 'Cancelado';
    case 'REFUNDED': return 'Reembolsado';
  }
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ticketsApi.listMine().then(setTickets).catch(() => setError('No se pudieron cargar tus boletos'));
  }, []);

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] stage-light" />

      <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-20">
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-gold/60" />
          <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
            Mi colección
          </span>
        </div>
        <h1 className="mt-6 font-display text-6xl font-medium leading-[0.95] tracking-tight text-cream">
          Mis <span className="italic text-gold-gradient">boletos</span>
        </h1>

        {error && <p className="mt-8 text-curtain">{error}</p>}
        {tickets === null && !error && (
          <p className="mt-12 font-mono text-sm uppercase tracking-wider2 text-cream-mute">
            Cargando…
          </p>
        )}

        {tickets && tickets.length === 0 && (
          <div className="mt-16 border border-ink-300 bg-ink-100 px-8 py-20 text-center">
            <p className="font-mono text-xs uppercase tracking-marquee text-cream-mute">
              Sin boletos aún
            </p>
            <p className="mt-4 font-display text-2xl text-cream-dim">
              El telón te espera.
            </p>
            <Link
              href="/events"
              className="mt-8 inline-flex h-11 items-center border border-gold/40 px-6 font-mono text-xs uppercase tracking-marquee text-gold hover:bg-gold hover:text-ink transition-colors"
            >
              Ver cartelera →
            </Link>
          </div>
        )}

        <ul className="stagger mt-12 space-y-4">
          {tickets?.map((t, idx) => {
            const d = formatDate(t.eventStartsAt);
            return (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 border border-ink-300/60 bg-ink-100 p-5 transition-all hover:border-gold/50 sm:gap-8 sm:p-6"
                >
                  {/* Fecha */}
                  <div className="text-center leading-none">
                    <p className="font-display text-4xl font-semibold text-gold">{d.day}</p>
                    <p className="mt-1 font-mono text-[10px] tracking-wider2 text-cream-dim">{d.month}</p>
                    <p className="mt-1 font-mono text-[10px] tracking-wider2 text-cream-mute">{d.time}</p>
                  </div>

                  {/* Separador */}
                  <div className="grid grid-cols-1 gap-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] tracking-wider2 text-gold-dim">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>
                    </div>
                    <h2 className="font-display text-xl font-medium tracking-tight text-cream group-hover:text-gold transition-colors">
                      {t.eventTitle}
                    </h2>
                    <p className="text-sm text-cream-dim">
                      {t.venueName} · <span className="font-mono text-gold-dim">{t.seatCode}</span>
                      <span className="text-cream-mute"> · {t.sectionName}</span>
                    </p>
                  </div>

                  <span className="font-mono text-[11px] uppercase tracking-marquee text-cream-mute group-hover:text-gold transition-all group-hover:translate-x-1">
                    Ver →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}
