import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Calendar } from 'lucide-react';
import { useDateFormat, type DateFormat } from '../context/DateFormatContext';
import { parseAnyDate } from '../lib/utils';

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
  format?: DateFormat;
  ariaLabel?: string;
}

const REGEX_YYYY_MM_DD = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/;
const REGEX_SLASH_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
const REGEX_NON_DIGITS = /\D/g;

export function dateToDisplay(v?: string | null, format: DateFormat = 'dd/mm/yyyy'): string {
  if (!v) return '';
  const parsed = parseAnyDate(v);
  if (!parsed) return String(v);

  const dd = String(parsed.day).padStart(2, '0');
  const mm = String(parsed.month).padStart(2, '0');
  const yyyy = String(parsed.year);

  if (format === 'mm/dd/yyyy') return `${mm}/${dd}/${yyyy}`;
  if (format === 'yyyy-mm-dd') return `${yyyy}-${mm}-${dd}`;
  return `${dd}/${mm}/${yyyy}`;
}

export function displayToIso(displayStr: string, format: DateFormat = 'dd/mm/yyyy'): string | null {
  const clean = displayStr.trim();
  if (!clean) return null;

  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;

  if (format === 'yyyy-mm-dd') {
    const match = clean.match(REGEX_YYYY_MM_DD);
    if (match) {
      year = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      day = parseInt(match[3], 10);
    }
  } else if (format === 'mm/dd/yyyy') {
    const match = clean.match(REGEX_SLASH_DATE);
    if (match) {
      month = parseInt(match[1], 10);
      day = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    }
  } else {
    const match = clean.match(REGEX_SLASH_DATE);
    if (match) {
      day = parseInt(match[1], 10);
      month = parseInt(match[2], 10);
      year = parseInt(match[3], 10);
    }
  }

  if (day === null || month === null || year === null) {
    const parsed = parseAnyDate(clean);
    if (parsed) {
      day = parsed.day;
      month = parsed.month;
      year = parsed.year;
    } else {
      return null;
    }
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

function autoFormatDisplayDate(input: string, prev: string, format: DateFormat): string {
  if (input.length < prev.length) {
    return input;
  }

  if (format === 'yyyy-mm-dd') {
    const digits = input.replace(REGEX_NON_DIGITS, '').slice(0, 8);
    if (!digits) return '';
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  }

  if (input.includes('/')) {
    const parts = input.split('/');
    if (parts.length === 3 && parts[2].length === 4) {
      const p1 = parts[0].padStart(2, '0');
      const p2 = parts[1].padStart(2, '0');
      const y = parts[2];
      return `${p1}/${p2}/${y}`;
    }
  }

  const digits = input.replace(REGEX_NON_DIGITS, '').slice(0, 8);
  if (!digits) return '';

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

export const DateInput = memo<DateInputProps>(({
  value,
  onChange,
  className = '',
  placeholder,
  disabled = false,
  readOnly = false,
  required = false,
  id,
  name,
  format: propFormat,
  ariaLabel,
}) => {
  const { dateFormat: globalFormat } = useDateFormat();
  const activeFormat = propFormat || globalFormat || 'dd/mm/yyyy';

  const activePlaceholder = placeholder || activeFormat;

  const [displayText, setDisplayText] = useState<string>(() => dateToDisplay(value, activeFormat));
  const hiddenDateRef = useRef<HTMLInputElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    setDisplayText(dateToDisplay(value, activeFormat));
  }, [value, activeFormat]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = autoFormatDisplayDate(rawVal, displayText, activeFormat);
    setDisplayText(formatted);

    const iso = displayToIso(formatted, activeFormat);
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
      const iso = displayToIso(displayText, activeFormat);
      if (iso) {
        setDisplayText(dateToDisplay(iso, activeFormat));
        if (iso !== value) {
          isInternalChange.current = true;
          onChange?.(iso);
        }
      } else {
        setDisplayText(dateToDisplay(value, activeFormat));
      }
    } else {
      if (value) {
        isInternalChange.current = true;
        onChange?.('');
      }
    }
  };

  const handleCalendarClick = useCallback(() => {
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
  }, [disabled, readOnly]);

  const handleNativePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newIso = e.target.value;
    setDisplayText(dateToDisplay(newIso, activeFormat));
    isInternalChange.current = true;
    onChange?.(newIso);
  };

  return (
    <div className="relative inline-flex items-center w-full">
      <input
        type="text"
        id={id}
        name={name}
        aria-label={ariaLabel}
        value={displayText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        placeholder={activePlaceholder}
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
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint hover:text-accent focus:outline-none p-0.5 rounded transition-colors"
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
});

DateInput.displayName = 'DateInput';
