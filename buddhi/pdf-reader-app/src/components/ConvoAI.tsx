import { useState, useEffect, useRef } from 'react';
import { Room, Track } from 'livekit-client';
import {
  RoomAudioRenderer,
  RoomContext,
  TrackToggle,
  useChat,
  useTranscriptions,
} from '@livekit/components-react';



async function getToken(attributes = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams({
      attributes: JSON.stringify(attributes),
    });

    // Send GET request to your backend
    const response = await fetch(`http://localhost:7890/getToken?${params.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.status}`);
    }

    // Parse JSON response
    const data = await response.json();

    console.log('Token response:', data);
    return data; // { serverurl, token }

  } catch (error) {
    console.error('Error getting token:', error);
    throw error;
  }
}




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
  // room: Room;
}

export default function ConvoAI({ isOpen: controlledOpen, onToggle, agentState }: ConvoAIProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [room] = useState(() => new Room({
    adaptiveStream: true,
    dynacast: true,
  }));

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = (open: boolean) => {
    if (onToggle) {
      onToggle(open);
    } else {
      setInternalOpen(open);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const { serverurl, token } = await getToken(agentState)
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
    console.log("############# Agent State Updated in convoAI:", agentState)
    room.localParticipant.setAttributes({ 
      ...agentState, 
    });   
  }, [agentState]);

  return (
    <RoomContext.Provider value={room}>
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          left: isOpen ? '400px' : '0',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: '#1e293b',
          color: 'white',
          padding: '16px 8px',
          border: 'none',
          borderRadius: '0 8px 8px 0',
          cursor: 'pointer',
          zIndex: 2000,
          transition: 'left 0.3s ease',
          boxShadow: '2px 0 8px rgba(0, 0, 0, 0.3)',
          fontSize: '16px'
        }}
      >
        {isOpen ? '←' : '→'}
      </button>

      {/* Sidebar Panel */}
      <div
        style={{
          position: 'fixed',
          left: isOpen ? '0' : '-400px',
          top: '0',
          width: '400px',
          height: '100vh',
          backgroundColor: '#0f172a',
          boxShadow: '2px 0 12px rgba(0, 0, 0, 0.3)',
          transition: 'left 0.3s ease',
          zIndex: 1999,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #1e293b'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid #1e293b',
          backgroundColor: '#1e293b'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '700',
            color: 'white',
            letterSpacing: '-0.5px'
          }}>
            🎙️ ConvoAI
          </h2>
          <p style={{
            margin: '4px 0 0 0',
            fontSize: '12px',
            color: '#94a3b8'
          }}>
            Voice Conference
          </p>
        </div>

        {/* Connection Status */}
        {!isConnected && !isConnecting && !error && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎤</div>
            <p style={{ fontSize: '14px', margin: 0 }}>
              Click button below to join
            </p>
          </div>
        )}

        {isConnecting && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: 'white'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid rgba(255, 255, 255, 0.3)',
              borderTop: '4px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ fontSize: '14px', margin: 0 }}>Connecting...</p>
          </div>
        )}

        {error && (
          <div style={{
            padding: '20px',
            margin: '16px',
            backgroundColor: '#7f1d1d',
            borderRadius: '8px',
            color: 'white'
          }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>Connection Error</p>
            <p style={{ margin: '8px 0 0 0', fontSize: '12px', opacity: 0.9 }}>{error}</p>
          </div>
        )}

        {/* Chat Interface - Only shown when connected */}
        {isConnected && (
          <ChatContent />
        )}

        {/* Control Bar */}
        <div style={{
          padding: '16px',
          borderTop: '1px solid #1e293b',
          backgroundColor: '#1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {isConnected && (
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <TrackToggle 
                source={Track.Source.Microphone}
                style={{
                  padding: '12px 20px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  fontSize: '14px',
                  flex: 1,
                  transition: 'background-color 0.2s'
                }}
              />
            </div>
          )}
          
          {!isConnected ? (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: isConnecting ? '#64748b' : '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'background-color 0.2s'
              }}
            >
              {isConnecting ? 'Connecting...' : '🚀 Join Conference'}
            </button>
          ) : (
            <button
              onClick={handleDisconnect}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '15px',
                transition: 'background-color 0.2s'
              }}
            >
              📞 Disconnect
            </button>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid #1e293b',
          fontSize: '11px',
          color: '#64748b',
          textAlign: 'center'
        }}>
          Powered by LiveKit
        </div>
      </div>

      {/* Audio Renderer */}
      <RoomAudioRenderer />

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
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
      {/* Messages Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        backgroundColor: '#0f172a'
      }}>
        {allMessages.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: '#94a3b8',
            marginTop: '40px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
            <p style={{ fontSize: '14px', margin: 0 }}>No messages yet</p>
            <p style={{ fontSize: '12px', margin: '8px 0 0 0' }}>
              Start chatting or speaking!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {allMessages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  backgroundColor: msg.type === 'chat' ? '#1e293b' : '#1e3a5f',
                  borderRadius: '10px',
                  padding: '12px',
                  border: msg.type === 'chat' ? '1px solid #334155' : '1px solid #3b82f6',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: msg.type === 'chat' ? '#94a3b8' : '#60a5fa'
                  }}>
                    {msg.sender}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: msg.type === 'chat' ? '#94a3b8' : '#60a5fa',
                    fontWeight: '600'
                  }}>
                    {msg.type === 'chat' ? '💬' : '🎤'}
                  </span>
                </div>
                <div style={{
                  fontSize: '13px',
                  color: '#e2e8f0',
                  lineHeight: '1.5',
                  wordWrap: 'break-word'
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#64748b',
                  marginTop: '6px'
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid #1e293b',
        backgroundColor: '#1e293b'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isSending}
            style={{
              flex: 1,
              padding: '10px 14px',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              backgroundColor: '#0f172a',
              color: 'white',
              transition: 'border-color 0.2s'
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#334155'}
          />
          <button
            disabled={isSending || !message.trim()}
            onClick={handleSend}
            style={{
              padding: '10px 20px',
              backgroundColor: isSending || !message.trim() ? '#334155' : '#3b82f6',
              color: 'white',
              borderRadius: '8px',
              border: 'none',
              fontWeight: '600',
              cursor: isSending || !message.trim() ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              transition: 'background-color 0.2s'
            }}
          >
            {isSending ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </>
  );
}