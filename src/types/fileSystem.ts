export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
  language?: string;
  isOpen?: boolean;
}

export const createFileNode = (
  name: string, 
  type: 'file' | 'folder', 
  path: string, 
  content?: string
): FileNode => {
  const extension = name.split('.').pop() || '';
  const languageMap: { [key: string]: string } = {
    'tsx': 'javascript', 'ts': 'javascript', 'js': 'javascript', 'jsx': 'javascript',
    'py': 'python', 'html': 'html', 'css': 'css', 'json': 'javascript',
    'md': 'markdown', 'java': 'java', 'cpp': 'cpp', 'c': 'cpp', 'rs': 'rust'
  };

  return {
    id: `${path}-${Date.now()}-${Math.random()}`,
    name,
    type,
    path,
    content: content || '',
    language: type === 'file' ? languageMap[extension] : undefined,
    children: type === 'folder' ? [] : undefined,
    isOpen: type === 'folder' ? true : undefined
  };
};