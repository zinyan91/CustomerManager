import React, { createContext, useContext, useState, useCallback } from 'react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title?: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
}

type ConfirmFunction = (options: ConfirmOptions | string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFunction | null>(null);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    options: ConfirmOptions;
    resolve: (value: boolean) => void;
  } | null>(null);

  const confirm = useCallback<ConfirmFunction>((opts) => {
    const options: ConfirmOptions =
      typeof opts === 'string' ? { message: opts } : opts;

    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleConfirm = () => {
    dialogState?.resolve(true);
    setDialogState(null);
  };

  const handleCancel = () => {
    dialogState?.resolve(false);
    setDialogState(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState && (
        <ConfirmDialog
          open={dialogState.isOpen}
          title={dialogState.options.title}
          message={dialogState.options.message}
          confirmText={dialogState.options.confirmText}
          cancelText={dialogState.options.cancelText}
          tone={dialogState.options.tone}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export const useConfirm = (): ConfirmFunction => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback nếu gọi ngoài Provider (giúp test hoặc standalone an toàn)
    return async (opts) => {
      const msg = typeof opts === 'string' ? opts : opts.message;
      return window.confirm(typeof msg === 'string' ? msg : 'Xác nhận?');
    };
  }
  return ctx;
};
