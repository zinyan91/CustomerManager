import React, { createContext, useContext, useState, useEffect } from 'react';

interface SidebarCollapseContextType {
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  toggleSidebar: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextType>({
  isSidebarCollapsed: false,
  setIsSidebarCollapsed: () => {},
  toggleSidebar: () => {},
});

export const SidebarCollapseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cm_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('cm_sidebar_collapsed', String(isSidebarCollapsed));
    } catch {
      // Ignore localStorage errors
    }
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => setIsSidebarCollapsed(prev => !prev);

  return (
    <SidebarCollapseContext.Provider value={{ isSidebarCollapsed, setIsSidebarCollapsed, toggleSidebar }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
};

export function useSidebarCollapse(): SidebarCollapseContextType {
  return useContext(SidebarCollapseContext);
}
