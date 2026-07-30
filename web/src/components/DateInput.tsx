import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

export interface DateInputProps {
  value?: string | null;
  onChange?: (isoDate: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
}

export function isoToDisplay(isoStr?: string | null): string {
  if (!isoStr) return '';
  const clean = String(isoStr).trim().split('T')[0].split(' ')[0];
  if (!clean) return '';

  const matchIso = clean.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (matchIso) {
    const [, yyyy, mm, dd] = matchIso;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }

  const matchDisplay = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDisplay) {
    const [, dd, mm, yyyy] = matchDisplay;
    return `${dd.padStart(2, '0')}/${mm.padStart(2, '0')}/${yyyy}`;
  }

  return clean;
}

export function displayToIso(displayStr: string): string | null {
  const clean = displayStr.trim();
  let day: number, month: number, year: number;

  const match = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    day = parseInt(match[1], 10);
    month = parseInt(match[2], 10);
    year = parseInt(match[3], 10);
  } else {
    return null;
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2099) return null;

  const dateObj = new Date(year, month - 1, day);
  if (
    dateObj.getFullYear() !== year ||
    dateObj.getMonth() !== month - 1 ||
    dateObj.getDate() !== day
  ) {
    return null;
  }

  const mmStr = String(month).padStart(2, '0');
  const ddStr = String(day).padStart(2, '0');
  return `${year}-${mmStr}-${ddStr}`;
}

function autoFormatDisplayDate(input: string, prev: string): string {
  if (input.length < prev.length) {
    return input;
  }

  if (input.includes('/')) {
    const parts = input.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      const d = parts[0].padStart(2, '0');
      const m = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${d}/${m}/${y}`;
    }
  }

  const digits = input.replace(/\D/g, '').slice(0, 8);
  if (!digits) return '';

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export const DateInput: React.FC<DateInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = 'dd/mm/yyyy',
  disabled = false,
  readOnly = false,
  required = false,
  id,
  name,
}) => {
  const [displayText, setDisplayText] = useState<string>(() => isoToDisplay(value));
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setDisplayText(isoToDisplay(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = autoFormatDisplayDate(rawVal, displayText);
    setDisplayText(formatted);

    const iso = displayToIso(formatted);
    if (iso !== null) {
      isInternalChange.current = true;
      onChange?.(iso);
    } else if (formatted.trim() === '') {
      isInternalChange.current = true;
      onChange?.('');
    }
  };

  const handleBlur = () => {
    if (displayText.trim() !== '') {
      const iso = displayToIso(displayText);
      if (iso) {
        setDisplayText(isoToDisplay(iso));
        if (iso !== value) {
          isInternalChange.current = true;
          onChange?.(iso);
        }
      } else {
        setDisplayText(isoToDisplay(value));
      }
    } else {
      if (value) {
        isInternalChange.current = true;
        onChange?.('');
      }
    }
  };

  const handleCalendarClick = () => {
    if (disabled || readOnly) return;
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        try {
          hiddenDateRef.current.showPicker();
        } catch {
          hiddenDateRef.current.focus();
        }
      } else {
        hiddenDateRef.current.focus();
      }
    }
  };

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    setDisplayText(isoToDisplay(newIso));
    isInternalChange.current = true;
    onChange?.(newIso);
  };

  return (
    <div className="relative inline-flex items-center w-full">
      <input
        type="text"
        id={id}
        name={name}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={readOnly}
        required={required}
        className={`${className} ${!readOnly && !disabled ? 'pr-9' : ''}`}
      />
      {!readOnly && !disabled && (
        <button
          type="button"
          onClick={handleCalendarClick}
          tabIndex={-1}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-sky-500 focus:outline-none p-0.5 rounded transition-colors"
          title="Chọn ngày"
        >
          <Calendar className="w-4 h-4" />
        </button>
      )}
      <input
        ref={hiddenDateRef}
        type="date"
        value={value || ''}
        onChange={handleNativePickerChange}
        tabIndex={-1}
        className="sr-only absolute w-0 h-0 opacity-0 pointer-events-none"
      />
    </div>
  );
};
