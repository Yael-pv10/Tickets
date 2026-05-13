'use client';

import { useEffect, useState } from 'react';
import { adminApi, type VenueDto } from '@/lib/api/admin';
import type { EventDto } from '@/lib/api/events';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

function statusTone(status: EventDto['status']) {
  switch (status) {
    case 'DRAFT': return 'muted' as const;
    case 'PUBLISHED': return 'sage' as const;
    case 'CANCELLED': return 'curtain' as const;
    case 'FINISHED': return 'gold' as const;
  }
}

export default function EventsAdminPage() {
  const [venues, setVenues] = useState<VenueDto[]>([]);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    Promise.all([adminApi.listVenues(), adminApi.listEvents()])
      .then(([v, e]) => {
        setVenues(v);
        setEvents(e);
      })
      .catch(() => setError('No se pudieron cargar los datos'));
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 lg:px-10">
      <div className="flex items-center gap-3">
        <span className="h-px w-12 bg-gold/60" />
        <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
          Programación · 02
        </span>
      </div>
      <h1 className="mt-4 font-display text-5xl font-medium tracking-tight">Funciones</h1>

      <NewEventForm venues={venues} onCreated={refresh} />

      {error && <p className="mt-4 text-curtain">{error}</p>}

      <div className="mt-10 space-y-3">
        {events.length === 0 && (
          <div className="border border-dashed border-ink-300 bg-ink-100 px-6 py-12 text-center">
            <p className="font-mono text-xs uppercase tracking-marquee text-cream-mute">
              Sin funciones todavía
            </p>
          </div>
        )}
        {events.map((e, idx) => (
          <EventRow key={e.id} event={e} idx={idx} onChange={refresh} />
        ))}
      </div>
    </main>
  );
}

function NewEventForm({ venues, onCreated }: { venues: VenueDto[]; onCreated: () => void }) {
  const [venueId, setVenueId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [price, setPrice] = useState(50000);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!venueId) return;
    setSubmitting(true);
    setError(null);
    try {
      const isoStart = new Date(startsAt).toISOString();
      await adminApi.createEvent({
        venueId,
        title,
        description,
        startsAt: isoStart,
        defaultPriceCents: price,
      });
      setTitle('');
      setDescription('');
      setStartsAt('');
      onCreated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo crear la función');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 border border-ink-300/60 bg-ink-100 p-6">
      <span className="eyebrow">Nueva función</span>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Select
          label="Auditorio"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          required
        >
          <option value="">— Selecciona —</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </Select>
        <Input
          label="Título"
          placeholder="Sinfonía de invierno"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <Input
          label="Fecha y hora"
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          required
        />
        <Input
          label="Precio por butaca (centavos)"
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(parseInt(e.target.value || '0', 10))}
          required
        />
        <div className="sm:col-span-2">
          <Textarea
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Una noche memorable…"
          />
        </div>
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" loading={submitting}>Crear función</Button>
        </div>
      </div>
      {error && <p className="mt-3 text-xs text-curtain">{error}</p>}
    </form>
  );
}

function EventRow({ event, idx, onChange }: { event: EventDto; idx: number; onChange: () => void }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(fn: () => Promise<unknown>) {
    setWorking(true);
    setError(null);
    try {
      await fn();
      onChange();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'Error');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="border border-ink-300/60 bg-ink-100 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tracking-wider2 text-gold">
            {String(idx + 1).padStart(2, '0')}
          </span>
          <div>
            <div className="flex items-center gap-3">
              <p className="font-display text-xl font-medium leading-none text-cream">
                {event.title}
              </p>
              <Badge tone={statusTone(event.status)}>{event.status}</Badge>
            </div>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wider2 text-cream-mute">
              {event.venueName} · {formatDate(event.startsAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {event.status === 'DRAFT' && (
            <Button size="sm" onClick={() => run(() => adminApi.publishEvent(event.id))} disabled={working}>
              Publicar
            </Button>
          )}
          {event.status === 'PUBLISHED' && (
            <Button size="sm" variant="secondary" onClick={() => run(() => adminApi.cancelEvent(event.id))} disabled={working}>
              Cancelar
            </Button>
          )}
          {event.status === 'DRAFT' && (
            <button
              onClick={() => confirm('¿Eliminar función?') && run(() => adminApi.deleteEvent(event.id))}
              disabled={working}
              className="font-mono text-[10px] uppercase tracking-marquee text-curtain hover:text-curtain/80"
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-curtain">{error}</p>}
    </div>
  );
}
