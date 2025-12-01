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
import ChatWidget from '@/app/components/chatbot/ChatWidget';
import { EditorView } from '@codemirror/view';

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
  const [executionController, setExecutionController] = useState<AbortController | null>(null);
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

  // Add these states
  const [isInterviewMode, setIsInterviewMode] = useState(false);
  const [isRoomCreator, setIsRoomCreator] = useState(false);

  // Check if user is room creator (first user to join)
  useEffect(() => {
    // Simple logic: first user in the room is the creator
    if (users.length > 0) {
      const isCreator = users[0]?.socketId === socketRef.current?.id;
      setIsRoomCreator(isCreator);
    }
  }, [users]);

  // Toggle interview mode (only room creator can do this)
  const toggleInterviewMode = () => {
    if (!isRoomCreator) return;

    const newMode = !isInterviewMode;
    setIsInterviewMode(newMode);

    if (socketRef.current) {
      socketRef.current.emit('interview-mode-toggle', {
        roomId,
        enabled: newMode
      });
    }

    toast.success(`Interview mode ${newMode ? 'enabled' : 'disabled'}`);
  };

  // Listen for interview mode changes from other users
  useEffect(() => {
    if (!socketRef.current) return;

    socketRef.current.on('interview-mode-update', (data: { enabled: boolean }) => {
      setIsInterviewMode(data.enabled);
    });

    return () => {
      socketRef.current?.off('interview-mode-update');
    };
  }, []);

  // Disable copy/paste and tab change in interview mode
  // Update the interview mode security effect
