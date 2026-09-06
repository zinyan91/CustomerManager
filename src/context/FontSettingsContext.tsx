import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  type FontSettings, loadFontSettings, saveFontSettings,
  applyFontSettings, DEFAULT_FONT_SETTINGS, normalizeFontSettings,
} from '../lib/fontSettings';

interface Value {
  fontSettings: FontSettings;
  updateFontSettings: (patch: Partial<FontSettings>) => void;
  resetFontSettings: () => void;
}

const Ctx = createContext<Value | null>(null);

export const FontSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSettings, setFontSettings] = useState<FontSettings>(() => loadFontSettings());

  useEffect(() => {
    applyFontSettings(fontSettings);
    saveFontSettings(fontSettings);
  }, [fontSettings]);

  const updateFontSettings = useCallback((patch: Partial<FontSettings>) => {
    setFontSettings(prev => normalizeFontSettings({ ...prev, ...patch }));
  }, []);

  const resetFontSettings = useCallback(() => {
    setFontSettings(DEFAULT_FONT_SETTINGS);
  }, []);

  const value = useMemo<Value>(() => ({
    fontSettings,
    updateFontSettings,
    resetFontSettings,
  }), [fontSettings, updateFontSettings, resetFontSettings]);

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
};

export function useFontSettings(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error('useFontSettings phải nằm trong FontSettingsProvider');
  return v;
}
