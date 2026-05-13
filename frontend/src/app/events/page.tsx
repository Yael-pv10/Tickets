'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { eventsApi, type EventDto } from '@/lib/api/events';

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.toLocaleDateString('es', { day: '2-digit' }),
    month: d.toLocaleDateString('es', { month: 'short' }).replace('.', '').toUpperCase(),
    weekday: d.toLocaleDateString('es', { weekday: 'long' }),
    time: d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
    year: d.toLocaleDateString('es', { year: 'numeric' }),
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    eventsApi
      .list()
      .then((page) => {
        if (!cancelled) setEvents(page.content);
      })
      .catch(() => {
        if (!cancelled) setError('No se pudieron cargar los eventos');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] stage-light" />

      <div className="relative mx-auto max-w-7xl px-6 pb-32 pt-20 lg:px-10">
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-gold/60" />
          <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
            Cartelera
          </span>
        </div>
        <h1 className="mt-6 max-w-3xl font-display text-6xl font-medium leading-[0.95] tracking-tight sm:text-7xl">
          Funciones <span className="italic text-gold-gradient">en cartel</span>
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-cream-dim">
          Explora la programación y reserva tu butaca. Los boletos se generan
          al instante con código de seguridad criptográfico.
        </p>

        {error && (
          <div className="mt-12 border border-curtain/40 bg-curtain/5 px-6 py-4 text-sm text-curtain">
            {error}
          </div>
        )}

        {events === null && !error && (
          <p className="mt-16 font-mono text-sm uppercase tracking-wider2 text-cream-mute">
            Cargando programación…
          </p>
        )}

        {events && events.length === 0 && (
          <div className="mt-16 border border-ink-300 bg-ink-100 px-8 py-20 text-center">
            <p className="font-mono text-xs uppercase tracking-marquee text-cream-mute">
              No hay funciones publicadas
            </p>
            <p className="mt-4 font-display text-2xl text-cream-dim">
              El telón aún no se levanta.
            </p>
          </div>
        )}

        {events && events.length > 0 && (
          <ul className="stagger mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, idx) => {
              const d = formatDate(event.startsAt);
              return (
                <li key={event.id}>
                  <Link
                    href={`/events/${event.id}`}
                    className="group block h-full overflow-hidden border border-ink-300/60 bg-ink-100 transition-all duration-300 hover:border-gold/50 hover:bg-ink-50"
                  >
                    {/* Encabezado tipo programa */}
                    <div className="flex items-start justify-between border-b border-ink-300/60 p-5">
                      <div>
                        <span className="font-mono text-[10px] uppercase tracking-marquee text-gold">
                          Función · {String(idx + 1).padStart(2, '0')}
                        </span>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                          {d.weekday}
                        </p>
                      </div>
                      <div className="text-right leading-none">
                        <p className="font-display text-3xl font-semibold text-gold">{d.day}</p>
                        <p className="mt-1 font-mono text-[10px] tracking-wider2 text-cream-dim">
                          {d.month}
                        </p>
                      </div>
                    </div>

                    {/* Título y venue */}
                    <div className="p-5">
                      <h2 className="font-display text-2xl font-medium leading-tight tracking-tight text-cream transition-colors group-hover:text-gold">
                        {event.title}
                      </h2>
                      <p className="mt-3 text-sm text-cream-dim">{event.venueName}</p>

                      <div className="mt-6 flex items-center justify-between border-t border-ink-300/60 pt-4">
                        <span className="font-mono text-xs tracking-wider2 text-cream-mute">
                          {d.time}
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-marquee text-gold transition-transform group-hover:translate-x-1">
                          Boletos →
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
