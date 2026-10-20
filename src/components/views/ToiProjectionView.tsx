import React from 'react';
import { ToiLoanCalcSection } from '../businessPlan/ToiLoanCalcSection';

export const ToiProjectionView: React.FC = () => {
  return (
    <div data-workspace-page className="space-y-0 w-full font-app animate-in fade-in duration-150">
      <ToiLoanCalcSection />
    </div>
  );
};
