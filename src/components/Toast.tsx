import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastKind = 'success' | 'error';

export interface ToastMessage {
  type: ToastKind;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onDismiss: () => void;
  autoHideMs?: number;
}

export const Toast: React.FC<ToastProps> = ({ toast, onDismiss, autoHideMs = 4000 }) => {
  useEffect(() => {
    if (!toast || autoHideMs <= 0) return;
    const id = window.setTimeout(onDismiss, autoHideMs);
    return () => window.clearTimeout(id);
  }, [toast, autoHideMs, onDismiss]);

  if (!toast) return null;

  const isError = toast.type === 'error';
  const Icon = isError ? AlertCircle : CheckCircle;

  return (
    <div
      role="status"
      aria-live={isError ? 'assertive' : 'polite'}
      className={`fixed z-50 flex items-start gap-3 p-4 rounded-md border text-sm font-medium shadow-lg
        inset-x-3 top-[calc(var(--header-h)+0.75rem)]
        sm:inset-x-auto sm:right-6 sm:max-w-md ${
        isError ? 'bg-neg-soft border-neg text-neg' : 'bg-pos-soft border-pos text-pos'
      }`}
    >
      <Icon className="w-5 h-5 shrink-0 mt-px" aria-hidden="true" />
      <span className="flex-1">{toast.message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Đóng thông báo"
        className="shrink-0 opacity-60 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent rounded"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export function useToast() {
  const [toast, setToast] = React.useState<ToastMessage | null>(null);
  const show = React.useCallback((type: ToastKind, message: string) => {
    setToast({ type, message });
  }, []);
  const dismiss = React.useCallback(() => setToast(null), []);
  return { toast, show, dismiss };
}
