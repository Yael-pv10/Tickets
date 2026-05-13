import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type Tone = 'gold' | 'sage' | 'curtain' | 'ember' | 'muted';

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  gold: 'border-gold/40 text-gold bg-gold/5',
  sage: 'border-sage/40 text-sage bg-sage/5',
  curtain: 'border-curtain/40 text-curtain bg-curtain/5',
  ember: 'border-ember/40 text-ember bg-ember/5',
  muted: 'border-ink-300 text-cream-mute bg-ink-100',
};

export function Badge({ tone = 'muted', className, children, ...rest }: Props) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1.5 border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider2',
        tones[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
