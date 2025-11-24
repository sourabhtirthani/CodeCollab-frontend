import { FileNode } from "@/types/fileSystem";
import { useState } from "react";

// Update FileTree props
interface FileTreeProps {
  node: FileNode;
  level?: number;
  onFileSelect: (file: FileNode) => void;
  selectedFile?: FileNode | null;
  onAddItem?: (parent: FileNode, type: 'file' | 'folder', name?: string) => void;
  onDeleteItem?: (node: FileNode) => void;
  onRenameItem?: (node: FileNode, newName: string) => void;
  onContextMenu?: (e: React.MouseEvent, node: FileNode | null) => void;
}

// FileTree component
export default function FileTree({
  node,
  level = 0,
  onFileSelect,
  selectedFile = null,
  onAddItem,
  onDeleteItem,
  onRenameItem,
  onContextMenu,
}: FileTreeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);

  const handleRename = () => {
    if (editName.trim() && onRenameItem) {
      onRenameItem(node, editName.trim());
    }
    setIsEditing(false);
  };

  // Double click to rename
  const handleDoubleClick = () => {
    if (node.type === 'file' || node.type === 'folder') {
      setIsEditing(true);
      setEditName(node.name);
    }
  };

  return (
    <div onDoubleClick={handleDoubleClick} onContextMenu={(e) => onContextMenu?.(e, node)}>
      {/* Minimal rendering to avoid compile errors; expand as needed */}
      {isEditing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          autoFocus
        />
      ) : (
        <span>{node.name}</span>
      )}
    </div>
  );
}