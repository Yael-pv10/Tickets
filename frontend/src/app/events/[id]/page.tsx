'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { eventsApi, type EventDto, type EventSeatDto } from '@/lib/api/events';
import { reservationsApi } from '@/lib/api/reservations';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/auth-store';

const MAX_SEATS = 8;

// El backend guarda posX/posY en unidades abstractas de diseño.
// COORD_TO_PX las convierte a píxeles; SEAT_PX es el tamaño del asiento.
const COORD_TO_PX = 0.5;
const SEAT_PX = 42;

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function seatClasses(status: EventSeatDto['status'], selected: boolean) {
  if (selected)
    return 'bg-gold text-ink border-gold shadow-[0_0_18px_-2px_rgba(232,177,75,0.7)] scale-[1.08] z-10';
  switch (status) {
    case 'AVAILABLE':
      return 'bg-ink-100 text-cream-dim border-sage/30 hover:border-sage hover:text-cream hover:bg-sage/10 hover:scale-[1.06] cursor-pointer';
    case 'LOCKED':
      return 'bg-ember/10 text-ember border-ember/30 cursor-not-allowed opacity-60';
    case 'SOLD':
      return 'bg-ink-200 text-cream-mute/40 border-ink-300 cursor-not-allowed';
    case 'BLOCKED':
      return 'bg-curtain/10 text-curtain border-curtain/30 cursor-not-allowed';
  }
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isAuth = useAuthStore((s) => s.isAuthenticated());

  const [event, setEvent] = useState<EventDto | null>(null);
  const [seats, setSeats] = useState<EventSeatDto[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([eventsApi.get(params.id), eventsApi.seats(params.id)])
      .then(([e, s]) => {
        setEvent(e);
        setSeats(s);
      })
      .catch(() => setError('No se pudo cargar el evento'));
  }, [params.id]);

  const total = useMemo(() => {
    if (!seats) return 0;
    return seats.filter((s) => selected.has(s.id)).reduce((acc, s) => acc + s.priceCents, 0);
  }, [seats, selected]);

  const sectionNames = useMemo(
    () => (seats ? Array.from(new Set(seats.map((s) => s.sectionName))) : []),
    [seats]
  );

  function toggleSeat(seat: EventSeatDto) {
    if (seat.status !== 'AVAILABLE') return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(seat.id)) {
        next.delete(seat.id);
      } else {
        if (next.size >= MAX_SEATS) {
          setError(`Máximo ${MAX_SEATS} butacas por compra`);
          return next;
        }
        next.add(seat.id);
        setError(null);
      }
      return next;
    });
  }

  async function reserve() {
    if (!event || selected.size === 0) return;
    if (!isAuth) {
      router.push(`/login?redirect=/events/${event.id}`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const reservation = await reservationsApi.create(event.id, Array.from(selected));
      router.push(`/checkout/${reservation.id}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo crear la reserva');
      eventsApi.seats(event.id).then(setSeats).catch(() => {});
      setSelected(new Set());
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !event) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-curtain">{error}</p>
      </main>
    );
  }
  if (!event || !seats) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-cream-mute font-mono text-sm">Cargando función…</p>
      </main>
    );
  }

  const selectedSeats = seats.filter((s) => selected.has(s.id));

  return (
    <main className="relative pb-40">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[500px] stage-light" />

      <div className="relative mx-auto max-w-7xl px-6 pt-12 lg:px-10">
        {/* Cabecera del evento */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-gold/60" />
            <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
              {event.venueName}
            </span>
          </div>
          <h1 className="font-display text-5xl font-medium leading-[1.02] tracking-tight text-cream sm:text-6xl lg:text-7xl">
            {event.title}
          </h1>
          <p className="mt-2 font-mono text-xs uppercase tracking-wider2 text-cream-dim">
            {formatDate(event.startsAt)}
          </p>
        </div>

        {event.description && (
          <div
            className="mt-8 max-w-2xl text-base leading-relaxed text-cream-dim"
            dangerouslySetInnerHTML={{ __html: event.description }}
          />
        )}

        {/* Mapa de asientos */}
        <section className="mt-20">
          <div className="flex items-end justify-between">
            <div>
              <span className="eyebrow">Sala</span>
              <h2 className="mt-2 font-display text-3xl font-medium text-cream sm:text-4xl">
                Selecciona tus butacas
              </h2>
            </div>
            <div className="hidden flex-wrap items-center gap-4 sm:flex">
              <LegendDot color="bg-ink-100 border-sage/30" label="Disponible" />
              <LegendDot color="bg-gold border-gold" label="Tuyo" />
              <LegendDot color="bg-ember/10 border-ember/30" label="Reservado" />
              <LegendDot color="bg-ink-200 border-ink-300" label="Vendido" />
            </div>
          </div>

          {/* Escenario */}
          <div className="mt-12">
            <div className="relative mx-auto max-w-3xl">
              <div className="absolute inset-x-0 -top-24 h-24 stage-light" />
              <div className="relative flex flex-col items-center">
                <div className="h-1 w-full max-w-md rounded-full bg-gradient-to-r from-transparent via-gold/80 to-transparent animate-shimmer" />
                <div className="mt-2 h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
                <p className="mt-4 font-mono text-[10px] uppercase tracking-marquee text-gold">
                  · Escenario ·
                </p>
              </div>
            </div>
          </div>

          {/* Secciones */}
          <div className="mt-16 space-y-12">
            {sectionNames.map((section, sIdx) => {
              const sectionSeats = seats.filter((s) => s.sectionName === section);
              return (
                <section key={section}>
                  <div className="mb-5 flex items-center gap-4">
                    <span className="font-mono text-xs tracking-wider2 text-gold">
                      {String(sIdx + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display text-lg font-medium tracking-tight text-cream">
                      {section}
                    </h3>
                    <span className="flex-1 deco-rule" />
                    <span className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                      {sectionSeats.length} butacas
                    </span>
                  </div>
                  <SectionMap seats={sectionSeats} selected={selected} onToggle={toggleSeat} />
                </section>
              );
            })}
          </div>
        </section>
      </div>

      {/* Barra de selección flotante */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gold/30 bg-ink/95 backdrop-blur-md">
          <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-5 lg:px-10">
            <div className="flex items-center gap-5">
              <div>
                <span className="eyebrow">Selección</span>
                <p className="mt-1 font-display text-2xl font-medium leading-none text-cream">
                  {selectedSeats.map((s) => s.seatCode).join(' · ')}
                </p>
              </div>
              <div className="h-10 w-px bg-ink-300" />
              <div>
                <span className="eyebrow">Total</span>
                <p className="mt-1 font-display text-3xl font-semibold leading-none text-gold-gradient">
                  {formatPrice(total)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {error && (
                <Badge tone="curtain" className="hidden sm:inline-flex">
                  {error}
                </Badge>
              )}
              <Button onClick={reserve} loading={submitting} size="lg">
                Reservar →
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * Dibuja los asientos de una sección según sus coordenadas posX/posY.
 * El mapa se escala para caber en el ancho disponible (ResizeObserver),
 * así cualquier forma — rectangular, en herradura, curva — se ve completa.
 */
function SectionMap({
  seats,
  selected,
  onToggle,
}: {
  seats: EventSeatDto[];
  selected: Set<string>;
  onToggle: (seat: EventSeatDto) => void;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const box = useMemo(() => {
    const minX = seats.reduce((m, s) => Math.min(m, s.posX), Infinity);
    const minY = seats.reduce((m, s) => Math.min(m, s.posY), Infinity);
    const maxX = seats.reduce((m, s) => Math.max(m, s.posX), -Infinity);
    const maxY = seats.reduce((m, s) => Math.max(m, s.posY), -Infinity);
    return {
      minX,
      minY,
      width: (maxX - minX) * COORD_TO_PX + SEAT_PX,
      height: (maxY - minY) * COORD_TO_PX + SEAT_PX,
    };
  }, [seats]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / box.width));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [box.width]);

  if (seats.length === 0) return null;

  return (
    <div ref={wrapperRef} className="w-full">
      <div
        className="relative mx-auto"
        style={{ width: box.width * scale, height: box.height * scale }}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: box.width, height: box.height, transform: `scale(${scale})` }}
        >
          {seats.map((seat) => {
            const isSelected = selected.has(seat.id);
            return (
              <button
                key={seat.id}
                type="button"
                onClick={() => onToggle(seat)}
                disabled={seat.status !== 'AVAILABLE' && !isSelected}
                aria-pressed={isSelected}
                aria-label={`Butaca ${seat.seatCode}, ${seat.status}`}
                title={`${seat.seatCode} · ${formatPrice(seat.priceCents)}`}
                style={{
                  position: 'absolute',
                  left: (seat.posX - box.minX) * COORD_TO_PX,
                  top: (seat.posY - box.minY) * COORD_TO_PX,
                  width: SEAT_PX,
                  height: SEAT_PX,
                }}
                className={`seat-shape flex items-center justify-center border font-mono text-[10px] font-medium transition ${seatClasses(
                  seat.status,
                  isSelected
                )}`}
              >
                {seat.seatCode}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`seat-shape h-4 w-4 border ${color}`} />
      <span className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
        {label}
      </span>
    </div>
  );
}
