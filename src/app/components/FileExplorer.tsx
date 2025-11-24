'use client';

import { useState } from 'react';
import { FileNode, createFileNode } from '@/types/fileSystem';
import FileTree from './FileTree';

interface FileExplorerProps {
  onFileSelect: (file: FileNode) => void;
  selectedFile: FileNode | null;
  fileSystem: FileNode;
  onFileSystemChange: (newFileSystem: FileNode) => void;
}

export default function FileExplorer({ 
  onFileSelect, 
  selectedFile, 
  fileSystem, 
  onFileSystemChange 
}: FileExplorerProps) {
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, node: FileNode | null} | null>(null);

  // Add new file/folder
  const addNewItem = (parent: FileNode, type: 'file' | 'folder', name: string = '') => {
    if (!name.trim()) {
      const baseName = type === 'file' ? 'new-file' : 'new-folder';
      name = `${baseName}-${Date.now()}`;
    }

    const newItem = createFileNode(name, type, `${parent.path}/${name}`);
    
    const updatedSystem = { ...fileSystem };
    const addToParent = (node: FileNode, targetPath: string): FileNode => {
      if (node.path === targetPath) {
        return {
          ...node,
          children: [...(node.children || []), newItem]
        };
      }
      
      if (node.children) {
        return {
          ...node,
          children: node.children.map(child => addToParent(child, targetPath))
        };
      }
      
      return node;
    };

    onFileSystemChange(addToParent(updatedSystem, parent.path));
  };

  // Delete file/folder
  const deleteItem = (nodeToDelete: FileNode) => {
    const removeFromParent = (node: FileNode): FileNode => {
      if (node.children) {
        return {
          ...node,
          children: node.children
            .filter(child => child.id !== nodeToDelete.id)
            .map(removeFromParent)
        };
      }
      return node;
    };

    onFileSystemChange(removeFromParent({ ...fileSystem }));
    
    if (selectedFile?.id === nodeToDelete.id) {
      onFileSelect(null as any);
    }
  };

  // Rename file/folder
  const renameItem = (node: FileNode, newName: string) => {
    const renameInTree = (currentNode: FileNode): FileNode => {
      if (currentNode.id === node.id) {
        return {
          ...currentNode,
          name: newName,
          path: currentNode.path.replace(new RegExp(`${currentNode.name}$`), newName)
        };
      }
      
      if (currentNode.children) {
        return {
          ...currentNode,
          children: currentNode.children.map(renameInTree)
        };
      }
      
      return currentNode;
    };

    onFileSystemChange(renameInTree({ ...fileSystem }));
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  };

  return (
    <div 
      className="h-full bg-gray-900 border-r border-gray-700"
      onContextMenu={(e) => handleContextMenu(e, null)}
      onClick={() => setContextMenu(null)}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <h3 className="text-sm font-semibold text-gray-200">EXPLORER</h3>
        <button
          onClick={() => addNewItem(fileSystem, 'folder')}
          className="text-gray-400 hover:text-white text-lg"
          title="New Folder"
        >
          +
        </button>
      </div>

      {/* File Tree */}
      <div className="p-2">
        <FileTree
          node={fileSystem}
          onFileSelect={onFileSelect}
          selectedFile={selectedFile}
          onAddItem={addNewItem}
          onDeleteItem={deleteItem}
          onRenameItem={renameItem}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed bg-gray-800 border border-gray-600 rounded shadow-lg py-1 z-50"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {contextMenu.node ? (
            <>
              <button
                className="block w-full text-left px-4 py-1 hover:bg-gray-700 text-sm"
                onClick={() => {
                  const newName = prompt('Enter new name:', contextMenu.node?.name);
                  if (newName && contextMenu.node) {
                    renameItem(contextMenu.node, newName);
                  }
                  setContextMenu(null);
                }}
              >
                Rename
              </button>
              <button
                className="block w-full text-left px-4 py-1 hover:bg-gray-700 text-sm"
                onClick={() => {
                  if (contextMenu.node) {
                    deleteItem(contextMenu.node);
                  }
                  setContextMenu(null);
                }}
              >
                Delete
              </button>
              {contextMenu.node.type === 'folder' && (
                <>
                  <div className="border-t border-gray-600 my-1"></div>
                  <button
                    className="block w-full text-left px-4 py-1 hover:bg-gray-700 text-sm"
                    onClick={() => {
                      if (contextMenu.node) {
                        addNewItem(contextMenu.node, 'file');
                      }
                      setContextMenu(null);
                    }}
                  >
                    New File
                  </button>
                  <button
                    className="block w-full text-left px-4 py-1 hover:bg-gray-700 text-sm"
                    onClick={() => {
                      if (contextMenu.node) {
                        addNewItem(contextMenu.node, 'folder');
                      }
                      setContextMenu(null);
                    }}
                  >
                    New Folder
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <button
                className="block w-full text-left px-4 py-1 hover:bg-gray-700 text-sm"
                onClick={() => {
                  addNewItem(fileSystem, 'file');
                  setContextMenu(null);
                }}
              >
                New File
              </button>
              <button
                className="block w-full text-left px-4 py-1 hover:bg-gray-700 text-sm"
                onClick={() => {
                  addNewItem(fileSystem, 'folder');
                  setContextMenu(null);
                }}
              >
                New Folder
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}