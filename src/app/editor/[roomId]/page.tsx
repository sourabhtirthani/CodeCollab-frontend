'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';
import { python } from '@codemirror/lang-python';
import { html } from '@codemirror/lang-html';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { io, Socket } from 'socket.io-client';
import { useRef } from 'react';
import { createFileNode, FileNode } from '@/types/fileSystem';
import FileExplorer from '@/app/components/FileExplorer';


// Create custom cursor decorations



export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const userName = searchParams.get('name') || 'Anonymous';
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string; socketId: string }>>([]);
  const [code, setCode] = useState('// Start coding...\nconsole.log("Hello World!");');
  const [output, setOutput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [isRunning, setIsRunning] = useState(false);
 // const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [fileSystem, setFileSystem] = useState<FileNode>(() => 
  createFileNode('workspace', 'folder', '/workspace')
);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [openFiles, setOpenFiles] = useState<FileNode[]>([]);

  const languageExtensions = {
    javascript: javascript(),
    python: python(),
    html: html(),
    cpp: cpp(),
    java: java(),
    rust: rust(),
  };

const runCode = async () => {
  setIsRunning(true);
  setOutput('Running code...');
  
  try {
    if (selectedLanguage === 'javascript') {
      const originalConsoleLog = console.log;
      const logs: string[] = [];
      console.log = (...args) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      };
      
      eval(code);
      
      console.log = originalConsoleLog;
      const executionOutput = logs.join('\n') || 'Code executed (no output)';
      setOutput(executionOutput);
      
      // Broadcast output to all users
      if (socketRef.current) {
        socketRef.current.emit('code-execution', { 
          roomId, 
          output: executionOutput 
        });
      }
    } else {
      const message = `Code execution for ${selectedLanguage} would be handled by backend`;
      setOutput(message);
      
      // Broadcast this message too
      if (socketRef.current) {
        socketRef.current.emit('code-execution', { 
          roomId, 
          output: message 
        });
      }
    }
  } catch (error) {
    const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
    setOutput(errorMessage);
    
    // Broadcast error too
    if (socketRef.current) {
      socketRef.current.emit('code-execution', { 
        roomId, 
        output: errorMessage 
      });
    }
  } finally {
    setIsRunning(false);
  }
};
  useEffect(() => {
  toast.success(`Welcome to room ${roomId}, ${userName}!`);

  // Initialize socket connection
  const newSocket = io('https://code-collab-backend-ten.vercel.app/'); // NestJS server URL
  
  socketRef.current = newSocket;
 // setSocket(newSocket);

  // Join room
  newSocket.emit('join-room', { roomId, userName });

  // Socket event listeners
  newSocket.on('connect', () => {
    setIsConnected(true);
    toast.success('Connected to room successfully!');
  });

  newSocket.on('room-state', (data: { 
    code: string; 
    language: string; 
    users: Array<{ id: string; name: string; socketId: string }> 
  }) => {
    setCode(data.code);
    setSelectedLanguage(data.language);
    setUsers(data.users);
  });

  newSocket.on('code-update', (newCode: string) => {
    setCode(newCode);
  });

  newSocket.on('language-update', (newLanguage: string) => {
    setSelectedLanguage(newLanguage);
  });

  newSocket.on('user-joined', (user: { id: string; name: string; socketId: string }) => {
    setUsers(prev => [...prev, user]);
    toast.success(`${user.name} joined the room`);
  });

  newSocket.on('user-left', (user: { id: string; name: string; socketId: string }) => {
    setUsers(prev => prev.filter(u => u.socketId !== user.socketId));
    toast.error(`${user.name} left the room`);
  });

  newSocket.on('disconnect', () => {
    setIsConnected(false);
    toast.error('Disconnected from room');
  });

  newSocket.on('output-update', (newOutput: string) => {
  setOutput(newOutput);
  });

  newSocket.on('user-typing', (data: { userName: string; isTyping: boolean }) => {
  setTypingUsers(prev => {
    if (data.isTyping) {
      // Add user to typing list if not already there
      return prev.includes(data.userName) ? prev : [...prev, data.userName];
    } else {
      // Remove user from typing list
      return prev.filter(user => user !== data.userName);
    }
  });
});
  // Cleanup on unmount
  return () => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', roomId);
      socketRef.current.disconnect();
    }
  };
}, [roomId, userName]);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room ID copied to clipboard!');
  };

  const handleLeaveRoom = () => {
  if (socketRef.current) {
    socketRef.current.emit('leave-room', roomId);
    socketRef.current.disconnect();
  }
  toast('Leaving room...');
  window.location.href = '/';
};

  // Function to get user avatar initials
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };
  // Add this state

