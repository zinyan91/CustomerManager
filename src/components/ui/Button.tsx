import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink hover:opacity-90 shadow-md shadow-accent/20 border border-accent active:scale-[0.99]',
  secondary:
    'border border-line/70 bg-surface/80 hover:bg-surface text-ink-muted hover:text-ink hover:border-line shadow-2xs active:scale-[0.99]',
  danger:
    'border border-neg/30 bg-neg-soft text-neg hover:bg-neg hover:text-surface shadow-2xs active:scale-[0.99]',
  ghost:
    'border border-transparent bg-transparent text-ink-muted hover:text-ink hover:bg-panel-muted/80 active:scale-[0.99]',
  outline:
    'border border-line/70 hover:border-accent text-ink hover:text-accent bg-transparent active:scale-[0.99]',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-[11px] gap-1.5',
  md: 'px-3.5 py-2 text-xs gap-2',
  lg: 'px-4.5 py-2.5 text-sm gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center font-bold tracking-tight rounded-[var(--r-control)] transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 ${
          VARIANT_CLASSES[variant]
        } ${SIZE_CLASSES[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        {...rest}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
