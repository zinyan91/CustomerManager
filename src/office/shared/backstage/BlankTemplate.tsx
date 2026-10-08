import React from 'react';

/** Ô "trống" của hàng mẫu trong màn Tệp. */
export const BlankTemplate: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button type="button" className="calc-template" onClick={onClick}>
    <span className="calc-template-thumb">{icon}</span>
    <span>{label}</span>
  </button>
);
