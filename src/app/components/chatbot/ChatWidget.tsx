'use client';

import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import ChatMessage from './ChatMessage';

interface ChatMessage {
  id: string;
  message: string;
  sender: string;
  timestamp: Date;
  senderId: string;
}

interface ChatWidgetProps {
  socket: Socket | null;
  roomId: string;
  userName: string;
}

export default function ChatWidget({ socket, roomId, userName }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  console.log('ChatWidget - Socket:', socket?.connected);
  // console.log('ChatWidget - IsClient:', isClient);
  console.log('ChatWidget - IsConnected:', isConnected);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) {
      setConnectionError('Socket not available');
      return;
    }

    console.log('Setting up chat socket listeners...', {
      socketConnected: socket.connected,
      socketId: socket.id
    });

    const handleConnect = () => {
      console.log('Chat connected! Joining room:', roomId);
      setIsConnected(true);
      setConnectionError('');

      // Join chat room when connected
      socket.emit('join-chat', roomId, (response: any) => {
        console.log('Join chat response:', response);
      });
    };

    const handleDisconnect = () => {
      console.log('Chat disconnected!');
      setIsConnected(false);
      setConnectionError('Disconnected from server');
    };

    const handleChatMessage = (data: any) => {
      console.log('Received chat message:', data);
      const message: ChatMessage = {
        ...data,
        timestamp: new Date(data.timestamp)
      };
      setMessages(prev => [...prev, message]);

      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    };

    const handleChatHistory = (chatHistory: any) => {
      console.log('Received chat history:', chatHistory);
      const history = chatHistory.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
      setMessages(history);
    };

    const handleConnectError = (error: Error) => {
      console.error('Chat connection error:', error);
      setConnectionError('Connection failed: ' + error.message);
    };

    // Set up event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('chat-message', handleChatMessage);
    socket.on('chat-history', handleChatHistory);
    socket.on('connect_error', handleConnectError);

    // MANUALLY TRIGGER CONNECTION if socket is already connected
    if (socket.connected) {
      console.log('Socket already connected, manually joining chat...');
      handleConnect();
    } else {
      console.log('Socket not connected yet, waiting for connect event...');
    }

    // Test: Send a test message to see if backend responds
    setTimeout(() => {
      if (socket.connected) {
        console.log('Sending test join-chat event...');
        socket.emit('join-chat', roomId);
      }
    }, 1000);

    return () => {
      console.log('Cleaning up chat listeners...');
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('chat-message', handleChatMessage);
      socket.off('chat-history', handleChatHistory);
      socket.off('connect_error', handleConnectError);
    };
  }, [socket, roomId, isOpen]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;

    const messageData = {
      id: Date.now().toString(),
      message: newMessage.trim(),
      sender: userName,
      senderId: socket.id,
      timestamp: new Date(),
      roomId
    };

    // Emit message to server
    socket.emit('send-message', messageData);
    setNewMessage('');

    // Refocus input after sending
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      // Reset unread count when opening chat
      setUnreadCount(0);
      // Focus input when opening
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={toggleChat}
          className="relative bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>

          {/* Unread Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}

          {/* Connection Status Dot */}
          <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 ${isConnected ? 'bg-green-400' : 'bg-red-400'
            }`} />
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 h-96 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 flex flex-col z-40 animate-in slide-in-from-bottom-5 duration-200">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
              <h3 className="text-lg font-semibold text-white">Team Chat</h3>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                {messages.length} messages
              </span>
            </div>
            <button
              onClick={toggleChat}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-850">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-16">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-sm">No messages yet</p>
                <p className="text-xs text-gray-600">Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg.message}
                  sender={msg.sender}
                  timestamp={msg.timestamp}
                  isOwnMessage={msg.senderId === socket?.id}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-3 border-t border-gray-700 bg-gray-800 rounded-b-lg">
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm placeholder-gray-400"
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || !isConnected}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg transition-colors flex items-center justify-center"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}