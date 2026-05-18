'use client';

import { useEffect, useRef, useState } from 'react';
import {
  adminApi,
  type VenueDto,
  type SectionDto,
  type Point,
  type SectionType,
} from '@/lib/api/admin';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';
const CORNER_LABELS = ['frente-izquierda', 'frente-derecha', 'fondo-derecha', 'fondo-izquierda'];

type DrawTarget = { kind: 'section'; sectionId: string } | { kind: 'stage' };

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}
function pts(p: Point[]) {
  return p.map((q) => `${q.x},${q.y}`).join(' ');
}
function centroid(p: Point[]): Point {
  return {
    x: p.reduce((a, q) => a + q.x, 0) / p.length,
    y: p.reduce((a, q) => a + q.y, 0) / p.length,
  };
}
function errMsg(e: unknown): string | undefined {
  return (e as { response?: { data?: { message?: string } } }).response?.data?.message;
}

/**
 * Editor del mapa del auditorio: traza secciones y el escenario sobre el
 * plano. Cada forma se define con 4 esquinas; para secciones con asientos
 * el sistema los rellena por interpolación.
 */
export default function VenueMapEditor({
  venue,
  onClose,
  onChange,
}: {
  venue: VenueDto;
  onClose: () => void;
  onChange: () => void;
}) {
  const [sections, setSections] = useState<SectionDto[]>(venue.sections);
  const [stage, setStage] = useState<Point[] | null>(venue.stageShape);
  const [canvas, setCanvas] = useState({ w: venue.canvasWidth, h: venue.canvasHeight });
  const [hasBg, setHasBg] = useState(false);

  const [draw, setDraw] = useState<DrawTarget | null>(null);
  const [draft, setDraft] = useState<Point[]>([]);
  const [finishType, setFinishType] = useState<SectionType>('SEATED');
  const [rows, setRows] = useState(8);
  const [seatsPerRow, setSeatsPerRow] = useState(12);
  const [gaCapacity, setGaCapacity] = useState(100);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const bgUrl = `${API_BASE}/venues/${venue.id}/background`;

  // Carga el plano para conocer su tamaño natural y ajustar el lienzo.
  useEffect(() => {
    const img = new Image();
    img.onload = async () => {
      setHasBg(true);
      if (img.naturalWidth !== venue.canvasWidth || img.naturalHeight !== venue.canvasHeight) {
        setCanvas({ w: img.naturalWidth, h: img.naturalHeight });
        try {
          await adminApi.updateCanvas(venue.id, {
            canvasWidth: img.naturalWidth,
            canvasHeight: img.naturalHeight,
            stageShape: venue.stageShape,
          });
        } catch {
          /* el lienzo se persiste igualmente al guardar el escenario */
        }
      }
    };
    img.onerror = () => setHasBg(false);
    img.src = bgUrl;
  }, [bgUrl, venue.id, venue.canvasWidth, venue.canvasHeight, venue.stageShape]);

  const selectedSection =
    draw?.kind === 'section' ? sections.find((s) => s.id === draw.sectionId) ?? null : null;

  function startDraw(target: DrawTarget) {
    setDraw(target);
    setDraft([]);
    setError(null);
    setInfo(null);
    if (target.kind === 'section') {
      const s = sections.find((x) => x.id === target.sectionId);
      setFinishType(s?.type ?? 'SEATED');
    }
  }

  function cancelDraw() {
    setDraw(null);
    setDraft([]);
  }

  function onCanvasClick(e: React.MouseEvent) {
    if (!draw || draft.length >= 4) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * canvas.w);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * canvas.h);
    setDraft((d) => [...d, { x: clamp(x, 0, canvas.w), y: clamp(y, 0, canvas.h) }]);
  }

  async function fillSeats() {
    if (!selectedSection || draft.length !== 4) return;
    setBusy(true);
    setError(null);
    try {
      const corners = draft;
      const seats = await adminApi.fillSection(selectedSection.id, { corners, rows, seatsPerRow });
      setSections((prev) =>
        prev.map((s) =>
          s.id === selectedSection.id
            ? { ...s, type: 'SEATED', shape: corners, capacity: null, seatCount: seats.length }
            : s
        )
      );
      cancelDraw();
      setInfo(`Sección "${selectedSection.name}": ${seats.length} asientos generados.`);
      onChange();
    } catch (e) {
      setError(errMsg(e) ?? 'No se pudo rellenar la sección');
    } finally {
      setBusy(false);
    }
  }

  async function saveGaZone() {
    if (!selectedSection || draft.length !== 4) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await adminApi.updateSectionShape(selectedSection.id, {
        type: 'GENERAL_ADMISSION',
        shape: draft,
        capacity: gaCapacity,
      });
      setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      cancelDraw();
      setInfo(`Zona "${updated.name}" guardada.`);
      onChange();
    } catch (e) {
      setError(errMsg(e) ?? 'No se pudo guardar la zona');
    } finally {
      setBusy(false);
    }
  }

  async function saveStage() {
    if (draft.length !== 4) return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateCanvas(venue.id, {
        canvasWidth: canvas.w,
        canvasHeight: canvas.h,
        stageShape: draft,
      });
      setStage(draft);
      cancelDraw();
      setInfo('Escenario guardado.');
      onChange();
    } catch (e) {
      setError(errMsg(e) ?? 'No se pudo guardar el escenario');
    } finally {
      setBusy(false);
    }
  }

  const u = canvas.w / 320; // unidad de escala para trazos y texto

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/95 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
              Editor de mapa
            </span>
            <h2 className="mt-1 font-display text-3xl font-medium tracking-tight text-cream">
              {venue.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute hover:text-cream"
          >
            × Cerrar
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Lienzo */}
          <div className="border border-ink-300 bg-ink-100">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${canvas.w} ${canvas.h}`}
              onClick={onCanvasClick}
              style={{ width: '100%', aspectRatio: `${canvas.w} / ${canvas.h}` }}
              className={draw ? 'cursor-crosshair' : 'cursor-default'}
            >
              {hasBg ? (
                <image href={bgUrl} x={0} y={0} width={canvas.w} height={canvas.h} />
              ) : (
                <rect x={0} y={0} width={canvas.w} height={canvas.h} fill="#16140f" />
              )}

              {stage && stage.length >= 3 && (
                <g>
                  <polygon points={pts(stage)} fill="#3a3631" stroke="#c9a24b" strokeWidth={u} />
                  <text
                    x={centroid(stage).x}
                    y={centroid(stage).y}
                    fill="#f3efe3"
                    fontSize={u * 6}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    ESCENARIO
                  </text>
                </g>
              )}

              {sections.map((s) => {
                if (!s.shape || s.shape.length < 3) return null;
                const c = centroid(s.shape);
                const ga = s.type === 'GENERAL_ADMISSION';
                return (
                  <g key={s.id}>
                    <polygon
                      points={pts(s.shape)}
                      fill={ga ? '#c9a24b' : '#5b8a72'}
                      fillOpacity={0.25}
                      stroke={ga ? '#c9a24b' : '#5b8a72'}
                      strokeWidth={u}
                    />
                    <text
                      x={c.x}
                      y={c.y}
                      fill="#f3efe3"
                      fontSize={u * 6}
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {s.name}
                    </text>
                  </g>
                );
              })}

              {draft.length > 0 && (
                <g>
                  {draft.length >= 2 && (
                    <polyline
                      points={pts(draft.length === 4 ? [...draft, draft[0]] : draft)}
                      fill="none"
                      stroke="#c9a24b"
                      strokeWidth={u}
                      strokeDasharray={`${u * 2} ${u * 2}`}
                    />
                  )}
                  {draft.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r={u * 2.5} fill="#c9a24b" />
                  ))}
                </g>
              )}
            </svg>
          </div>

          {/* Panel de control */}
          <div className="space-y-4">
            {!draw && (
              <div className="space-y-3">
                <p className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute">
                  Secciones
                </p>
                {sections.length === 0 && (
                  <p className="text-xs text-cream-mute">Crea secciones primero.</p>
                )}
                {sections.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-2 border border-ink-300 bg-ink-100 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-cream">{s.name}</p>
                      <p className="font-mono text-[9px] uppercase tracking-wider2 text-cream-mute">
                        {s.type === 'GENERAL_ADMISSION'
                          ? `Admisión general · cupo ${s.capacity ?? 0}`
                          : `${s.seatCount} asientos`}
                        {s.shape ? ' · trazada' : ' · sin trazar'}
                      </p>
                    </div>
                    <button
                      onClick={() => startDraw({ kind: 'section', sectionId: s.id })}
                      className="shrink-0 font-mono text-[10px] uppercase tracking-marquee text-gold hover:text-gold-glow"
                    >
                      Dibujar
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => startDraw({ kind: 'stage' })}
                  className="w-full border border-ink-300 bg-ink-100 px-3 py-2 text-left font-mono text-[10px] uppercase tracking-marquee text-gold hover:text-gold-glow"
                >
                  {stage ? 'Redibujar escenario' : 'Dibujar escenario'}
                </button>
              </div>
            )}

            {draw && (
              <div className="space-y-3 border border-gold/40 bg-ink-100 p-4">
                <p className="font-mono text-[10px] uppercase tracking-marquee text-gold">
                  {draw.kind === 'stage'
                    ? 'Trazando el escenario'
                    : `Trazando: ${selectedSection?.name ?? ''}`}
                </p>

                {draft.length < 4 && (
                  <p className="text-xs text-cream-dim">
                    Haz clic en la esquina{' '}
                    <strong className="text-gold">{CORNER_LABELS[draft.length]}</strong> ({draft.length}/4)
                  </p>
                )}

                {draft.length === 4 && draw.kind === 'stage' && (
                  <Button onClick={saveStage} loading={busy} className="w-full" size="sm">
                    Guardar escenario
                  </Button>
                )}

                {draft.length === 4 && draw.kind === 'section' && (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="font-mono text-[10px] uppercase tracking-wider2 text-cream-mute">
                        Tipo de sección
                      </span>
                      <select
                        value={finishType}
                        onChange={(e) => setFinishType(e.target.value as SectionType)}
                        className="mt-1 w-full border border-ink-300 bg-ink-50 px-3 py-2 text-sm text-cream"
                      >
                        <option value="SEATED">Con asientos numerados</option>
                        <option value="GENERAL_ADMISSION">Admisión general</option>
                      </select>
                    </label>

                    {finishType === 'SEATED' ? (
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Filas"
                          type="number"
                          min={1}
                          value={rows}
                          onChange={(e) => setRows(parseInt(e.target.value || '1', 10))}
                        />
                        <Input
                          label="Asientos/fila"
                          type="number"
                          min={1}
                          value={seatsPerRow}
                          onChange={(e) => setSeatsPerRow(parseInt(e.target.value || '1', 10))}
                        />
                        <div className="col-span-2">
                          <Button onClick={fillSeats} loading={busy} className="w-full" size="sm">
                            Rellenar {Math.max(0, rows * seatsPerRow)} asientos
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Input
                          label="Cupo de la zona"
                          type="number"
                          min={1}
                          value={gaCapacity}
                          onChange={(e) => setGaCapacity(parseInt(e.target.value || '1', 10))}
                        />
                        <Button onClick={saveGaZone} loading={busy} className="w-full" size="sm">
                          Guardar zona
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-1">
                  {draft.length > 0 && (
                    <button
                      onClick={() => setDraft((d) => d.slice(0, -1))}
                      className="font-mono text-[10px] uppercase tracking-marquee text-cream-mute hover:text-cream"
                    >
                      Deshacer punto
                    </button>
                  )}
                  <button
                    onClick={cancelDraw}
                    className="font-mono text-[10px] uppercase tracking-marquee text-curtain hover:text-curtain/80"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {info && <p className="text-xs text-sage">{info}</p>}
            {error && <p className="text-xs text-curtain">{error}</p>}
            {!hasBg && (
              <p className="text-xs text-cream-mute">
                Sin plano de fondo. Súbelo desde la tarjeta del auditorio para trazar con guía.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
