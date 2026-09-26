import React from 'react';
import type { VhttBranchType } from '../registry/templates/vhttBranch';

interface VhttBranchInputProps {
  label: string;
  inputClassName: string;
  labelClassName: string;
  branchType?: VhttBranchType;
  branchName?: string;
  onChange: (p: { branchType?: VhttBranchType; branchName?: string }) => void;
}

export const VhttBranchInput: React.FC<VhttBranchInputProps> = ({
  label, inputClassName, labelClassName, branchType, branchName, onChange,
}) => (
  <div>
    <label className={labelClassName}>{label}</label>
    <div className="flex gap-2">
      <select
        className={inputClassName.replace('w-full', 'w-auto shrink-0')}
        aria-label="Loại đơn vị tiếp nhận"
        value={branchType ?? ''}
        onChange={e => onChange({ branchType: (e.target.value || undefined) as VhttBranchType | undefined })}
      >
        <option value="">CN/PGD</option>
        <option value="CN">CN</option>
        <option value="PGD">PGD</option>
      </select>
      <input
        className={inputClassName.replace('w-full', 'min-w-0 flex-1')}
        aria-label="Tên đơn vị tiếp nhận"
        placeholder={branchType === 'PGD' ? 'VD: An Phú' : 'VD: Sài Gòn'}
        value={branchName ?? ''}
        onChange={e => onChange({ branchName: e.target.value })}
      />
    </div>
  </div>
);
