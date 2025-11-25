'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from "uuid";
import toast from 'react-hot-toast';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const [name, setName] = useState('');
  const router = useRouter();

  const isDisable=!roomId || !name;

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim() && name.trim()) {
      toast.success('Joining room...');
      router.push(`/editor/${roomId}?name=${encodeURIComponent(name)}`);
    }
  };

  const handleCreateNewRoom = () => {
    const newRoomId = uuidv4();
    console.log("newroomid",newRoomId);
    setRoomId(newRoomId);
    toast.success('Created New Room');
  };
  const handleInput =(e:React.KeyboardEvent<HTMLInputElement>)=>{
    if(e.code==="Enter") handleJoinRoom(e);
  }
  return (
    <div className="min-h-screen bg-black from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">CodeCollab</h1>
          <p className="text-gray-300">Real-time code editing made simple</p>
        </div>

        <form onSubmit={handleJoinRoom} className="space-y-6">
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium text-white mb-2">
              Room ID
            </label>
            <input
              id="roomId"
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              className="w-full px-4 py-3 bg-white text-black border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-500"              required
              onKeyUp={handleInput}
            />
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full px-4 py-3 bg-white text-black border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-gray-500"              required
              onKeyUp={handleInput}
            />
          </div>

          <button
            type="submit"
            className={`p-2 rounded ${
                isDisable
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`} >
            Join Room
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-300 mb-3">Don&rsquo;t have a room ID?</p>
          <button
            onClick={handleCreateNewRoom}
            className="text-blue-400 hover:text-blue-300 font-semibold underline transition-colors"
          >
            Create New Room
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center">
            Share the room ID with others to collaborate in real-time!
          </p>
        </div>
      </div>
    </div>
  );
}