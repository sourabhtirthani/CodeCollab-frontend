'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

export default function EditorPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const userName = searchParams.get('name') || 'Anonymous';
  const [isConnected, setIsConnected] = useState(false);
  const [users, setUsers] = useState([
        {
            socketId:1,name:userName
        },
        {
            socketId:2,name:"jone Doe"
        }
        ]); // Simulated users list

  useEffect(() => {
    toast.success(`Welcome to room ${roomId}, ${userName}!`);
    
    // Simulate connection and other users joining
    const timer = setTimeout(() => {
      setIsConnected(true);
      //toast.success('Connected to room successfully!');
      
      // Simulate other users in the room
      //setUsers([userName, 'Rik', 'Rakesh K']);
    }, 1000);

    return () => {
      clearTimeout(timer);
      toast('Disconnected from room');
    };
  }, [roomId, userName]);

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    toast.success('Room ID copied to clipboard!');
  };

  const handleLeaveRoom = () => {
    toast('Leaving room...');
    // Add your leave room logic here
    window.location.href = '/'; // Redirect to home
  };

  // Function to get user avatar initials
  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <div className="w-60 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
            <div className="p-4 border-b border-gray-700">
            <h1 className="text-lg font-bold">CodeCollab</h1>
            
        </div>

        {/* Users List */}
        <div className="flex-1 p-4">
          <h2 className="text-lg font-semibold mb-4 text-gray-300">Online Users</h2>
          <div className="space-y-3">
            {users.map((user, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-700 rounded">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-semibold">
                    {getAvatarInitials(user.name)}
                </div>
                <span className="text-sm flex-1">{user.name}</span>
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
              <span className="text-sm text-gray-300">Your are: {userName}</span>
            </div>
          </div>
        </header>

        {/* Code Editor Area */}
        <main className="flex-1 p-4 bg-gray-850">
          <div className="bg-gray-800 rounded-lg p-4 h-full">
            <div className="bg-gray-700 rounded p-4 min-h-[400px] h-full">
              <p className="text-gray-400 text-center">Code editor will be implemented here</p>
              {/* TODO: Add CodeMirror or Monaco editor component here */}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}