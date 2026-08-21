import React from 'react';

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  specular?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const PADDING_STYLES = {
  none: '',
  sm: 'p-3 sm:p-3.5',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
};

export const Panel: React.FC<PanelProps> = ({
  specular = true,
  padding = 'md',
  className = '',
  children,
  ...rest
}) => {
  const paddingClass = PADDING_STYLES[padding];
  const specularClass = specular ? 'specular-card' : '';

  return (
    <div
      className={`rounded-[var(--r-panel)] border border-line/70 bg-panel/85 backdrop-blur-xl shadow-xs transition-all ${specularClass} ${paddingClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

export interface PanelHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  bordered?: boolean;
  className?: string;
}

export const PanelHeader: React.FC<PanelHeaderProps> = ({
  title,
  subtitle,
  icon,
  actions,
  badge,
  bordered = false,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
        bordered ? 'pb-3.5 border-b border-line/60' : ''
      } ${className}`}
    >
      <div className="flex items-center space-x-3 text-ink">
        {icon && (
          <div className="p-2 rounded-[var(--r-control)] bg-accent-soft text-accent shadow-xs shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-[var(--fs-title)] font-bold text-ink tracking-tight truncate">
              {title}
            </h2>
            {badge && <span>{badge}</span>}
          </div>
          {subtitle && (
            <p className="text-[var(--fs-label)] text-ink-faint font-normal mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
};
