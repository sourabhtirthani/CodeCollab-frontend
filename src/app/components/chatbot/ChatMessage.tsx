'use client';

interface ChatMessageProps {
  message: string;
  sender: string;
  timestamp: Date;
  isOwnMessage: boolean;
}

export default function ChatMessage({ message, sender, timestamp, isOwnMessage }: ChatMessageProps) {
  const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
        isOwnMessage 
          ? 'bg-blue-600 text-white rounded-br-none' 
          : 'bg-gray-700 text-white rounded-bl-none'
      }`}>
        {!isOwnMessage && (
          <div className="text-xs font-semibold text-blue-300 mb-1">
            {sender}
          </div>
        )}
        <div className="text-sm break-words">{message}</div>
        <div className={`text-xs mt-1 ${isOwnMessage ? 'text-blue-200' : 'text-gray-400'}`}>
          {timeString}
        </div>
      </div>
    </div>
  );
}