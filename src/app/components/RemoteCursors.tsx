// Add this CSS to your globals.css or component
const cursorStyles = `
.remote-cursor {
  position: absolute;
  border-left: 2px solid;
  height: 1em;
  pointer-events: none;
  z-index: 10;
}

.remote-cursor-info {
  position: absolute;
  top: -1.5em;
  font-size: 0.75em;
  padding: 2px 6px;
  border-radius: 4px;
  color: white;
  white-space: nowrap;
  pointer-events: none;
  z-index: 11;
}
`;

// Add this component to render cursors
const RemoteCursors = ({ editor, cursors }: { editor: any, cursors: any }) => {
  if (!editor) return null;
  
  return (
    <div className="absolute inset-0 pointer-events-none">
      <style>{cursorStyles}</style>
      {Object.entries(cursors).map(([socketId, cursorData]: [string, any]) => {
        const coords = editor.coordsAtPos?.(editor.posFromIndex?.(cursorData.position));
        if (!coords) return null;
        
        return (
          <div key={socketId}>
            <div
              className="remote-cursor"
              style={{
                left: coords.left,
                top: coords.top,
                borderColor: cursorData.color,
              }}
            />
            <div
              className="remote-cursor-info"
              style={{
                left: coords.left,
                top: coords.top - 20,
                backgroundColor: cursorData.color,
              }}
            >
              {cursorData.userName}
            </div>
          </div>
        );
      })}
    </div>
  );
};