import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export interface BtnProps {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** An icon button. `onMouseDown` keeps the editor's selection from being lost to the click. */
export const Btn: React.FC<BtnProps> = ({ title, onClick, active, disabled, children, className }) => (
  <button
    type="button"
    className={`wr-btn${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
    title={title}
    aria-label={title}
    aria-pressed={active === undefined ? undefined : active}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
  >
    {children}
  </button>
);

export interface LargeBtnProps {
  title: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
  hasDropdown?: boolean;
  className?: string;
}

export const LargeBtn: React.FC<LargeBtnProps> = ({
  title,
  onClick,
  active,
  disabled,
  children,
  label,
  hasDropdown,
  className,
}) => (
  <button
    type="button"
    className={`wr-large-btn calc-ribbon-btn-large${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
    title={title}
    aria-label={title}
    aria-pressed={active === undefined ? undefined : active}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    <span className="wr-large-btn-icon calc-ribbon-btn-large-icon">{children}</span>
    <span className="wr-large-btn-label calc-ribbon-btn-large-label">
      <span>{label}</span>
      {hasDropdown && <ChevronDown size={10} className="wr-large-btn-arrow" />}
    </span>
  </button>
);

export interface LargeSplitBtnProps {
  title: string;
  onAction: () => void;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
  className?: string;
}

export const LargeSplitBtn: React.FC<LargeSplitBtnProps> = ({
  title,
  onAction,
  onToggle,
  label,
  children,
  className,
}) => (
  <div className={`wr-large-split-btn${className ? ` ${className}` : ''}`} title={title}>
    <button
      type="button"
      className="wr-large-split-top"
      onClick={onAction}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      aria-label={title}
    >
      <span className="wr-large-btn-icon">{children}</span>
    </button>
    <button
      type="button"
      className="wr-large-split-bottom"
      onClick={onToggle}
      onMouseDown={(e) => e.preventDefault()}
      aria-label={label}
    >
      <span className="wr-large-btn-label">{label}</span>
      <ChevronDown size={10} className="wr-large-btn-arrow" />
    </button>
  </div>
);

export interface SubBtnProps {
  title?: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  label: string;
  hasDropdown?: boolean;
  className?: string;
}

export const SubBtn: React.FC<SubBtnProps> = ({
  title,
  onClick,
  active,
  disabled,
  icon,
  label,
  hasDropdown,
  className,
}) => (
  <button
    type="button"
    className={`wr-sub-btn calc-ribbon-sub-btn${active ? ' is-active' : ''}${className ? ` ${className}` : ''}`}
    title={title ?? label}
    aria-label={title ?? label}
    disabled={disabled}
    onMouseDown={(e) => e.preventDefault()}
    onClick={onClick}
  >
    {icon && <span className="wr-sub-btn-icon calc-sub-btn-icon">{icon}</span>}
    <span className="wr-sub-btn-label calc-sub-btn-label">{label}</span>
    {hasDropdown && <ChevronDown size={9} className="wr-sub-btn-arrow calc-sub-btn-arrow" />}
  </button>
);


export const ButtonCol: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`wr-btn-col${className ? ` ${className}` : ''}`}>{children}</div>
);

export const ButtonRow: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`wr-btn-row${className ? ` ${className}` : ''}`}>{children}</div>
);

export const Group: React.FC<{
  label: string;
  children: React.ReactNode;
  onDialog?: () => void;
  dialogTitle?: string;
}> = ({ label, children, onDialog, dialogTitle }) => (
  <div className="wr-group" role="group" aria-label={label}>
    <div className="wr-group-body">{children}</div>
    <div className="wr-group-label-row">
      <span className="wr-group-label">{label}</span>
      {onDialog && (
        <button
          type="button"
          className="wr-group-launcher"
          title={dialogTitle ?? label}
          aria-label={dialogTitle ?? label}
          onClick={onDialog}
          onMouseDown={(event) => event.preventDefault()}
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 8L8 2M4 2h4v4" />
          </svg>
        </button>
      )}
    </div>
  </div>
);

export const Divider: React.FC = () => <span className="wr-divider" aria-hidden="true" />;

/** A button that opens a panel under it; closes on an outside click or Escape. */
export const Popover: React.FC<{
  button: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'start' | 'end';
}> = ({ button, children, align = 'start' }) => {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const updatePosition = () => {
    if (!root.current) return;
    const rect = root.current.getBoundingClientRect();
    const style: React.CSSProperties = {
      position: 'fixed',
      top: rect.bottom + 2,
      zIndex: 9999,
    };
    if (align === 'end') {
      style.right = Math.max(8, window.innerWidth - rect.right);
      style.left = 'auto';
    } else {
      style.left = Math.max(8, rect.left);
      style.right = 'auto';
    }
    setPanelStyle(style);
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onScrollOrResize = () => {
      updatePosition();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [open, align]);

  return (
    <div className="wr-popover" ref={root}>
      {button({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={`wr-popover-panel align-${align}`}
          style={panelStyle}
          onMouseDown={(event) => event.preventDefault()}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

export const Swatches: React.FC<{
  colors: readonly string[];
  current: string | null;
  noneLabel: string;
  onPick: (color: string | null) => void;
}> = ({ colors, current, noneLabel, onPick }) => (
  <div className="wr-swatches">
    {colors.map((color) => (
      <button
        key={color}
        type="button"
        className={`wr-swatch${current?.toLowerCase() === color ? ' is-active' : ''}`}
        style={{ background: color }}
        title={color}
        aria-label={color}
        onClick={() => onPick(color)}
      />
    ))}
    <button type="button" className="wr-swatch-none" onClick={() => onPick(null)}>
      {noneLabel}
    </button>
  </div>
);

export const SelectBox: React.FC<{
  title: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  width?: number;
}> = ({ title, value, onChange, options, width }) => (
  <select
    className="wr-select"
    title={title}
    aria-label={title}
    value={value}
    style={width ? { width } : undefined}
    onChange={(event) => onChange(event.target.value)}
  >
    {options.map((option) => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </select>
);
