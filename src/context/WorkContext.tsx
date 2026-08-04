import React, { createContext, useContext, useState } from 'react';

interface DisburseRequest {
  creditContractId: number;
  customerId: number;
}

interface WorkContextValue {
  activeTab: string;
  setActiveTab: (t: string) => void;

  selectedCustomerId: number | null;
  setSelectedCustomerId: (id: number | null) => void;

  disburseRequest: DisburseRequest | null;
  requestDisburse: (req: DisburseRequest) => void;
  clearDisburseRequest: () => void;
}

const WorkContext = createContext<WorkContextValue | null>(null);

export const WorkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [disburseRequest, setDisburseRequest] = useState<DisburseRequest | null>(null);

  const requestDisburse = (req: DisburseRequest) => {
    setSelectedCustomerId(req.customerId);
    setDisburseRequest(req);
    setActiveTab('loans');
  };

  return (
    <WorkContext.Provider value={{
      activeTab, setActiveTab,
      selectedCustomerId, setSelectedCustomerId,
      disburseRequest, requestDisburse,
      clearDisburseRequest: () => setDisburseRequest(null),
    }}>
      {children}
    </WorkContext.Provider>
  );
};

export function useWork(): WorkContextValue {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWork phải nằm trong WorkProvider');
  return ctx;
}
