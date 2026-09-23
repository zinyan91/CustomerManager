import type { ComponentType } from 'react';

export interface TreeNode {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string; size?: number }>;
  children?: TreeNode[];
  optional?: boolean;
  disabled?: boolean;
}

export function pathTo(nodes: TreeNode[], id: string): string[] {
  for (const n of nodes) {
    if (n.id === id) return [];
    if (n.children) {
      const sub = pathTo(n.children, id);
      if (sub.length > 0 || n.children.some(c => c.id === id)) return [n.id, ...sub];
    }
  }
  return [];
}
