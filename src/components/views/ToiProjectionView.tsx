import React from 'react';
import { ToiLoanCalcSection } from '../businessPlan/ToiLoanCalcSection';

export const ToiProjectionView: React.FC = () => {
  return (
    <div className="space-y-4 w-full font-app animate-in fade-in duration-150">
      <ToiLoanCalcSection />
    </div>
  );
};
