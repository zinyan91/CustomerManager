import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export type DateFormat = 'dd/mm/yyyy' | 'mm/dd/yyyy' | 'yyyy-mm-dd';

interface DateFormatContextType {
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
}

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

export const DateFormatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dateFormat, setDateFormatState] = useState<DateFormat>(() => {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('app_date_format') : null;
    if (saved === 'mm/dd/yyyy' || saved === 'yyyy-mm-dd' || saved === 'dd/mm/yyyy') {
      return saved as DateFormat;
    }
    return 'dd/mm/yyyy';
  });

  const setDateFormat = useCallback((format: DateFormat) => {
    setDateFormatState(format);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('app_date_format', format);
    }
  }, []);

  const value = useMemo<DateFormatContextType>(() => ({
    dateFormat,
    setDateFormat,
  }), [dateFormat, setDateFormat]);

  return (
    <DateFormatContext.Provider value={value}>
      {children}
    </DateFormatContext.Provider>
  );
};

export const useDateFormat = () => {
  const context = useContext(DateFormatContext);
  if (!context) {
    return {
      dateFormat: 'dd/mm/yyyy' as DateFormat,
      setDateFormat: () => {},
    };
  }
  return context;
};
