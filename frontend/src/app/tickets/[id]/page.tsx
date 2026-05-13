'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ticketsApi, type TicketDto } from '@/lib/api/tickets';
import { Button } from '@/components/ui/Button';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function shortCode(uuid: string) {
  return uuid.replace(/-/g, '').slice(0, 12).toUpperCase();
}

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    let revoke: string | null = null;
    ticketsApi.get(params.id).then(setTicket).catch(() => setError('No se pudo cargar el boleto'));
    ticketsApi
      .getQrBlobUrl(params.id)
      .then((url) => {
        revoke = url;
        setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [params.id]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <p className="text-curtain">{error}</p>
      </main>
    );
  }
  if (!ticket) {
    return (
      <main className="mx-auto max-w-xl px-6 py-24">
        <p className="font-mono text-sm text-cream-mute">Cargando boleto…</p>
      </main>
    );
  }

  const isUsed = ticket.status === 'USED';

  return (
    <main className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[300px] stage-light" />

      <div className="relative mx-auto max-w-3xl px-6 py-20">
        <div className="mb-8 text-center">
          <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
            Admit One · 01
          </span>
          <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-cream sm:text-5xl">
            Tu boleto
          </h1>
        </div>

        {/* Boleto físico */}
        <article
          className={`ticket-stub relative grid grid-cols-1 bg-ink-100 sm:grid-cols-[1fr_auto] ${
            isUsed ? 'opacity-75' : ''
          }`}
          style={{ boxShadow: '0 30px 80px -30px rgba(0,0,0,0.9)' }}
        >
          {/* Borde superior decorativo */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent" />

          {/* Lado izquierdo: información */}
          <div className="relative border-r border-dashed border-ink-300 p-8 sm:p-10">
            <div className="flex items-start justify-between">
              <div>
                <span className="eyebrow">{ticket.venueName}</span>
                <h2 className="mt-2 font-display text-3xl font-medium leading-tight tracking-tight text-cream sm:text-4xl">
                  {ticket.eventTitle}
                </h2>
              </div>
              {ticket.status === 'PAID' && (
                <div className="stamp text-sage">Pagado</div>
              )}
              {ticket.status === 'USED' && (
                <div className="stamp text-cream-mute">Usado</div>
              )}
              {ticket.status === 'CANCELLED' && (
                <div className="stamp text-curtain">Cancelado</div>
              )}
            </div>

            <div className="mt-8 grid grid-cols-3 gap-6">
              <div>
                <span className="eyebrow">Sección</span>
                <p className="mt-2 font-display text-lg text-cream">{ticket.sectionName}</p>
              </div>
              <div>
                <span className="eyebrow">Butaca</span>
                <p className="mt-2 font-mono text-3xl font-bold tracking-tight text-gold">
                  {ticket.seatCode}
                </p>
              </div>
              <div>
                <span className="eyebrow">Precio</span>
                <p className="mt-2 font-display text-lg text-cream">
                  ${(ticket.priceCents / 100).toFixed(2)}
                </p>
              </div>
            </div>

            <div className="mt-8 border-t border-dashed border-ink-300 pt-6">
              <span className="eyebrow">Función</span>
              <p className="mt-2 text-sm text-cream-dim">{formatDate(ticket.eventStartsAt)}</p>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <span className="eyebrow">Folio</span>
                <p className="mt-1 font-mono text-xs tracking-wider2 text-cream-mute">
                  #{shortCode(ticket.code)}
                </p>
              </div>
              {isUsed && ticket.usedAt && (
                <div className="text-right">
                  <span className="eyebrow">Ingresó</span>
                  <p className="mt-1 font-mono text-xs tracking-wider2 text-cream-mute">
                    {new Date(ticket.usedAt).toLocaleString('es')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lado derecho: QR */}
          <div className="relative flex flex-col items-center justify-center gap-3 bg-ink-50/40 p-8 sm:p-10">
            {ticket.status === 'PAID' && qrUrl ? (
              <>
                <div className="relative border border-gold/40 bg-cream p-3">
                  <div className="absolute -left-1 -top-1 h-3 w-3 border-l border-t border-gold" />
                  <div className="absolute -right-1 -top-1 h-3 w-3 border-r border-t border-gold" />
                  <div className="absolute -bottom-1 -left-1 h-3 w-3 border-b border-l border-gold" />
                  <div className="absolute -bottom-1 -right-1 h-3 w-3 border-b border-r border-gold" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="QR del boleto" className="h-44 w-44" />
                </div>
                <p className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
                  Escanea en la puerta
                </p>
              </>
            ) : (
              <div className="flex h-44 w-44 items-center justify-center border border-dashed border-ink-300 text-center">
                <p className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
                  Sin QR<br/>activo
                </p>
              </div>
            )}
          </div>
        </article>

        {/* Acción */}
        {ticket.status === 'PAID' && qrUrl && (
          <div className="mt-8 flex justify-center">
            <Button
              variant="secondary"
              onClick={() => {
                const a = document.createElement('a');
                a.href = qrUrl;
                a.download = `boleto-${ticket.seatCode}.png`;
                a.click();
              }}
            >
              Descargar QR
            </Button>
          </div>
        )}

        {ticket.status === 'USED' && (
          <p className="mt-8 text-center font-mono text-xs uppercase tracking-marquee text-cream-mute">
            Este boleto ya fue presentado
          </p>
        )}

        {/* Pie con instrucciones */}
        <div className="mt-12 text-center">
          <p className="text-xs leading-relaxed text-cream-mute">
            Presenta este boleto en formato digital o impreso en la entrada del recinto.
            <br />
            Llega con al menos 30 minutos de anticipación.
          </p>
        </div>
      </div>
    </main>
  );
}
