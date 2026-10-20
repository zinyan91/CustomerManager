import React, { useState } from 'react';
import { PurchaseStatementTab } from '../inventory/PurchaseStatementTab';
import { Toast } from '../Toast';

export const PurchaseStatementView: React.FC = () => {
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  };

  return (
    <div data-workspace-page className="space-y-0 text-xs pb-6">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />
      <PurchaseStatementTab showNotify={showNotify} />
    </div>
  );
};
