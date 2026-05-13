import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const fieldBase =
  'w-full bg-transparent px-0 py-2.5 text-sm text-cream ' +
  'border-0 border-b border-ink-300 rounded-none ' +
  'placeholder:text-cream-mute/60 ' +
  'focus:border-gold focus:outline-none focus:ring-0 ' +
  'transition-colors duration-200';

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className, id, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={twMerge(fieldBase, error && 'border-curtain focus:border-curtain', className)}
        {...rest}
      />
      {hint && !error && <span className="text-xs text-cream-mute">{hint}</span>}
      {error && <span className="text-xs text-curtain">{error}</span>}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, id, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={twMerge(
          'min-h-[96px] w-full resize-none bg-ink-100 px-3 py-2.5 text-sm text-cream',
          'border border-ink-300 rounded-sm',
          'placeholder:text-cream-mute/60',
          'focus:border-gold focus:outline-none focus:ring-0 transition-colors',
          error && 'border-curtain focus:border-curtain',
          className
        )}
        {...rest}
      />
      {error && <span className="text-xs text-curtain">{error}</span>}
    </div>
  );
});

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, className, id, children, ...rest },
  ref
) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="eyebrow">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={id}
        className={twMerge(
          'w-full bg-ink-100 px-3 py-2.5 text-sm text-cream',
          'border border-ink-300 rounded-sm',
          'focus:border-gold focus:outline-none focus:ring-0 transition-colors',
          error && 'border-curtain',
          className
        )}
        {...rest}
      >
        {children}
      </select>
      {error && <span className="text-xs text-curtain">{error}</span>}
    </div>
  );
});
