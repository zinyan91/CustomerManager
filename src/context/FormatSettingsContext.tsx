import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  loadFormatSettings, saveFormatSettings, DEFAULT_FORMAT_SETTINGS,
} from '../lib/formatSettings';
import type { FormatSettings } from '../lib/formatSettings';

interface FormatSettingsContextType {
  formatSettings: FormatSettings;
  updateFormatSettings: (patch: Partial<FormatSettings>) => void;
}

const FormatSettingsContext = createContext<FormatSettingsContextType | undefined>(undefined);

export const FormatSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [formatSettings, setFormatSettings] = useState<FormatSettings>(() => loadFormatSettings());

  const updateFormatSettings = useCallback((patch: Partial<FormatSettings>) => {
    setFormatSettings(saveFormatSettings(patch));
  }, []);

  const value = useMemo<FormatSettingsContextType>(() => ({
    formatSettings,
    updateFormatSettings,
  }), [formatSettings, updateFormatSettings]);

  return (
    <FormatSettingsContext.Provider value={value}>
      {children}
    </FormatSettingsContext.Provider>
  );
};

export const useFormatSettings = () => {
  const context = useContext(FormatSettingsContext);
  if (!context) {
    return {
      formatSettings: DEFAULT_FORMAT_SETTINGS,
      updateFormatSettings: () => {},
    };
  }
  return context;
};
