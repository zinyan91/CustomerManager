import React, { createContext, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ROUTE_OF } from '../lib/routes';

interface WorkContextValue {
  setActiveTab: (t: string) => void;
}

const WorkContext = createContext<WorkContextValue | null>(null);

export const WorkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const setActiveTab = useCallback((tab: string) => {
    const path = ROUTE_OF[tab as keyof typeof ROUTE_OF];
    if (path) navigate(path);
  }, [navigate]);

  return (
    <WorkContext.Provider value={{ setActiveTab }}>
      {children}
    </WorkContext.Provider>
  );
};

export function useWork(): WorkContextValue {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWork phải nằm trong WorkProvider');
  return ctx;
}
