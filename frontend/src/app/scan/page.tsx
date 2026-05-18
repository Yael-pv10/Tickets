'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ticketsApi, type ValidationResult } from '@/lib/api/tickets';
import { staffApi, type TodayDashboard } from '@/lib/api/staff';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/Button';

type Status = 'idle' | 'scanning' | 'validating' | 'result';

const SCAN_REGION_ID = 'qr-reader';
const AUTO_RESCAN_MS = 2500;
const DASHBOARD_REFRESH_MS = 15000;

const HAPTIC_OK: number[] = [40];
const HAPTIC_DUP: number[] = [60, 80, 60];
const HAPTIC_FAIL: number[] = [120, 60, 120];

function vibrate(pattern: number[]) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern);
  }
}

export default function ScanPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated());

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<TodayDashboard | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const autoRescanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Evita validar el mismo QR varias veces: html5-qrcode dispara el callback
  // una vez por frame hasta que stop() resuelve (que es asíncrono).
  const handledRef = useRef(false);

  useEffect(() => {
    if (!isAuth) {
      router.replace('/login?redirect=/scan');
      return;
    }
    if (user && user.role !== 'STAFF' && user.role !== 'ADMIN') {
      setError('No tienes permiso para validar boletos');
    }
  }, [isAuth, user, router]);

  const loadDashboard = useCallback(() => {
    if (!isAuth || (user && user.role !== 'STAFF' && user.role !== 'ADMIN')) return;
    staffApi.today().then(setDashboard).catch(() => {});
  }, [isAuth, user]);

  useEffect(() => {
    loadDashboard();
    const id = setInterval(loadDashboard, DASHBOARD_REFRESH_MS);
    return () => clearInterval(id);
  }, [loadDashboard]);

  const startScan = useCallback(async () => {
    setResult(null);
    setError(null);
    setStatus('scanning');
    handledRef.current = false;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(SCAN_REGION_ID);
      scannerRef.current = { stop: async () => scanner.stop().catch(() => {}) };

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decoded) => {
          // Solo el primer frame decodificado cuenta; el resto se ignora.
          if (handledRef.current) return;
          handledRef.current = true;
          await scanner.stop().catch(() => {});
          setStatus('validating');
          try {
            const res = await ticketsApi.validate(decoded);
            setResult(res);
            setStatus('result');
            // feedback háptico + refresco optimista del panel
            if (res.status === 'OK') {
              vibrate(HAPTIC_OK);
              loadDashboard();
            } else if (res.status === 'ALREADY_USED') {
              vibrate(HAPTIC_DUP);
            } else {
              vibrate(HAPTIC_FAIL);
            }
          } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(msg ?? 'Error validando');
            setStatus('result');
            vibrate(HAPTIC_FAIL);
          }
        },
        () => {}
      );
    } catch {
      setError('No se pudo acceder a la cámara');
      setStatus('idle');
    }
  }, [loadDashboard]);

  // Auto-reanudar tras una validación OK (los rechazos exigen confirmación humana).
  useEffect(() => {
    if (status === 'result' && result?.status === 'OK') {
      autoRescanTimerRef.current = setTimeout(() => {
        startScan();
      }, AUTO_RESCAN_MS);
    }
    return () => {
      if (autoRescanTimerRef.current) {
        clearTimeout(autoRescanTimerRef.current);
        autoRescanTimerRef.current = null;
      }
    };
  }, [status, result, startScan]);

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
      if (autoRescanTimerRef.current) clearTimeout(autoRescanTimerRef.current);
    };
  }, []);

  function resetScan() {
    if (autoRescanTimerRef.current) {
      clearTimeout(autoRescanTimerRef.current);
      autoRescanTimerRef.current = null;
    }
    setResult(null);
    setError(null);
    setStatus('idle');
  }

  const banner = result && resultBanner(result);

  return (
    <main className="relative min-h-[calc(100vh-4rem)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] stage-light" />

      <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col px-4 py-8 sm:px-6">
        <header>
          <div className="flex items-center gap-3">
            <span className="h-px w-12 bg-gold/60" />
            <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
              Validación · Entrada
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-cream sm:text-4xl">
            Escanear boleto
          </h1>
          {user && (
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
              Acreditado: {user.name} · {user.role}
            </p>
          )}
        </header>

        {dashboard && <TodayPanel dashboard={dashboard} />}

        {/* Visor / banner */}
        <div className="mt-8">
          <div className="deco-frame relative">
            <span className="deco-corner-1" />
            <span className="deco-corner-2" />
            <div
              id={SCAN_REGION_ID}
              className={`aspect-square w-full overflow-hidden bg-ink-200 ${
                status === 'result' ? 'opacity-30' : ''
              }`}
            />

            {/* Overlay de mira durante escaneo */}
            {status === 'scanning' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-[60%] w-[60%]">
                  <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-gold" />
                  <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-gold" />
                  <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-gold" />
                  <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-gold" />
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 animate-pulse bg-gold/40" />
                </div>
              </div>
            )}

            {/* Overlay de banner sobre la cámara */}
            {banner && (
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className={`w-full border-2 ${banner.frame} bg-ink/95 px-6 py-6 backdrop-blur`}>
                  <div className="flex items-center gap-4">
                    <span
                      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 text-3xl ${banner.icon}`}
                    >
                      {banner.symbol}
                    </span>
                    <div className="min-w-0">
                      <p className={`font-display text-2xl font-semibold leading-none ${banner.title}`}>
                        {banner.label}
                      </p>
                      {result && (
                        <p className="mt-1 text-xs text-cream-dim">{result.message}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {status === 'idle' && (
            <Button className="mt-6 w-full" onClick={startScan} size="lg">
              Iniciar cámara
            </Button>
          )}
          {status === 'scanning' && (
            <p className="mt-6 text-center font-mono text-xs uppercase tracking-marquee text-cream-dim">
              · Buscando QR ·
            </p>
          )}
          {status === 'validating' && (
            <p className="mt-6 text-center font-mono text-xs uppercase tracking-marquee text-gold">
              · Verificando ·
            </p>
          )}
        </div>

        {error && (
          <div className="mt-6 border border-curtain/40 bg-curtain/5 px-4 py-3 text-sm text-curtain">
            {error}
          </div>
        )}

        {/* Detalle bajo el visor */}
        {result && (
          <div className="mt-6 border border-ink-300/60 bg-ink-100 p-5">
            {result.attendeeName && <Row label="Asistente" value={result.attendeeName} />}
            {result.seatCode && (
              <Row
                label="Butaca"
                value={
                  <span className="font-mono text-2xl font-bold text-gold tabular-nums">
                    {result.seatCode}
                  </span>
                }
              />
            )}
            {result.sectionName && <Row label="Sección" value={result.sectionName} />}
            {result.eventTitle && <Row label="Función" value={result.eventTitle} />}

            <div className="mt-5 flex flex-col gap-2">
              {result.status === 'OK' ? (
                <p className="text-center font-mono text-[10px] uppercase tracking-marquee text-sage">
                  Reanudando en {AUTO_RESCAN_MS / 1000}s · pulsa para escanear ahora
                </p>
              ) : (
                <p className="text-center font-mono text-[10px] uppercase tracking-marquee text-curtain">
                  Confirma antes de continuar
                </p>
              )}
              <Button className="w-full" onClick={() => { resetScan(); startScan(); }}>
                Escanear otro
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function TodayPanel({ dashboard }: { dashboard: TodayDashboard }) {
  return (
    <section className="mt-6">
      <div className="flex items-baseline justify-between border-b border-ink-300/40 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
          Hoy en cartelera
        </span>
        <span className="font-mono text-[10px] uppercase tracking-marquee text-gold">
          Tus validaciones · {dashboard.myValidationsToday}
        </span>
      </div>

      {dashboard.events.length === 0 ? (
        <p className="mt-4 font-display text-base italic text-cream-dim">
          Sin funciones programadas para hoy.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {dashboard.events.map((e) => {
            const pct = e.issuedCount > 0 ? Math.round((e.validatedCount / e.issuedCount) * 100) : 0;
            const time = new Date(e.startsAt).toLocaleTimeString('es', {
              hour: '2-digit',
              minute: '2-digit',
            });
            return (
              <li key={e.id} className="border border-ink-300/60 bg-ink-100/60 px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-medium leading-tight text-cream">
                      {e.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                      {e.venueName} · {time}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-2xl leading-none text-gold tabular-nums">
                      <span className="font-medium">{e.validatedCount}</span>
                      <span className="text-cream-mute"> / {e.issuedCount}</span>
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tracking-wider2 text-cream-mute">
                      {pct}% validados
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1 w-full overflow-hidden bg-ink-300/60">
                  <div
                    className="h-full bg-gradient-to-r from-gold-deep via-gold to-gold-glow transition-[width] duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-300/40 py-2 last:border-b-0">
      <span className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">{label}</span>
      <span className="text-right text-sm text-cream">{value}</span>
    </div>
  );
}

function resultBanner(r: ValidationResult) {
  switch (r.status) {
    case 'OK':
      return {
        label: 'Acceso permitido',
        symbol: '✓',
        frame: 'border-sage',
        title: 'text-sage',
        icon: 'border-sage text-sage',
      };
    case 'ALREADY_USED':
      return {
        label: 'Ya usado',
        symbol: '⏱',
        frame: 'border-ember',
        title: 'text-ember',
        icon: 'border-ember text-ember',
      };
    case 'EXPIRED':
      return {
        label: 'Expirado',
        symbol: '⏱',
        frame: 'border-ember',
        title: 'text-ember',
        icon: 'border-ember text-ember',
      };
    case 'INVALID':
    default:
      return {
        label: 'Inválido',
        symbol: '✕',
        frame: 'border-curtain',
        title: 'text-curtain',
        icon: 'border-curtain text-curtain',
      };
  }
}
