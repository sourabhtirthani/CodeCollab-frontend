// components/CursorOverlay.tsx
'use client';

import { useEffect, useRef } from 'react';

interface CursorOverlayProps {
  editorElement: HTMLDivElement | null;
  cursors: { [key: string]: { userName: string; position: { line: number; ch: number }; color: string; socketId: string } };
}

export default function CursorOverlay({ editorElement, cursors }: CursorOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editorElement || !overlayRef.current) return;

    const updateCursorPositions = () => {
      Object.values(cursors).forEach(cursor => {
        const cursorElement = document.getElementById(`cursor-${cursor.socketId}`);
        const infoElement = document.getElementById(`cursor-info-${cursor.socketId}`);
        
        if (cursorElement && infoElement) {
          // This is a simplified position calculation
          // In a real implementation, you'd use CodeMirror's coordinate system
          cursorElement.style.display = 'block';
          infoElement.style.display = 'block';
        }
      });
    };

    updateCursorPositions();
  }, [cursors, editorElement]);

  if (!editorElement) return null;

  return (
    <div 
      ref={overlayRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        top: editorElement.offsetTop,
        left: editorElement.offsetLeft,
        width: editorElement.offsetWidth,
        height: editorElement.offsetHeight,
      }}
    >
      {Object.values(cursors).map((cursor) => (
        <div key={cursor.socketId}>
          <div
            id={`cursor-${cursor.socketId}`}
            className="absolute w-0.5 h-6 transition-all duration-100"
            style={{
              borderLeft: `2px solid ${cursor.color}`,
              // Position would be calculated based on cursor.position
              display: 'none'
            }}
          />
          <div
            id={`cursor-info-${cursor.socketId}`}
            className="absolute text-xs text-white px-2 py-1 rounded whitespace-nowrap transition-all duration-100"
            style={{
              backgroundColor: cursor.color,
              // Position would be calculated based on cursor.position
              display: 'none'
            }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </div>
  );
}