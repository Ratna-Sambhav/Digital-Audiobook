// src/components/ConvoAI.tsx

import { useState, useEffect, useRef } from 'react';
import { Room, Track } from 'livekit-client';
import {
  RoomAudioRenderer,
  RoomContext,
  TrackToggle,
  useChat,
  useTranscriptions,
} from '@livekit/components-react';
import { aiAgentAuth } from '../services/api';
import { ChevronLeft } from 'lucide-react';
import './ConvoAI.css';

interface Message {
  id: string;
  text: string;
  timestamp: number;
  type: 'chat' | 'transcript';
  sender: string;
}

interface ConvoAIProps {
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  agentState?: {};
}

export default function ConvoAI({ isOpen: controlledOpen, onToggle, agentState }: ConvoAIProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));

  const isOpen = controlledOpen !== undefined ? controlledOpen : false;
  const setIsOpen = (open: boolean) => {
    if (onToggle) {
      onToggle(!open);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const { serverurl, token } = await aiAgentAuth.getToken(agentState);
      await room.connect(serverurl, token);
      setIsConnected(true);
      setIsConnecting(false);
    } catch (err) {
      setIsConnecting(false);
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect to room';
      setError(errorMessage);
      console.error('Connection error:', err);
    }
  };

  const handleDisconnect = () => {
    if (room.state === 'connected' || room.state === 'reconnecting') {
      room.disconnect();
    }
    setIsConnected(false);
  };

  useEffect(() => {
    return () => {
      if (room.state === 'connected' || room.state === 'reconnecting') {
        room.disconnect();
      }
    };
  }, [room]);

  useEffect(() => { 
    room.localParticipant.setAttributes({ 
      ...agentState, 
    });   
  }, [agentState, room]);

  return (
    <RoomContext.Provider value={room}>
      <button 
        className={`convo-toggle-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(isOpen)}
      >
        <ChevronLeft className={`toggle-icon ${isOpen ? 'flipped' : ''}`} />
      </button>

      <div className={`convo-sidebar ${!isOpen ? 'closed' : ''}`}>
        <div className="convo-header">
          <div className="convo-icon-title">
            <span className="convo-emoji">🤖</span>
            <div>
              <h2 className="convo-title">Buddhi</h2>
              <p className="convo-subtitle">Your AI Assistant</p>
            </div>
          </div>
        </div>

        <div className="convo-content">
          {!isConnected && !isConnecting && !error && (
            <div className="convo-intro">
              <div className="intro-icon">🎙️</div>
              <p className="intro-message">
                Welcome! I'm Buddhi, your AI assistant. I can help you understand your documents, 
                answer questions, and create study materials.
              </p>
              <div className="convo-buttons">
                <button className="convo-btn talk" onClick={handleConnect}>
                  <span className="btn-icon">🎤</span>
                  <span>Talk with Buddhi</span>
                </button>
                <button className="convo-btn chat" disabled>
                  <span className="btn-icon">💬</span>
                  <span>Chat with Buddhi</span>
                </button>
              </div>
            </div>
          )}

          {isConnecting && (
            <div className="convo-status">
              <div className="status-spinner"></div>
              <p className="status-text">Connecting...</p>
            </div>
          )}

          {error && (
            <div className="convo-error">
              <div className="error-icon">⚠️</div>
              <p className="error-title">Connection Error</p>
              <p className="error-message">{error}</p>
              <button className="retry-btn" onClick={handleConnect}>
                Try Again
              </button>
            </div>
          )}

          {isConnected && (
            <div className="convo-connected">
              <div className="status-badge">
                <span className="status-dot"></span>
                <span>Connected</span>
              </div>
              <ChatContent />
              <div className="convo-controls">
                <TrackToggle 
                  source={Track.Source.Microphone}
                  className="mic-toggle-btn"
                />
                <button className="disconnect-btn" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="convo-footer">
          Powered by LiveKit & Claude
        </div>
      </div>

      <RoomAudioRenderer />
    </RoomContext.Provider>
  );
}

function ChatContent() {
  const { chatMessages, send, isSending } = useChat();
  const transcriptions = useTranscriptions();
  const [message, setMessage] = useState('');
  const [allMessages, setAllMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const messages: Message[] = [];

    chatMessages.forEach((msg) => {
      messages.push({
        id: `chat-${msg.timestamp}`,
        text: msg.message,
        timestamp: msg.timestamp,
        type: 'chat',
        sender: msg.from?.identity || 'Unknown'
      });
    });

    transcriptions.forEach((trans, index) => {
      const timestamp = trans.streamInfo?.timestamp || Date.now();
      messages.push({
        id: `transcript-${timestamp}-${index}`,
        text: trans.text || '',
        timestamp: timestamp,
        type: 'transcript',
        sender: trans.participantInfo?.identity || 'Voice'
      });
    });

    messages.sort((a, b) => a.timestamp - b.timestamp);
    setAllMessages(messages);
  }, [chatMessages, transcriptions]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages]);

  const handleSend = () => {
    if (message.trim() && !isSending) {
      send(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      <div className="messages-area">
        {allMessages.length === 0 ? (
          <div className="no-messages">
            <div className="no-messages-icon">💬</div>
            <p className="no-messages-text">No messages yet</p>
            <p className="no-messages-subtext">Start chatting or speaking!</p>
          </div>
        ) : (
          <div className="messages-list">
            {allMessages.map((msg) => (
              <div
                key={msg.id}
                className={`message-item ${msg.type}`}
              >
                <div className="message-header">
                  <span className="message-sender">{msg.sender}</span>
                  <span className="message-type-icon">
                    {msg.type === 'chat' ? '💬' : '🎤'}
                  </span>
                </div>
                <div className="message-text">{msg.text}</div>
                <div className="message-time">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          disabled={isSending}
          className="message-input"
        />
        <button
          disabled={isSending || !message.trim()}
          onClick={handleSend}
          className="send-btn"
        >
          {isSending ? '...' : 'Send'}
        </button>
      </div>
    </>
  );
}