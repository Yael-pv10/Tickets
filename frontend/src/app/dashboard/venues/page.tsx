'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { adminApi, type VenueDto, type SectionDto, type SeatDto } from '@/lib/api/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

// Editor de disposición: conversión de unidades de diseño a píxeles.
const EDIT_SCALE = 0.56;
const EDIT_SEAT_PX = 40;
const SNAP_UNITS = 25;

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

      <VenueBackground venueId={venue.id} />

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

/** Subida / vista / borrado de la imagen del plano del auditorio. */
function VenueBackground({ venueId }: { venueId: string }) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
  const [version, setVersion] = useState(0);
  const [hasImage, setHasImage] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.uploadBackground(venueId, file);
      setHasImage(true);
      setVersion((v) => v + 1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo subir el plano');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm('¿Quitar el plano del auditorio?')) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteBackground(venueId);
      setHasImage(false);
    } catch {
      setError('No se pudo quitar el plano');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border border-ink-300/60 bg-ink-50/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
            Plano del auditorio
          </p>
          <p className="mt-1 text-xs text-cream-dim">
            Imagen de guía para dibujar el mapa (PNG, JPEG o WebP).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer font-mono text-[10px] uppercase tracking-marquee text-gold hover:text-gold-glow">
            {busy ? 'Trabajando…' : 'Subir / reemplazar'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={upload}
              disabled={busy}
              className="hidden"
            />
          </label>
          {hasImage && (
            <button
              onClick={remove}
              disabled={busy}
              className="font-mono text-[10px] uppercase tracking-marquee text-curtain hover:text-curtain/80"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      {hasImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`${apiBase}/venues/${venueId}/background?v=${version}`}
          alt="Plano del auditorio"
          onError={() => setHasImage(false)}
          className="mt-3 max-h-40 rounded border border-ink-300"
        />
      )}
      {error && <p className="mt-2 text-xs text-curtain">{error}</p>}
    </div>
  );
}

function SectionRow({ section, onChange }: { section: SectionDto; onChange: () => void }) {
  const [showBulk, setShowBulk] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
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
            onClick={() => setShowEditor(!showEditor)}
            className="font-mono text-[10px] uppercase tracking-marquee text-gold hover:text-gold-glow"
          >
            {showEditor ? '× Cerrar' : 'Disposición'}
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

      {showEditor && <SeatLayoutEditor sectionId={section.id} />}
    </div>
  );
}

/**
 * Editor visual de disposición: muestra los asientos de una sección en un
 * lienzo y permite arrastrarlos para darle cualquier forma a la sala
 * (rectangular, en herradura, curva...). Guarda las coordenadas posX/posY.
 */
