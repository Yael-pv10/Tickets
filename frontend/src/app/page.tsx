import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* Stage light overlay desde arriba */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] stage-light" />

      <section className="relative mx-auto max-w-7xl px-6 pb-32 pt-24 lg:px-10 lg:pt-32">
        {/* Eyebrow */}
        <div className="flex items-center gap-3">
          <span className="h-px w-12 bg-gold/60" />
          <span className="font-mono text-[11px] uppercase tracking-marquee text-gold">
            Temporada · Otoño · 2026
          </span>
        </div>

        {/* Headline */}
        <h1 className="mt-6 max-w-5xl font-display text-7xl font-medium leading-[0.95] tracking-tight sm:text-8xl lg:text-9xl">
          La función
          <br />
          <span className="italic text-gold-gradient">comienza</span>
          <br />
          al caer el telón.
        </h1>

        <p className="mt-10 max-w-xl text-base leading-relaxed text-cream-dim">
          Reserva tu butaca en las mejores salas y auditorios. Boletos
          digitales con código de seguridad, mapa de asientos en tiempo real
          y entrada sin filas.
        </p>

        <div className="mt-12 flex flex-wrap items-center gap-4">
          <Link
            href="/events"
            className="group relative inline-flex h-14 items-center gap-3 bg-gold px-10 font-mono text-xs uppercase tracking-marquee text-ink shadow-gold-glow transition-all hover:bg-gold-glow"
          >
            <span>Ver cartelera</span>
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex h-14 items-center px-4 font-mono text-xs uppercase tracking-marquee text-cream-dim hover:text-cream transition-colors"
          >
            Tengo cuenta →
          </Link>
        </div>

        {/* Marquee infinita sutil con principales features */}
        <div className="mt-24 border-y border-ink-300/40">
          <div className="grid grid-cols-1 divide-y divide-ink-300/40 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                num: '01',
                eyebrow: 'En vivo',
                title: 'Mapa interactivo',
                copy: 'Selecciona tus butacas en tiempo real. Bloqueo concurrente que evita doble venta.',
              },
              {
                num: '02',
                eyebrow: 'Seguro',
                title: 'QR firmado',
                copy: 'Cada boleto incluye una firma criptográfica HMAC. Imposible falsificar.',
              },
              {
                num: '03',
                eyebrow: 'Premium',
                title: 'Validación instantánea',
                copy: 'Acceso en la puerta con un escaneo. Atómico, audita cada entrada.',
              },
            ].map((f) => (
              <div key={f.num} className="px-6 py-8 sm:px-8">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-xs tracking-wider2 text-gold">{f.num}</span>
                  <span className="eyebrow">{f.eyebrow}</span>
                </div>
                <h3 className="mt-4 font-display text-2xl font-medium leading-tight text-cream">
                  {f.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-cream-dim">{f.copy}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Marca de agua tipográfica al fondo */}
        <div
          aria-hidden
          className="pointer-events-none mt-24 select-none text-center font-display text-[20vw] font-medium leading-none tracking-tight text-gold/[0.04]"
        >
          Teatro
        </div>
      </section>
    </main>
  );
}
