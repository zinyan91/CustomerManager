import React, { useState } from 'react';
import { ChevronDown, ChevronRight, PanelLeftClose } from 'lucide-react';
import { pathTo, type TreeNode } from '../../lib/tree/treeNodes';

interface TreeRailProps {
  title: string;
  nodes: TreeNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  onCollapse: () => void;
  renderTrailing?: (node: TreeNode) => React.ReactNode;
  className?: string;
}

export const TreeRail: React.FC<TreeRailProps> = ({
  title, nodes, selectedId, onSelect, onCollapse, renderTrailing, className = '',
}) => {
  const [open, setOpen] = useState<Set<string>>(() => new Set(pathTo(nodes, selectedId)));
  const [lastSelected, setLastSelected] = useState(selectedId);
  if (lastSelected !== selectedId) {
    setLastSelected(selectedId);
    setOpen(prev => new Set([...prev, ...pathTo(nodes, selectedId)]));
  }
  const isOpen = (id: string) => open.has(id);
  const toggle = (id: string) => setOpen(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  const renderNodes = (list: TreeNode[], depth: number): React.ReactNode => (
    <ul className="space-y-0.5">
      {list.map(node => {
        const Icon = node.icon;
        if (node.children) {
          const expanded = isOpen(node.id);
          return (
            <li key={node.id}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => toggle(node.id)}
                style={{ paddingLeft: `${6 + depth * 10}px` }}
                className="w-full flex items-center gap-1.5 pr-2 py-1 text-xs font-semibold text-ink hover:bg-panel-muted/60 transition-colors text-left cursor-pointer"
              >
                {expanded
                  ? <ChevronDown size={13} className="text-ink-faint shrink-0" aria-hidden />
                  : <ChevronRight size={13} className="text-ink-faint shrink-0" aria-hidden />}
                {Icon && <Icon size={14} className="text-ink-muted shrink-0" />}
                <span className="truncate">{node.label}</span>
              </button>
              {expanded && renderNodes(node.children, depth + 1)}
            </li>
          );
        }
        const selected = node.id === selectedId;
        return (
          <li key={node.id} className="flex items-center">
            <button
              type="button"
              disabled={node.disabled}
              aria-current={selected ? 'true' : undefined}
              onClick={() => onSelect(node.id)}
              title={node.label}
              style={{ paddingLeft: `${6 + depth * 10}px` }}
              className={`flex-1 min-w-0 text-left pr-2 py-1 text-xs border-l-2 transition-colors truncate ${
                selected
                  ? 'border-accent bg-panel-muted font-bold text-ink'
                  : node.disabled
                  ? 'border-transparent text-ink-faint line-through opacity-50 cursor-not-allowed'
                  : 'border-transparent text-ink-muted hover:text-ink hover:bg-panel-muted/60 cursor-pointer'
              }`}
            >
              {node.label}
            </button>
            {renderTrailing?.(node)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <nav aria-label={title} className={`flex flex-col bg-panel text-ink ${className}`}>
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-line/60">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">{title}</span>
        <button
          type="button"
          onClick={onCollapse}
          aria-label={`Ẩn ${title}`}
          title={`Ẩn ${title}`}
          className="p-1 rounded text-ink-muted hover:text-ink hover:bg-panel-muted/60 cursor-pointer"
        >
          <PanelLeftClose size={15} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">{renderNodes(nodes, 0)}</div>
    </nav>
  );
};