// Add typing handlers
const handleCodeChange = (newCode: string) => {
  setCode(newCode);
  
  // Start typing indicator
  if (socketRef.current) {
    socketRef.current.emit('typing-start', { roomId, userName });
    
    // Clear typing indicator after 1 second of inactivity
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing-stop', { roomId, userName });
    }, 1000);
  }
  
  // Emit code change
  if (socketRef.current) {
    socketRef.current.emit('code-change', { roomId, code: newCode });
  }
};
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// Add this ref for typing timeout

const handleLanguageChange = (newLanguage: string) => {
  setSelectedLanguage(newLanguage);
  if (socketRef.current) {
    socketRef.current.emit('language-change', { roomId, language: newLanguage });
  }
};
const handleFileSelect = (file: FileNode | null) => {
  if (!file) {
    setSelectedFile(null);
    return;
  }

  setSelectedFile(file);
  
  // Add to open files if not already open
  if (!openFiles.find(f => f.id === file.id)) {
    setOpenFiles(prev => [...prev, file]);
  }
  
  // Set code and language based on file
  setCode(file.content || '');
  
  // Map file extension to language
  const extension = file.name.split('.').pop();
  const languageMap: { [key: string]: string } = {
    'tsx': 'javascript',
    'ts': 'javascript', 
    'js': 'javascript',
    'jsx': 'javascript',
    'py': 'python',
    'html': 'html',
    'css': 'css',
    'json': 'javascript',
    'md': 'markdown',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'cpp',
    'rs': 'rust'
  };
  
  setSelectedLanguage(languageMap[extension || ''] || 'javascript');
};
  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      
      <div className="w-60 bg-gray-800 border-r border-gray-700 flex flex-col">
         <FileExplorer 
        onFileSelect={handleFileSelect}
        selectedFile={selectedFile}
        fileSystem={fileSystem}
        onFileSystemChange={setFileSystem}
      />
        {/* Header */}
            <div className="p-4 border-b border-gray-700">
            <h1 className="text-lg font-bold">CodeCollab</h1>
             <div className="flex items-center mt-1">
              <div className={`w-2 h-2 rounded-full mr-2 ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <span className="text-xs text-gray-300">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
        </div>

          {/* Users List - Compact Avatars Only */}
          <div className="flex-1 p-2">
            <div className="space-y-3">
              {users.map((user, index) => (
                <div
                  key={index}
                  className="relative group"
                  title={user.name + (user.name === userName ? ' (You)' : '')}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold
                    ${user.name === userName ? 'ring-2 ring-green-500' : ''}
                    ${typingUsers.includes(user.name) ? 'bg-green-600' : 'bg-blue-600'}
                    transition-all duration-200
                  `}>
                    {getAvatarInitials(user.name)}
                </div>
                <span className="text-sm flex-1">{user.name}</span>
                {typingUsers.includes(user.name) && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                )}

                {user.name === userName && (
                    <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">You</span>
                )}
                </div>
              ))}
            </div>
          </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-700 space-y-3">
          
                <button
                onClick={handleCopyRoomId}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center"
                >
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy ROOM ID
                </button>
          
          <button
            onClick={handleLeaveRoom}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-1.5 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave
          </button>
        </div>
      
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Code Editor - Room: {roomId}</h2>
          <div className="flex items-center space-x-4">
            <select 
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600"
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="html">HTML</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="rust">Rust</option>
            </select>
            
            <button
              onClick={runCode}
              disabled={isRunning}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-4 py-1 rounded"
            >
              {isRunning ? 'Running...' : 'Run Code'}
            </button>
            
            <span className="text-sm text-gray-300">You are: {userName}</span>
          </div>
        </div>
          {typingUsers.length > 0 && (
          <div className="mt-2 text-sm text-gray-300">
            {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
      </header>
        
        {/* Code Editor Area */}
        <main className="flex-1 p-4 bg-gray-850">
          <div className="bg-gray-800 rounded-lg p-4 h-full">
            {/* Code Editor Area */}
            <main className="flex-1 p-4 bg-gray-850">
          <div className="bg-gray-800 rounded-lg p-4 h-full">
                <CodeMirror
                  value={code}
                  height="100%"
                  theme={oneDark}
                  extensions={[languageExtensions[selectedLanguage as keyof typeof languageExtensions]]}
                  onChange={handleCodeChange}
                  className="h-full rounded"
                />
              </div>
            </main>
          </div>
        </main>

        {/* Output Area */}
        <div className="mt-4 bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Output:</h3>
          <pre className="bg-gray-900 p-3 rounded text-sm font-mono whitespace-pre-wrap min-h-[100px] max-h-[200px] overflow-y-auto">
            {output || 'Output will appear here...'}
          </pre>
        </div>
      </div>
    </div>
  );
}