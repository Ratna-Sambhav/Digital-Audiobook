// src/components/Sidebar/SessionList.tsx

import React, { useState } from 'react';
import { Session } from '../../types';
import { Trash2, Edit2, Check, X } from 'lucide-react';

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startEdit = (session: Session) => {
    setEditingId(session.id);
    setEditName(session.name);
  };

  const saveEdit = (sessionId: string) => {
    if (editName.trim()) {
      onRenameSession(sessionId, editName.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {sessions.length === 0 ? (
        <div className="p-4 text-center text-gray-500 text-sm">
          No sessions yet. Create one to get started!
        </div>
      ) : (
        <div className="space-y-1">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group relative px-3 py-2 mx-2 rounded-lg cursor-pointer transition-colors ${
                activeSessionId === session.id
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'hover:bg-gray-100 text-gray-700'
              }`}
              onClick={() => !editingId && onSelectSession(session.id)}
            >
              {editingId === session.id ? (
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(session.id);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                  <button
                    onClick={() => saveEdit(session.id)}
                    className="p-1 hover:bg-green-100 rounded"
                  >
                    <Check className="w-4 h-4 text-green-600" />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">
                      {session.name}
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => startEdit(session)}
                        className="p-1 hover:bg-gray-200 rounded"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteSession(session.id)}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SessionList;