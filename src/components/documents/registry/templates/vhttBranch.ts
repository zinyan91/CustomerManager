export type VhttBranchType = 'CN' | 'PGD';

export function vhttBranchUnit(branchType?: VhttBranchType): string {
  return branchType ?? 'CN/PGD';
}
