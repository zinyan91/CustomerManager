import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Btn, Popover } from '../../../shared/ribbon/controls';
import { sheetFocus } from './actions';

export interface MenuItem {
  label: string;
  run: () => void;
  disabled?: boolean;
  checked?: boolean;
}

/** Nút có chữ bên dưới biểu tượng, mở danh sách lựa chọn. */
export const MenuButton: React.FC<{ label: string; icon: React.ReactNode; items: MenuItem[] }> = ({ label, icon, items }) => (
  <Popover
    button={({ toggle }) => (
      <Btn title={label} className="has-text" onClick={toggle}>
        {icon}
        <span className="wr-btn-text">
          {label}
          <ChevronDown size={9} />
        </span>
      </Btn>
    )}
  >
    {(close) => (
      <div className="wr-menu">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className={`wr-menu-item${item.checked ? ' is-active' : ''}`}
            disabled={item.disabled}
            onClick={() => {
              close();
              item.run();
              sheetFocus();
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    )}
  </Popover>
);

/** Nút có chữ bên dưới biểu tượng. */
export const TextBtn: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void; active?: boolean; disabled?: boolean }> = ({
  label,
  icon,
  onClick,
  active,
  disabled,
}) => (
  <Btn title={label} className="has-text" active={active} disabled={disabled} onClick={onClick}>
    {icon}
    <span className="wr-btn-text">{label}</span>
  </Btn>
);

export const CheckOption: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; hideLabel?: boolean }> = ({
  label,
  checked,
  onChange,
  disabled,
  hideLabel,
}) => (
  <label className="wr-check">
    <input type="checkbox" checked={checked} disabled={disabled} aria-label={hideLabel ? label : undefined} onChange={(event) => onChange(event.target.checked)} />
    {!hideLabel && <span>{label}</span>}
  </label>
);
