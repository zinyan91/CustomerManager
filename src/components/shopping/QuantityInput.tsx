import React, { useState, useEffect, useRef } from 'react';

interface QuantityInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
}) => {
  const [text, setText] = useState<string>(() =>
    value !== undefined && value !== null && !isNaN(value) ? String(value) : '0'
  );
  const isFocused = useRef(false);

  // Sync external value when NOT focused
  useEffect(() => {
    if (!isFocused.current) {
      setText(value !== undefined && value !== null && !isNaN(value) ? String(value) : '0');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);

    if (raw.trim() === '') {
      onChange(0);
      return;
    }

    // Allow Vietnamese comma separator or dot: "1,5" -> "1.5"
    const normalized = raw.replace(',', '.');
    // Only accept numeric inputs (digits with optional single decimal point)
    if (/^\d*\.?\d*$/.test(normalized)) {
      const parsed = parseFloat(normalized);
      if (!isNaN(parsed) && parsed >= 0) {
        onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    const trimmed = text.trim();
    if (trimmed === '') {
      setText('0');
      onChange(0);
      return;
    }
    const normalized = trimmed.replace(',', '.');
    const parsed = parseFloat(normalized);
    const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setText(String(finalVal));
    onChange(finalVal);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const current = parseFloat(text.replace(',', '.')) || 0;
      const next = Math.round((current + 1) * 100) / 100;
      setText(String(next));
      onChange(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseFloat(text.replace(',', '.')) || 0;
      const next = Math.max(0, Math.round((current - 1) * 100) / 100);
      setText(String(next));
      onChange(next);
    } else if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
    />
  );
};
