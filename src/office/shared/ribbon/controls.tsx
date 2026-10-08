import React, { useEffect, useRef, useState } from 'react';

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

export const Group: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="wr-group" role="group" aria-label={label}>
    <div className="wr-group-body">{children}</div>
    <div className="wr-group-label">{label}</div>
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

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="wr-popover" ref={root}>
      {button({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div className={`wr-popover-panel align-${align}`} onMouseDown={(event) => event.preventDefault()}>
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
