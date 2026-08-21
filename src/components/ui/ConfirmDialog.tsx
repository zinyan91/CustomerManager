import React from 'react';
import { AlertTriangle, HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './Dialog';
import { Button } from './Button';

export interface ConfirmDialogProps {
  open: boolean;
  title?: React.ReactNode;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Xác nhận hành động',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  tone = 'danger',
  onConfirm,
  onCancel,
}) => {
  const isDanger = tone === 'danger';

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent size="sm" hideCloseButton className="p-0 overflow-hidden">
        <DialogHeader className="p-5 flex-row items-start space-x-3.5 space-y-0 border-b-0 pb-2">
          <div
            className={`p-2.5 rounded-[var(--r-control)] shrink-0 ${
              isDanger
                ? 'bg-neg-soft text-neg border border-neg/20'
                : 'bg-accent-soft text-accent border border-accent/20'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <HelpCircle className="w-5 h-5" />
            )}
          </div>
          <div className="space-y-1 min-w-0">
            <DialogTitle className="text-sm font-bold text-ink">
              {title}
            </DialogTitle>
            <DialogDescription className="text-xs text-ink-muted leading-relaxed">
              {message}
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="p-4 bg-surface/50 border-t border-line/60 flex items-center justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? 'danger' : 'primary'}
            size="sm"
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
