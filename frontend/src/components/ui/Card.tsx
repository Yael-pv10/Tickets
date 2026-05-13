import { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

type Variant = 'default' | 'elevated' | 'ghost';

interface Props extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  default: 'bg-ink-100 border border-ink-300/60',
  elevated: 'bg-ink-100 border border-gold/15 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]',
  ghost: 'bg-transparent border border-ink-300',
};

export function Card({ variant = 'default', className, children, ...rest }: Props) {
  return (
    <div className={twMerge('relative', variants[variant], className)} {...rest}>
      {children}
    </div>
  );
}