useEffect(() => {
  // Only apply restrictions to NON-creator users in interview mode
  if (!isInterviewMode || isRoomCreator) return;

  const handleCopy = (e: ClipboardEvent) => {
    e.preventDefault();
    toast.error('Copy/paste is disabled in interview mode');
    return false;
  };

  const handlePaste = (e: ClipboardEvent) => {
    e.preventDefault();
    toast.error('Copy/paste is disabled in interview mode');
    return false;
  };

  const handleCut = (e: ClipboardEvent) => {
    e.preventDefault();
    toast.error('Cut is disabled in interview mode');
    return false;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Disable common copy/paste shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
      e.preventDefault();
      toast.error('Shortcuts disabled in interview mode');
      return false;
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      toast.error('Tab switching is not allowed during interview mode');
      // You can add more severe consequences here
      document.title = "⚠️ Please return to the interview";
    } else {
      document.title = "CodeCollab - Interview Mode";
    }
  };

  const handleContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    toast.error('Right-click menu disabled in interview mode');
    return false;
  };

  // Add all event listeners
  document.addEventListener('copy', handleCopy, true);
  document.addEventListener('paste', handlePaste, true);
  document.addEventListener('cut', handleCut, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  document.addEventListener('contextmenu', handleContextMenu, true);

  // Disable text selection on the entire page (optional)
  document.body.style.userSelect = 'none';
  document.body.style.webkitUserSelect = 'none';

  return () => {
    // Clean up event listeners
    document.removeEventListener('copy', handleCopy, true);
    document.removeEventListener('paste', handlePaste, true);
    document.removeEventListener('cut', handleCut, true);
    document.removeEventListener('keydown', handleKeyDown, true);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    
    // Re-enable text selection
    document.body.style.userSelect = '';
    document.body.style.webkitUserSelect = '';
    document.title = "CodeCollab";
  };
}, [isInterviewMode, isRoomCreator]); // Only apply when interview mode is ON and user is NOT creator

  // Updated runCode function with abort capability
  const runCode = async () => {
    if (isRunning && executionController) {
      executionController.abort();
      return;
    }

    const controller = new AbortController();
    setExecutionController(controller);
    setIsRunning(true);
    setOutput('Running code...');

    try {
      if (selectedLanguage === 'javascript') {
        // Add timeout for infinite loops
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 5000); // 5 second timeout

        const originalConsoleLog = console.log;
        let logs: string[] = [];
        console.log = (...args) => {
          if (controller.signal.aborted) return;
          logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
        };

        // Check for abort signal during execution
        if (controller.signal.aborted) {
          throw new Error('Execution aborted');
        }

        eval(code);

        clearTimeout(timeoutId);
        console.log = originalConsoleLog;
        const executionOutput = logs.join('\n') || 'Code executed (no output)';
        setOutput(executionOutput);

        if (socketRef.current) {
          socketRef.current.emit('code-execution', {
            roomId,
            output: executionOutput
          });
        }
      } else {
        const message = `Code execution for ${selectedLanguage} would be handled by backend`;
        setOutput(message);

        if (socketRef.current) {
          socketRef.current.emit('code-execution', {
            roomId,
            output: message
          });
        }
      }
    } catch (error) {
      if (controller.signal.aborted) {
        setOutput('❌ Execution stopped: Timeout or manual stop');
      } else {
        const errorMessage = `Error: ${error instanceof Error ? error.message : String(error)}`;
        setOutput(errorMessage);
      }

      if (socketRef.current) {
        socketRef.current.emit('code-execution', {
          roomId,
          output: controller.signal.aborted ? '❌ Execution stopped' : `Error: ${error}`
        });
      }
    } finally {
      setIsRunning(false);
      setExecutionController(null);
    }
  };

  // Stop execution function
  const stopExecution = () => {
    if (executionController) {
      executionController.abort();
      setIsRunning(false);
      setExecutionController(null);
      setOutput('⏹️ Execution stopped by user');
    }
  };
  useEffect(() => {
    toast.success(`Welcome to room ${roomId}, ${userName}!`);
    const socketUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    console.log('Connecting to socket URL:', socketUrl);
    // Initialize socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'] // Ensure both transports are available
    }); // NestJS server URL

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
        {/* <FileExplorer
          onFileSelect={handleFileSelect}
          selectedFile={selectedFile}
          fileSystem={fileSystem}
          onFileSystemChange={setFileSystem}
        /> */}
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
              {/* Interview Mode Toggle */}
              {isRoomCreator && (
                <div className="flex items-center space-x-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isInterviewMode}
                      onChange={toggleInterviewMode}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer ${isInterviewMode ? 'peer-checked:bg-blue-600' : ''
                      } peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                    <span className="ml-2 text-sm font-medium text-gray-300">
                      Interview Mode
                    </span>
                  </label>
                </div>
              )}

              {/* Show interview mode status for non-creators */}
              {!isRoomCreator && isInterviewMode && (
                <div className="flex items-center space-x-2 bg-yellow-600 px-3 py-1 rounded text-sm">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>Interview Mode</span>
                </div>
              )}

              {/* Language Selector */}
              <select
                value={selectedLanguage}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-gray-700 text-white px-3 py-1 rounded border border-gray-600"
                disabled={isInterviewMode && !isRoomCreator}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="html">HTML</option>
                <option value="cpp">C++</option>
                <option value="java">Java</option>
                <option value="rust">Rust</option>
              </select>

              {/* Run/Stop Button */}
              <button
                onClick={isRunning ? stopExecution : runCode}
                disabled={isInterviewMode && !isRoomCreator}
                className={`px-4 py-1 rounded transition-colors ${isRunning
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                  } disabled:bg-gray-600 disabled:cursor-not-allowed`}
              >
                {isRunning ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Stop</span>
                  </div>
                ) : (
                  'Run Code'
                )}
              </button>

              <span className="text-sm text-gray-300">You are: {userName}</span>
            </div>
          </div>

          {/* Typing Indicator */}
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
                onChange={isInterviewMode && !isRoomCreator ? undefined : handleCodeChange}
                className="h-full rounded"
                readOnly={isInterviewMode && !isRoomCreator}
                basicSetup={{
                  lineNumbers: true,
                  highlightActiveLine: !(isInterviewMode && !isRoomCreator),
                  highlightSelectionMatches: !(isInterviewMode && !isRoomCreator),
                }}
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
      <ChatWidget
        socket={socketRef.current}
        roomId={roomId}
        userName={userName}
      />
    </div>
  );
}