'use client';

import { useEffect, useState } from 'react';
import { adminApi, type VenueDto, type SectionDto } from '@/lib/api/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function VenuesAdminPage() {
  const [venues, setVenues] = useState<VenueDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    adminApi.listVenues().then(setVenues).catch(() => setError('No se pudieron cargar los venues'));
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return (
    <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 lg:px-10">
      <div className="flex items-center gap-3">
        <span className="h-px w-12 bg-gold/60" />
        <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">Salas · 01</span>
      </div>
      <h1 className="mt-4 font-display text-5xl font-medium tracking-tight">Auditorios</h1>

      <NewVenueForm onCreated={refresh} />

      {error && <p className="mt-4 text-curtain">{error}</p>}

      <div className="mt-10 space-y-6">
        {venues.length === 0 && (
          <div className="border border-dashed border-ink-300 bg-ink-100 px-6 py-12 text-center">
            <p className="font-mono text-xs uppercase tracking-marquee text-cream-mute">
              Aún no hay auditorios
            </p>
          </div>
        )}
        {venues.map((v) => (
          <VenueCard key={v.id} venue={v} onChange={refresh} />
        ))}
      </div>
    </main>
  );
}

function NewVenueForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [capacity, setCapacity] = useState(100);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await adminApi.createVenue({ name, address, capacity });
      setName('');
      setAddress('');
      setCapacity(100);
      onCreated();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo crear el venue');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-10 border border-ink-300/60 bg-ink-100 p-6">
      <span className="eyebrow">Nuevo auditorio</span>
      <div className="mt-5 grid gap-5 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
        <Input
          label="Nombre"
          placeholder="Auditorio Nacional"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Dirección"
          placeholder="Av. Reforma 1"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <Input
          label="Capacidad"
          type="number"
          min={1}
          value={capacity}
          onChange={(e) => setCapacity(parseInt(e.target.value || '1', 10))}
          required
        />
        <Button type="submit" loading={submitting}>Crear</Button>
      </div>
      {error && <p className="mt-3 text-xs text-curtain">{error}</p>}
    </form>
  );
}

function VenueCard({ venue, onChange }: { venue: VenueDto; onChange: () => void }) {
  const [sectionName, setSectionName] = useState('');
  const [creating, setCreating] = useState(false);

  async function createSection() {
    if (!sectionName.trim()) return;
    setCreating(true);
    try {
      await adminApi.createSection(venue.id, sectionName);
      setSectionName('');
      onChange();
    } finally {
      setCreating(false);
    }
  }

  async function removeVenue() {
    if (!confirm(`¿Eliminar "${venue.name}" con todas sus secciones y butacas?`)) return;
    await adminApi.deleteVenue(venue.id);
    onChange();
  }

  return (
    <article className="border border-ink-300/60 bg-ink-100 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-medium tracking-tight text-cream">
            {venue.name}
          </h3>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-wider2 text-cream-mute">
            {venue.address || 'Sin dirección'} · {venue.capacity} butacas
          </p>
        </div>
        <button
          onClick={removeVenue}
          className="font-mono text-[10px] uppercase tracking-marquee text-curtain hover:text-curtain/80"
        >
          Eliminar →
        </button>
      </div>

      <div className="mt-6 flex gap-3">
        <Input
          placeholder="Nombre de la sección (ej. Platea)"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          className="flex-1"
        />
        <Button onClick={createSection} loading={creating} variant="secondary">+ Sección</Button>
      </div>

      <div className="mt-6 space-y-3">
        {venue.sections.map((s) => (
          <SectionRow key={s.id} section={s} onChange={onChange} />
        ))}
      </div>
    </article>
  );
}

function SectionRow({ section, onChange }: { section: SectionDto; onChange: () => void }) {
  const [showBulk, setShowBulk] = useState(false);
  const [rowLabel, setRowLabel] = useState('A');
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(10);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addRow() {
    setWorking(true);
    setError(null);
    try {
      await adminApi.bulkSeats(section.id, [{ rowLabel, fromNumber: from, toNumber: to }]);
      onChange();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo crear la fila');
    } finally {
      setWorking(false);
    }
  }

  async function removeSection() {
    if (!confirm(`¿Eliminar la sección "${section.name}"?`)) return;
    setError(null);
    try {
      await adminApi.deleteSection(section.id);
      onChange();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo eliminar la sección');
    }
  }

  return (
    <div className="border border-ink-300 bg-ink-50/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-display text-lg leading-tight text-cream">{section.name}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
            {section.seatCount} butacas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowBulk(!showBulk)}
            className="font-mono text-[10px] uppercase tracking-marquee text-gold hover:text-gold-glow"
          >
            {showBulk ? '× Cerrar' : '+ Cargar fila'}
          </button>
          <button
            onClick={removeSection}
            className="font-mono text-[10px] uppercase tracking-marquee text-curtain hover:text-curtain/80"
          >
            Eliminar
          </button>
        </div>
      </div>

      {showBulk && (
        <div className="mt-5 grid grid-cols-[auto_auto_auto_1fr] gap-3 sm:grid-cols-[80px_100px_100px_1fr] sm:items-end">
          <Input
            label="Fila"
            value={rowLabel}
            onChange={(e) => setRowLabel(e.target.value.toUpperCase())}
            maxLength={3}
            pattern="[A-Z]+"
            className="uppercase"
          />
          <Input
            label="Desde"
            type="number"
            min={1}
            value={from}
            onChange={(e) => setFrom(parseInt(e.target.value || '1', 10))}
          />
          <Input
            label="Hasta"
            type="number"
            min={1}
            value={to}
            onChange={(e) => setTo(parseInt(e.target.value || '1', 10))}
          />
          <Button onClick={addRow} loading={working} size="sm">
            Crear {Math.max(0, to - from + 1)}
          </Button>
          {error && <p className="col-span-4 text-xs text-curtain">{error}</p>}
        </div>
      )}
    </div>
  );
}
