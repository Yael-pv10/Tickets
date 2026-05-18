'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { eventsApi, type EventDto, type EventSeatDto } from '@/lib/api/events';
import { venuesApi, type Venue, type Point } from '@/lib/api/venues';
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
  const [venue, setVenue] = useState<Venue | null>(null);
  const [venueResolved, setVenueResolved] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    Promise.all([eventsApi.get(params.id), eventsApi.seats(params.id)])
      .then(([e, s]) => {
        setEvent(e);
        setSeats(s);
        venuesApi
          .get(e.venueId)
          .then(setVenue)
          .catch(() => setVenue(null))
          .finally(() => setVenueResolved(true));
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

  // Reserva en una sección de admisión general: toma N cupos disponibles.
  async function reserveGa(qty: number) {
    if (!event || !activeSection || !seats) return;
    if (!isAuth) {
      router.push(`/login?redirect=/events/${event.id}`);
      return;
    }
    const ids = seats
      .filter((s) => s.sectionName === activeSection && s.status === 'AVAILABLE')
      .slice(0, qty)
      .map((s) => s.id);
    if (ids.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const reservation = await reservationsApi.create(event.id, ids);
      router.push(`/checkout/${reservation.id}`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo crear la reserva');
      eventsApi.seats(event.id).then(setSeats).catch(() => {});
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
  if (!event || !seats || !venueResolved) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-24">
        <p className="text-cream-mute font-mono text-sm">Cargando función…</p>
      </main>
    );
  }

  const selectedSeats = seats.filter((s) => selected.has(s.id));
  const hasMap = !!venue && venue.sections.some((s) => s.shape && s.shape.length >= 3);
  const activeSectionSeats = activeSection
    ? seats.filter((s) => s.sectionName === activeSection)
    : [];
  const activeSectionMeta =
    activeSection && venue
      ? venue.sections.find((s) => s.name === activeSection) ?? null
      : null;
  const activeIsGa = activeSectionMeta?.type === 'GENERAL_ADMISSION';

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
                {hasMap && !activeSection ? 'Elige tu sección' : 'Selecciona tus butacas'}
              </h2>
            </div>
            {(!hasMap || activeSection) && (
              <div className="hidden flex-wrap items-center gap-4 sm:flex">
                <LegendDot color="bg-ink-100 border-sage/30" label="Disponible" />
                <LegendDot color="bg-gold border-gold" label="Tuyo" />
                <LegendDot color="bg-ember/10 border-ember/30" label="Reservado" />
                <LegendDot color="bg-ink-200 border-ink-300" label="Vendido" />
              </div>
            )}
          </div>

          {hasMap && !activeSection && (
            <div className="mt-10">
              <p className="mb-4 font-mono text-[11px] uppercase tracking-marquee text-cream-mute">
                Toca una sección para ver sus lugares
              </p>
              <VenueOverview venue={venue!} seats={seats} onPick={setActiveSection} />
            </div>
          )}

          {hasMap && activeSection && (
            <div className="mt-10">
              <button
                onClick={() => setActiveSection(null)}
                className="font-mono text-[11px] uppercase tracking-marquee text-gold hover:text-gold-glow"
              >
                ← Volver al mapa
              </button>
              <h3 className="mt-4 font-display text-2xl font-medium tracking-tight text-cream">
                {activeSection}
              </h3>
              {activeIsGa ? (
                <GaPanel
                  seats={activeSectionSeats}
                  submitting={submitting}
                  error={error}
                  onReserve={reserveGa}
                />
              ) : (
                <div className="mt-6">
                  <SectionMap
                    seats={activeSectionSeats}
                    selected={selected}
                    onToggle={toggleSeat}
                  />
                </div>
              )}
            </div>
          )}

          {!hasMap && (
            <>
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
            </>
          )}
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

function polyPoints(p: Point[]) {
  return p.map((q) => `${q.x},${q.y}`).join(' ');
}
function polyCentroid(p: Point[]): { x: number; y: number } {
  return {
    x: p.reduce((a, q) => a + q.x, 0) / p.length,
    y: p.reduce((a, q) => a + q.y, 0) / p.length,
  };
}

/**
 * Vista general del auditorio: dibuja las secciones como polígonos sobre
 * el plano. Las secciones con asientos son clicables y se colorean por
 * disponibilidad; las de admisión general se muestran como informativas.
 */
function VenueOverview({
  venue,
  seats,
  onPick,
}: {
  venue: Venue;
  seats: EventSeatDto[];
  onPick: (sectionName: string) => void;
}) {
  const [hasBg, setHasBg] = useState(false);
  const bgUrl = venuesApi.backgroundUrl(venue.id);
  const w = venue.canvasWidth;
  const h = venue.canvasHeight;
  const u = w / 320;

  useEffect(() => {
    const img = new Image();
    img.onload = () => setHasBg(true);
    img.onerror = () => setHasBg(false);
    img.src = bgUrl;
  }, [bgUrl]);

  return (
    <div className="border border-ink-300 bg-ink-100">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', aspectRatio: `${w} / ${h}` }}>
        {hasBg ? (
          <image href={bgUrl} x={0} y={0} width={w} height={h} />
        ) : (
          <rect x={0} y={0} width={w} height={h} fill="#16140f" />
        )}

        {venue.stageShape && venue.stageShape.length >= 3 && (
          <g>
            <polygon
              points={polyPoints(venue.stageShape)}
              fill="#3a3631"
              stroke="#c9a24b"
              strokeWidth={u}
            />
            <text
              x={polyCentroid(venue.stageShape).x}
              y={polyCentroid(venue.stageShape).y}
              fill="#f3efe3"
              fontSize={u * 6}
              textAnchor="middle"
              dominantBaseline="middle"
            >
              ESCENARIO
            </text>
          </g>
        )}

        {venue.sections.map((s) => {
          if (!s.shape || s.shape.length < 3) return null;
          const c = polyCentroid(s.shape);
          const ga = s.type === 'GENERAL_ADMISSION';
          const soldOut = !seats.some(
            (x) => x.sectionName === s.name && x.status === 'AVAILABLE'
          );
          const fill = soldOut ? '#2a2722' : ga ? '#c9a24b' : '#5b8a72';
          return (
            <g
              key={s.id}
              onClick={() => onPick(s.name)}
              className="cursor-pointer transition hover:opacity-80"
            >
              <polygon
                points={polyPoints(s.shape)}
                fill={fill}
                fillOpacity={soldOut ? 0.55 : 0.3}
                stroke={soldOut ? '#4a4640' : ga ? '#c9a24b' : '#5b8a72'}
                strokeWidth={u}
              />
              <text
                x={c.x}
                y={c.y - u * 2}
                fill="#f3efe3"
                fontSize={u * 6}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {s.name}
              </text>
              <text
                x={c.x}
                y={c.y + u * 6}
                fill={soldOut ? '#8c8676' : ga ? '#c9a24b' : '#9db8a8'}
                fontSize={u * 4}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {soldOut ? 'agotada' : ga ? 'general' : 'disponible'}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Compra en una sección de admisión general: se elige una cantidad. */
function GaPanel({
  seats,
  submitting,
  error,
  onReserve,
}: {
  seats: EventSeatDto[];
  submitting: boolean;
  error: string | null;
  onReserve: (qty: number) => void;
}) {
  const available = seats.filter((s) => s.status === 'AVAILABLE');
  const price = available[0]?.priceCents ?? seats[0]?.priceCents ?? 0;
  const max = Math.min(available.length, MAX_SEATS);
  const [qty, setQty] = useState(1);
  const effectiveQty = Math.max(1, Math.min(qty, max));

  if (seats.length === 0) {
    return (
      <p className="mt-6 text-sm text-cream-mute">
        Esta sección de admisión general no está habilitada para este evento.
      </p>
    );
  }

  return (
    <div className="mt-6 max-w-md border border-ink-300 bg-ink-100 p-6">
      <p className="font-mono text-[10px] uppercase tracking-marquee text-gold">
        Admisión general
      </p>
      <p className="mt-2 text-sm text-cream-dim">
        {available.length > 0 ? `${available.length} lugares disponibles` : 'Sección agotada'}
      </p>

      {available.length > 0 && (
        <>
          <div className="mt-5 flex items-end gap-5">
            <label className="block">
              <span className="eyebrow">Cantidad</span>
              <input
                type="number"
                min={1}
                max={max}
                value={qty}
                onChange={(e) =>
                  setQty(Math.max(1, Math.min(max, parseInt(e.target.value || '1', 10))))
                }
                className="mt-1 w-24 border border-ink-300 bg-ink-50 px-3 py-2 text-sm text-cream"
              />
            </label>
            <div>
              <span className="eyebrow">Total</span>
              <p className="mt-1 font-display text-3xl font-semibold leading-none text-gold-gradient">
                {formatPrice(price * effectiveQty)}
              </p>
            </div>
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
            {formatPrice(price)} c/u · máximo {MAX_SEATS} por compra
          </p>
          <Button
            className="mt-5 w-full"
            loading={submitting}
            onClick={() => onReserve(effectiveQty)}
          >
            Reservar {effectiveQty} →
          </Button>
        </>
      )}
      {error && <p className="mt-3 text-xs text-curtain">{error}</p>}
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
