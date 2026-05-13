interface Props {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  index?: number;
  align?: 'left' | 'center';
}

export function SectionHeader({ eyebrow, title, subtitle, index, align = 'left' }: Props) {
  const isCentered = align === 'center';
  return (
    <header className={isCentered ? 'mx-auto max-w-2xl text-center' : 'max-w-3xl'}>
      <div className={`flex items-center gap-3 ${isCentered ? 'justify-center' : ''}`}>
        {typeof index === 'number' && (
          <span className="font-mono text-[11px] tracking-wider2 text-gold">
            {String(index).padStart(2, '0')}
          </span>
        )}
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      </div>
      <h2 className="mt-3 font-display text-4xl font-medium leading-[1.05] tracking-tight text-cream sm:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className={`mt-3 max-w-2xl text-sm leading-relaxed text-cream-dim ${isCentered ? 'mx-auto' : ''}`}>
          {subtitle}
        </p>
      )}
    </header>
  );
}
