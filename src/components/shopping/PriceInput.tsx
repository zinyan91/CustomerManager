import React, { useState, useEffect, useRef } from 'react';
import { formatMoneyInput } from '../../lib/utils';

interface PriceInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
  placeholder?: string;
}

export const PriceInput: React.FC<PriceInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0',
}) => {
  const [text, setText] = useState<string>(() =>
    value ? formatMoneyInput(String(value)) : ''
  );
  const isFocused = useRef(false);

  // Sync external value when NOT focused
  useEffect(() => {
    if (!isFocused.current) {
      setText(value ? formatMoneyInput(String(value)) : '');
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Extract only digits
    const digits = raw.replace(/\D/g, '');

    if (!digits) {
      setText('');
      onChange(0);
      return;
    }

    const numVal = parseInt(digits, 10);
    if (isNaN(numVal) || numVal < 0) {
      setText('');
      onChange(0);
      return;
    }

    // Format digits with thousands separator
    const formatted = formatMoneyInput(digits);
    setText(formatted);
    onChange(numVal);
  };

  const handleBlur = () => {
    isFocused.current = false;
    const digits = text.replace(/\D/g, '');
    const numVal = digits ? parseInt(digits, 10) : 0;
    const finalVal = isNaN(numVal) || numVal < 0 ? 0 : numVal;
    setText(finalVal > 0 ? formatMoneyInput(String(finalVal)) : '');
    onChange(finalVal);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocused.current = true;
    e.target.select();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
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
