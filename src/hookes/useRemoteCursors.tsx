// hooks/useRemoteCursors.ts
import { useEffect, useRef, useState } from 'react';

interface RemoteCursor {
  userName: string;
  position: { line: number; ch: number };
  color: string;
  socketId: string;
}

export const useRemoteCursors = (socket: any, roomId: string, userName: string) => {
  const [remoteCursors, setRemoteCursors] = useState<{[key: string]: RemoteCursor}>({});
  const cursorTimeoutRef = useRef<{[key: string]: NodeJS.Timeout}>({});

  useEffect(() => {
    if (!socket) return;

    const handleCursorMove = (data: { 
      userName: string; 
      position: { line: number; ch: number };
      socketId: string;
    }) => {
      const userColor = getUserColor(data.userName);
      
      setRemoteCursors(prev => ({
        ...prev,
        [data.socketId]: {
          ...data,
          color: userColor
        }
      }));

      // Clear existing timeout
      if (cursorTimeoutRef.current[data.socketId]) {
        clearTimeout(cursorTimeoutRef.current[data.socketId]);
      }

      // Remove cursor after 2 seconds of inactivity
      cursorTimeoutRef.current[data.socketId] = setTimeout(() => {
        setRemoteCursors(prev => {
          const newCursors = { ...prev };
          delete newCursors[data.socketId];
          return newCursors;
        });
      }, 2000);
    };

    socket.on('user-cursor-move', handleCursorMove);

    socket.on('user-left', (user: { socketId: string }) => {
      setRemoteCursors(prev => {
        const newCursors = { ...prev };
        delete newCursors[user.socketId];
        return newCursors;
      });
    });

    return () => {
      Object.values(cursorTimeoutRef.current).forEach(timeout => clearTimeout(timeout));
    };
  }, [socket, roomId, userName]);

  return remoteCursors;
};

const getUserColor = (userName: string) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  const index = userName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  return colors[index];
};