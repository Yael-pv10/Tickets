import { ButtonHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  'group relative inline-flex items-center justify-center font-medium tracking-wide ' +
  'transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'focus-visible:outline-none overflow-hidden';

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-xs uppercase tracking-wider2',
  md: 'h-11 px-6 text-sm uppercase tracking-wider2',
  lg: 'h-14 px-10 text-sm uppercase tracking-wider2',
};

const variants: Record<Variant, string> = {
  primary:
    'bg-gold text-ink shadow-gold-glow hover:bg-gold-glow ' +
    'before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/25 before:via-transparent before:to-transparent before:opacity-0 before:transition-opacity hover:before:opacity-100',
  secondary:
    'border border-gold/40 text-cream bg-transparent hover:border-gold hover:bg-gold/5',
  ghost:
    'text-cream-dim hover:text-cream bg-transparent hover:bg-cream/5',
  danger:
    'border border-curtain/60 text-curtain hover:bg-curtain/10 hover:border-curtain bg-transparent',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={twMerge(base, sizes[size], variants[variant], className)}
      {...rest}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="font-mono normal-case tracking-normal">cargando</span>
        </span>
      ) : (
        <span className="relative">{children}</span>
      )}
    </button>
  );
});
