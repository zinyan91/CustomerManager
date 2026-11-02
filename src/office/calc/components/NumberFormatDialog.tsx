import React from 'react';
import type { CalcController } from '../controller';
import { FormatCellsDialog } from './formatCells/FormatCellsDialog';

export interface NumberFormatDialogProps {
  controller: CalcController;
  onClose: () => void;
}

/** Legacy wrapper around FormatCellsDialog opening at the Number tab. */
export const NumberFormatDialog: React.FC<NumberFormatDialogProps> = ({ controller, onClose }) => {
  return <FormatCellsDialog controller={controller} initialTab="number" onClose={onClose} />;
};

