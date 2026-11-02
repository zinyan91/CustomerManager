import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarCollapseContextType {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
  isSecondaryCollapsed: boolean;
  setIsSecondaryCollapsed: (collapsed: boolean) => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextType>({
  isSidebarCollapsed: false,
  setIsSidebarCollapsed: () => {},
  toggleSidebar: () => {},
  isSecondaryCollapsed: false,
  setIsSecondaryCollapsed: () => {},
});

function readFlag(key: string, fallback: () => boolean): boolean {
  try {
    const saved = localStorage.getItem(key);
    return saved === null ? fallback() : saved === 'true';
  } catch {
    return false;
  }
}

function usePersistentFlag(key: string, fallback: () => boolean) {
  const [value, setValue] = useState<boolean>(() => readFlag(key, fallback));
  useEffect(() => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Ignore localStorage errors
    }
  }, [key, value]);
  return [value, setValue] as const;
}

export const SidebarCollapseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = usePersistentFlag('cm_sidebar_collapsed', () => window.innerWidth < 1200);
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = usePersistentFlag('cm_secondary_collapsed', () => false);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  return (
    <SidebarCollapseContext.Provider value={{ isSidebarCollapsed, setIsSidebarCollapsed, toggleSidebar, isSecondaryCollapsed, setIsSecondaryCollapsed }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
};

export function useSidebarCollapse(): SidebarCollapseContextType {
  return useContext(SidebarCollapseContext);
}
