import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'signal' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  // Live green — reserved for primary CTAs and active-call actions.
  primary:
    'bg-live text-midnight font-semibold hover:brightness-110 shadow-[0_0_20px_-6px_rgba(0,217,126,0.6)]',
  signal: 'bg-signal text-ink-1 font-semibold hover:bg-signal/90',
  ghost: 'bg-transparent text-ink-1 border border-border-2 hover:border-sky hover:text-sky',
  danger: 'bg-danger text-ink-1 font-semibold hover:brightness-110',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function Button({
  variant = 'signal',
  size = 'md',
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky/60',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
