'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { reservationsApi, type Reservation } from '@/lib/api/reservations';
import { ticketsApi } from '@/lib/api/tickets';
import { Button } from '@/components/ui/Button';

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function useCountdown(target: string | undefined) {
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  useEffect(() => {
    if (!target) return;
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.floor(diff / 1000)));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');
  return { secondsLeft, label: `${mm}:${ss}`, mm, ss };
}

export default function CheckoutPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<'cancel' | 'pay' | null>(null);

  const { secondsLeft, mm, ss } = useCountdown(reservation?.expiresAt);

  useEffect(() => {
    if (!params.id) return;
    reservationsApi.get(params.id).then(setReservation).catch(() => setError('Reserva no encontrada'));
  }, [params.id]);

  useEffect(() => {
    if (secondsLeft === 0 && reservation?.status === 'PENDING') {
      reservationsApi.get(params.id).then(setReservation).catch(() => {});
    }
  }, [secondsLeft, reservation?.status, params.id]);

  async function cancel() {
    if (!reservation) return;
    setWorking('cancel');
    try {
      await reservationsApi.cancel(reservation.id);
      router.push(`/events/${reservation.eventId}`);
    } catch {
      setError('No se pudo cancelar');
    } finally {
      setWorking(null);
    }
  }

  async function pay() {
    if (!reservation) return;
    setWorking('pay');
    setError(null);
    try {
      const tickets = await ticketsApi.confirmReservation(reservation.id);
      if (tickets.length === 1) router.push(`/tickets/${tickets[0].id}`);
      else router.push('/my-tickets');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo procesar el pago');
    } finally {
      setWorking(null);
    }
  }

  if (error && !reservation) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="text-curtain">{error}</p>
      </main>
    );
  }
  if (!reservation) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <p className="font-mono text-sm text-cream-mute">Cargando reserva…</p>
      </main>
    );
  }

  const expired = reservation.status !== 'PENDING' || secondsLeft === 0;
  const urgent = secondsLeft < 60;

  return (
    <main className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] stage-light" />

      <div className="relative mx-auto max-w-3xl px-6 pb-24 pt-16">
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-gold/60" />
          <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
            Confirmar compra
          </span>
        </div>
        <h1 className="mt-6 font-display text-5xl font-medium leading-tight tracking-tight text-cream">
          {reservation.eventTitle}
        </h1>

        {/* Cuenta regresiva como display digital */}
        {!expired && (
          <div className="mt-12 grid grid-cols-1 items-center gap-6 border border-ink-300/60 bg-ink-100 p-6 sm:grid-cols-[1fr_auto] sm:p-8">
            <div>
              <span className="eyebrow">Tu butaca está apartada</span>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-cream-dim">
                Tienes tiempo limitado para completar el pago. Después, las butacas se
                liberan automáticamente para otros asistentes.
              </p>
            </div>
            <div className={`relative ${urgent ? 'animate-pulse-soft' : ''}`}>
              <div className="flex items-baseline gap-2 border border-gold/40 bg-ink-50 px-6 py-4">
                <span className={`font-mono text-5xl font-bold leading-none tabular-nums ${urgent ? 'text-curtain' : 'text-gold'}`}>
                  {mm}
                </span>
                <span className="text-2xl text-cream-mute">:</span>
                <span className={`font-mono text-5xl font-bold leading-none tabular-nums ${urgent ? 'text-curtain' : 'text-gold'}`}>
                  {ss}
                </span>
              </div>
              <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-ink-100 px-2 font-mono text-[9px] uppercase tracking-marquee text-cream-mute">
                Vence en
              </span>
            </div>
          </div>
        )}

        {expired && (
          <div className="mt-12 border border-curtain/40 bg-curtain/5 px-6 py-5">
            <p className="font-mono text-xs uppercase tracking-marquee text-curtain">
              Reserva expirada
            </p>
            <p className="mt-3 text-sm text-cream-dim">
              Las butacas ya fueron liberadas. Vuelve al evento y selecciónalas de nuevo.
            </p>
          </div>
        )}

        {/* Detalle */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Tu selección</span>
            <span className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
              {reservation.items.length} {reservation.items.length === 1 ? 'butaca' : 'butacas'}
            </span>
          </div>
          <ul className="mt-4 divide-y divide-ink-300/60 border border-ink-300/60 bg-ink-100">
            {reservation.items.map((item, idx) => (
              <li key={item.eventSeatId} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-4">
                  <span className="font-mono text-xs tracking-wider2 text-gold">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <p className="font-display text-2xl font-medium leading-none text-cream">
                      {item.seatCode}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                      {item.sectionName}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm tabular-nums text-cream">
                  {formatPrice(item.priceCents)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-ink-300/60 pt-6">
            <span className="font-mono text-xs uppercase tracking-marquee text-cream-mute">Total</span>
            <span className="font-display text-5xl font-semibold leading-none text-gold-gradient">
              {formatPrice(reservation.totalCents)}
            </span>
          </div>
        </section>

        {error && (
          <div className="mt-6 border border-curtain/40 bg-curtain/5 px-4 py-3 text-sm text-curtain">
            {error}
          </div>
        )}

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-end">
          {!expired && (
            <>
              <Button variant="ghost" onClick={cancel} loading={working === 'cancel'} disabled={working !== null}>
                Cancelar
              </Button>
              <Button size="lg" onClick={pay} loading={working === 'pay'} disabled={working !== null}>
                Pagar {formatPrice(reservation.totalCents)}
              </Button>
            </>
          )}
          {expired && (
            <Button onClick={() => router.push(`/events/${reservation.eventId}`)}>
              Volver al evento →
            </Button>
          )}
        </div>

        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
          Demo · pago simulado · en producción se conecta a Stripe/MercadoPago
        </p>
      </div>
    </main>
  );
}
