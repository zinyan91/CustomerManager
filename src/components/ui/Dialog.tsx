import React from 'react';
import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogPortal = RadixDialog.Portal;
export const DialogClose = RadixDialog.Close;

export type DialogVariant = 'center' | 'drawer';
export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

const SIZE_CLASSES: Record<DialogSize, string> = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  full: 'sm:max-w-[95vw]',
};

export interface DialogContentProps extends RadixDialog.DialogContentProps {
  variant?: DialogVariant;
  size?: DialogSize;
  hideCloseButton?: boolean;
}

export const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Overlay>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Overlay>
>(({ className = '', ...props }, ref) => (
  <RadixDialog.Overlay
    ref={ref}
    className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 ${className}`}
    {...props}
  />
));
DialogOverlay.displayName = RadixDialog.Overlay.displayName;

export const DialogContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  DialogContentProps
>(
  (
    {
      variant = 'center',
      size = 'lg',
      hideCloseButton = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDrawer = variant === 'drawer';

    return (
      <DialogPortal>
        <DialogOverlay />
        <RadixDialog.Content
          ref={ref}
          className={`fixed z-50 bg-panel/95 backdrop-blur-xl border border-line/80 shadow-2xl transition-all duration-200 outline-none flex flex-col font-app ${
            isDrawer
              ? 'inset-y-0 right-0 h-full w-full sm:max-w-2xl border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right'
              : `left-[50%] top-[50%] max-h-[90vh] w-full ${SIZE_CLASSES[size]} translate-x-[-50%] translate-y-[-50%] rounded-[var(--r-panel)] data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0`
          } ${className}`}
          {...props}
        >
          {children}

          {!hideCloseButton && (
            <RadixDialog.Close
              aria-label="Đóng"
              title="Đóng (Esc)"
              className="absolute right-4 top-4 rounded-[var(--r-control)] p-1.5 text-ink-faint hover:text-ink hover:bg-surface/80 transition-colors focus:outline-none focus:ring-2 focus:ring-accent cursor-pointer"
            >
              <X className="w-4 h-4" />
            </RadixDialog.Close>
          )}
        </RadixDialog.Content>
      </DialogPortal>
    );
  }
);
DialogContent.displayName = RadixDialog.Content.displayName;

export const DialogHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => (
  <div
    className={`p-4 sm:p-5 border-b border-line/60 flex flex-col space-y-1.5 text-left shrink-0 ${className}`}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

export const DialogFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  ...props
}) => (
  <div
    className={`p-4 sm:p-5 border-t border-line/60 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2.5 gap-2 shrink-0 bg-surface/30 ${className}`}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

export const DialogTitle = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className = '', ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={`text-[var(--fs-title)] font-bold text-ink tracking-tight ${className}`}
    {...props}
  />
));
DialogTitle.displayName = RadixDialog.Title.displayName;

export const DialogDescription = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className = '', ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={`text-[var(--fs-label)] text-ink-faint font-normal ${className}`}
    {...props}
  />
));
DialogDescription.displayName = RadixDialog.Description.displayName;
