import React, { forwardRef } from 'react';

export interface FieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  error?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Field: React.FC<FieldProps> = ({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  className = '',
  children,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[length:var(--fs-label)] font-bold uppercase tracking-wider text-ink-muted select-none"
        >
          {label}
          {required && <span className="text-neg ml-1">*</span>}
        </label>
      )}

      {children}

      {error ? (
        <p className="text-[11px] font-semibold text-neg animate-in fade-in duration-150 flex items-center gap-1">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-ink-faint font-normal">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError, className = '', ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full rounded-[var(--r-control)] px-3 py-2 text-xs font-semibold text-ink bg-surface/80 hover:bg-surface border transition-colors shadow-2xs placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed ${
          hasError ? 'border-neg focus:border-neg focus:ring-neg/30' : 'border-line/70'
        } ${className}`}
        {...rest}
      />
    );
  }
);
Input.displayName = 'Input';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ hasError, className = '', children, ...rest }, ref) => {
    return (
      <select
        ref={ref}
        className={`w-full rounded-[var(--r-control)] px-3 py-2 text-xs font-semibold text-ink bg-surface/80 hover:bg-surface border transition-colors shadow-2xs focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
          hasError ? 'border-neg focus:border-neg focus:ring-neg/30' : 'border-line/70'
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ hasError, className = '', ...rest }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-[var(--r-control)] px-3 py-2 text-xs font-semibold text-ink bg-surface/80 hover:bg-surface border transition-colors shadow-2xs placeholder:text-ink-faint focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed ${
          hasError ? 'border-neg focus:border-neg focus:ring-neg/30' : 'border-line/70'
        } ${className}`}
        {...rest}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