function SeatLayoutEditor({ sectionId }: { sectionId: string }) {
  const [seats, setSeats] = useState<SeatDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [snap, setSnap] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const dragRef = useRef<{ clientX: number; clientY: number; origX: number; origY: number } | null>(null);

  useEffect(() => {
    let active = true;
    adminApi
      .listSeats(sectionId)
      .then((s) => active && setSeats(s))
      .catch(() => active && setError('No se pudieron cargar los asientos'));
    return () => {
      active = false;
    };
  }, [sectionId]);

  const content = useMemo(() => {
    if (!seats || seats.length === 0) return { width: 0, height: 0 };
    const maxX = seats.reduce((m, s) => Math.max(m, s.posX), 0);
    const maxY = seats.reduce((m, s) => Math.max(m, s.posY), 0);
    return {
      width: maxX * EDIT_SCALE + EDIT_SEAT_PX + 24,
      height: maxY * EDIT_SCALE + EDIT_SEAT_PX + 24,
    };
  }, [seats]);

  function onPointerDown(e: React.PointerEvent, seat: SeatDto) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { clientX: e.clientX, clientY: e.clientY, origX: seat.posX, origY: seat.posY };
    setDragId(seat.id);
  }

  function onPointerMove(e: React.PointerEvent, id: string) {
    const d = dragRef.current;
    if (!d) return;
    const posX = Math.max(0, Math.round(d.origX + (e.clientX - d.clientX) / EDIT_SCALE));
    const posY = Math.max(0, Math.round(d.origY + (e.clientY - d.clientY) / EDIT_SCALE));
    setSeats((prev) => prev && prev.map((s) => (s.id === id ? { ...s, posX, posY } : s)));
    setDirty(true);
    setSaved(false);
  }

  function onPointerUp(id: string) {
    if (dragRef.current && snap) {
      setSeats((prev) =>
        prev &&
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                posX: Math.round(s.posX / SNAP_UNITS) * SNAP_UNITS,
                posY: Math.round(s.posY / SNAP_UNITS) * SNAP_UNITS,
              }
            : s
        )
      );
    }
    dragRef.current = null;
    setDragId(null);
  }

  async function save() {
    if (!seats) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await adminApi.updateLayout(
        sectionId,
        seats.map((s) => ({ seatId: s.id, posX: s.posX, posY: s.posY }))
      );
      setSeats(updated);
      setDirty(false);
      setSaved(true);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(msg ?? 'No se pudo guardar la disposición');
    } finally {
      setSaving(false);
    }
  }

  async function discard() {
    setSeats(null);
    setDirty(false);
    setSaved(false);
    setError(null);
    try {
      setSeats(await adminApi.listSeats(sectionId));
    } catch {
      setError('No se pudieron recargar los asientos');
    }
  }

  if (error && !seats) return <p className="mt-5 text-xs text-curtain">{error}</p>;
  if (!seats)
    return (
      <p className="mt-5 font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
        Cargando asientos…
      </p>
    );
  if (seats.length === 0)
    return (
      <p className="mt-5 text-xs text-cream-mute">
        Esta sección no tiene asientos. Crea filas con «+ Cargar fila» antes de editar la disposición.
      </p>
    );

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
          Arrastra los asientos para darle forma a la sala
        </p>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
            <input type="checkbox" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
            Ajustar a cuadrícula
          </label>
          <button
            onClick={discard}
            className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute hover:text-cream"
          >
            Descartar
          </button>
          <Button onClick={save} loading={saving} size="sm">
            Guardar
          </Button>
        </div>
      </div>

      {saved && <p className="mt-2 text-xs text-sage">Disposición guardada.</p>}
      {dirty && !saved && <p className="mt-2 text-xs text-gold">Cambios sin guardar.</p>}
      {error && <p className="mt-2 text-xs text-curtain">{error}</p>}

      <div className="mt-3 border border-ink-300 bg-ink/60">
        <div className="border-b border-ink-300/60 py-1 text-center font-mono text-[9px] uppercase tracking-marquee text-gold/60">
          · Escenario ·
        </div>
        <div className="max-h-[440px] overflow-auto">
          <div
            className="relative"
            style={{ width: content.width, height: content.height, minWidth: '100%' }}
          >
            {seats.map((seat) => (
              <div
                key={seat.id}
                onPointerDown={(e) => onPointerDown(e, seat)}
                onPointerMove={(e) => onPointerMove(e, seat.id)}
                onPointerUp={() => onPointerUp(seat.id)}
                title={seat.seatCode}
                style={{
                  position: 'absolute',
                  left: seat.posX * EDIT_SCALE,
                  top: seat.posY * EDIT_SCALE,
                  width: EDIT_SEAT_PX,
                  height: EDIT_SEAT_PX,
                  touchAction: 'none',
                }}
                className={`seat-shape flex select-none items-center justify-center border font-mono text-[10px] font-medium ${
                  dragId === seat.id
                    ? 'z-10 cursor-grabbing border-gold bg-gold text-ink'
                    : 'cursor-grab border-sage/40 bg-ink-100 text-cream-dim hover:border-sage'
                }`}
              >
                {seat.seatCode}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
