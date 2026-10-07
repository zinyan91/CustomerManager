export interface FolderTreeNode {
  id: string; // Đường dẫn tương đối làm ID duy nhất (vd: '2026/hop-dong')
  name: string; // Tên hiển thị (vd: 'hop-dong')
  path: string; // Đường dẫn đầy đủ
  children: FolderTreeNode[];
  fileCount: number;
  totalBytes: number;
}

/** Cây thư mục dựng từ danh sách tệp của kho. */
export function buildFolderTree(items: Array<{ path: string; size: number }>): FolderTreeNode {
  const root: FolderTreeNode = {
    id: '',
    name: 'Tất cả tài liệu',
    path: '',
    children: [],
    fileCount: 0,
    totalBytes: 0,
  };

  const folderMap = new Map<string, FolderTreeNode>();
  folderMap.set('', root);

  for (const item of items) {
    const segments = item.path.split('/');
    root.fileCount++;
    root.totalBytes += item.size;

    let currentPath = '';
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${seg}` : seg;

      let folder = folderMap.get(currentPath);
      if (!folder) {
        folder = {
          id: currentPath,
          name: seg,
          path: currentPath,
          children: [],
          fileCount: 0,
          totalBytes: 0,
        };
        folderMap.set(currentPath, folder);

        const parentNode = folderMap.get(parentPath);
        if (parentNode) {
          parentNode.children.push(folder);
        }
      }

      folder.fileCount++;
      folder.totalBytes += item.size;
    }
  }

  function sortTree(node: FolderTreeNode) {
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'vi', { numeric: true }));
    node.children.forEach(sortTree);
  }
  sortTree(root);

  return root;
}
