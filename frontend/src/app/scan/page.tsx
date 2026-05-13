'use client';

import { useEffect, useRef, useState } from 'react';
import { ticketsApi, type ValidationResult } from '@/lib/api/tickets';
import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

type Status = 'idle' | 'scanning' | 'validating' | 'result';

const SCAN_REGION_ID = 'qr-reader';

export default function ScanPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuth = useAuthStore((s) => s.isAuthenticated());

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    if (!isAuth) {
      router.replace('/login?redirect=/scan');
      return;
    }
    if (user && user.role !== 'STAFF' && user.role !== 'ADMIN') {
      setError('No tienes permiso para validar boletos');
    }
  }, [isAuth, user, router]);

  async function startScan() {
    setResult(null);
    setError(null);
    setStatus('scanning');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(SCAN_REGION_ID);
      scannerRef.current = { stop: async () => scanner.stop().catch(() => {}) };

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decoded) => {
          await scanner.stop().catch(() => {});
          setStatus('validating');
          try {
            const res = await ticketsApi.validate(decoded);
            setResult(res);
            setStatus('result');
          } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
            setError(msg ?? 'Error validando');
            setStatus('result');
          }
        },
        () => {}
      );
    } catch {
      setError('No se pudo acceder a la cámara');
      setStatus('idle');
    }
  }

  useEffect(() => {
    return () => {
      scannerRef.current?.stop();
    };
  }, []);

  function resetScan() {
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

        {/* Marco del visor */}
        <div className="mt-8">
          <div className="deco-frame relative">
            <span className="deco-corner-1" />
            <span className="deco-corner-2" />
            <div
              id={SCAN_REGION_ID}
              className="aspect-square w-full overflow-hidden bg-ink-200"
            />
            {/* Líneas de mira */}
            {status === 'scanning' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-px w-full bg-gold/30 animate-pulse" />
              </div>
            )}
          </div>

          {status === 'idle' && (
            <Button className="mt-6 w-full" onClick={startScan} size="lg">
              Iniciar cámara
            </Button>
          )}
          {status === 'scanning' && (
            <p className="mt-6 text-center font-mono text-xs uppercase tracking-marquee text-cream-dim animate-pulse">
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

        {banner && (
          <div className={`mt-8 border-2 p-6 ${banner.frame}`}>
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center text-xl ${banner.icon}`}>
                {banner.symbol}
              </span>
              <div>
                <p className={`font-display text-2xl font-semibold leading-none ${banner.title}`}>
                  {banner.label}
                </p>
                {result && (
                  <p className="mt-1 text-xs text-cream-dim">{result.message}</p>
                )}
              </div>
            </div>

            {result?.attendeeName && (
              <div className="mt-6 space-y-3 border-t border-ink-300/60 pt-5">
                <Row label="Asistente" value={result.attendeeName} />
                {result.seatCode && (
                  <Row
                    label="Butaca"
                    value={
                      <span className="font-mono text-lg font-bold text-gold">
                        {result.seatCode}
                      </span>
                    }
                  />
                )}
                {result.sectionName && <Row label="Sección" value={result.sectionName} />}
                {result.eventTitle && <Row label="Función" value={result.eventTitle} />}
              </div>
            )}

            <Button className="mt-6 w-full" variant="secondary" onClick={resetScan}>
              Escanear otro
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
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
        frame: 'border-sage/60 bg-sage/5',
        title: 'text-sage',
        icon: 'border border-sage text-sage rounded-full',
      };
    case 'ALREADY_USED':
      return {
        label: 'Ya usado',
        symbol: '⏱',
        frame: 'border-ember/60 bg-ember/5',
        title: 'text-ember',
        icon: 'border border-ember text-ember rounded-full',
      };
    case 'EXPIRED':
      return {
        label: 'Expirado',
        symbol: '⏱',
        frame: 'border-ember/60 bg-ember/5',
        title: 'text-ember',
        icon: 'border border-ember text-ember rounded-full',
      };
    case 'INVALID':
    default:
      return {
        label: 'Inválido',
        symbol: '✕',
        frame: 'border-curtain/60 bg-curtain/5',
        title: 'text-curtain',
        icon: 'border border-curtain text-curtain rounded-full',
      };
  }
}
