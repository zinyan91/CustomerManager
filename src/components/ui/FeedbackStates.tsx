import React from 'react';
import { Loader2, Inbox, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface LoadingStateProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  text = 'Đang tải dữ liệu...',
  size = 'md',
  className = '',
}) => {
  const spinnerSize =
    size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-ink-faint space-y-3 animate-in fade-in duration-150 ${className}`}
    >
      <Loader2 className={`${spinnerSize} animate-spin text-accent`} />
      {text && (
        <span className="text-xs font-semibold tracking-tight text-ink-muted">
          {text}
        </span>
      )}
    </div>
  );
};

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center space-y-3.5 max-w-md mx-auto animate-in fade-in duration-150 ${className}`}
    >
      <div className="w-12 h-12 rounded-[var(--r-control)] bg-accent-soft/70 border border-accent/30 text-accent flex items-center justify-center shadow-xs shrink-0">
        <Icon className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm sm:text-base font-bold text-ink tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-xs text-ink-faint leading-relaxed font-normal">
            {description}
          </p>
        )}
      </div>

      {action && <div className="pt-1.5">{action}</div>}
    </div>
  );
};

export interface ErrorStateProps {
  title?: React.ReactNode;
  message: React.ReactNode;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã xảy ra lỗi',
  message,
  onRetry,
  retryText = 'Thử lại',
  className = '',
}) => {
  return (
    <div
      className={`rounded-[var(--r-panel)] border border-neg/30 bg-neg-soft/50 p-6 sm:p-8 text-center space-y-3.5 max-w-md mx-auto animate-in fade-in duration-150 ${className}`}
    >
      <div className="w-12 h-12 rounded-[var(--r-control)] bg-neg-soft border border-neg/40 text-neg flex items-center justify-center mx-auto shadow-xs shrink-0">
        <AlertTriangle className="w-6 h-6" />
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-bold text-neg tracking-tight">{title}</h3>
        <p className="text-xs text-ink-muted leading-relaxed">{message}</p>
      </div>

      {onRetry && (
        <div className="pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            {retryText}
          </Button>
        </div>
      )}
    </div>
  );
};
