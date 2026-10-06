import { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Search,
  FolderPlus,
  Files,
} from 'lucide-react';
import type { FolderTreeNode } from '../../types/huggingface';

interface FolderTreeViewProps {
  rootNode: FolderTreeNode;
  selectedPath: string;
  onSelectPath: (path: string) => void;
  onCreateFolder?: (parentPath: string, folderName: string) => void;
}

export function FolderTreeView({
  rootNode,
  selectedPath,
  onSelectPath,
  onCreateFolder,
}: FolderTreeViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set(['']));
  const [searchQuery, setSearchQuery] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !onCreateFolder) return;
    onCreateFolder(selectedPath, newFolderName.trim());
    setNewFolderName('');
    setIsCreatingFolder(false);
    setExpandedPaths((prev) => new Set(prev).add(selectedPath));
  };

  // Lọc cây thư mục theo ô tìm kiếm
  const filteredRoot = useMemo(() => {
    if (!searchQuery.trim()) return rootNode;

    const q = searchQuery.toLowerCase().trim();
    function filterNode(node: FolderTreeNode): FolderTreeNode | null {
      const isMatch = node.name.toLowerCase().includes(q);
      const filteredChildren = node.children
        .map(filterNode)
        .filter((c): c is FolderTreeNode => c !== null);

      if (isMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    }

    return filterNode(rootNode) || rootNode;
  }, [rootNode, searchQuery]);

  const renderNode = (node: FolderTreeNode, level: number = 0) => {
    const isRoot = node.id === '';
    const isSelected = selectedPath === node.path;
    const isExpanded = expandedPaths.has(node.path) || searchQuery.trim().length > 0;
    const hasChildren = node.children.length > 0;

    return (
      <div key={node.id || 'root'} className="select-none">
        <div
          onClick={() => onSelectPath(node.path)}
          className={`group flex items-center justify-between px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
            isSelected
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold shadow-xs'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.path, e)}
                className="p-0.5 rounded-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <span className="w-4" />
            )}

            {isRoot ? (
              <Files className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-500'}`} />
            ) : isExpanded ? (
              <FolderOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-500'}`} />
            ) : (
              <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white dark:text-slate-900' : 'text-slate-500'}`} />
            )}

            <span className="truncate">{node.name}</span>
          </div>

          <span
            className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums shrink-0 ml-1.5 ${
              isSelected
                ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
            }`}
          >
            {node.fileCount}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {node.children.map((child) => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800">
      {/* Header cây thư mục */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Cây thư mục
          </span>
          {onCreateFolder && (
            <button
              type="button"
              onClick={() => setIsCreatingFolder(!isCreatingFolder)}
              className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              aria-label="Tạo thư mục mới"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Ô tìm thư mục */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm thư mục..."
            className="w-full pl-8 pr-2.5 py-1.5 text-sm rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-slate-400"
          />
        </div>

        {/* Form tạo thư mục mới */}
        {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="pt-1 flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Tên thư mục mới..."
              className="flex-1 px-2 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-2.5 py-1.5 text-sm bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 rounded-md font-medium"
            >
              Tạo
            </button>
          </form>
        )}
      </div>

      {/* Danh sách các node */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
        {renderNode(filteredRoot, 0)}
      </div>
    </div>
  );
}
