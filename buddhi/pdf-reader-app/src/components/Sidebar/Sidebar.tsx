// src/components/Sidebar/Sidebar.tsx

import React from 'react';
import { Session } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import SessionList from './SessionList';
import { Plus, LogOut, User, FileText, ChevronRight } from 'lucide-react';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  isCollapsed,
  onToggleCollapse,
}) => {
  const { user, logout } = useAuth();

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center p-2">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <ChevronRight className="w-4 h-4 rotate-180" style={{ writingMode: 'horizontal-tb' }} />
          <span>Sessions</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-b from-slate-50 to-white border-r border-slate-200 flex flex-col h-full shadow-sm">
      {/* Header with Logo */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-md">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl text-slate-800">DocView</span>
              <p className="text-xs text-slate-500">Document Manager</p>
            </div>
          </div>
          <button
            onClick={onToggleCollapse}
            className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors"
            title="Collapse sidebar"
          >
            <ChevronRight className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* New Session Button */}
        <button
          onClick={onCreateSession}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
        >
          <Plus className="w-5 h-5" />
          New Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-hidden px-4 py-4">
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={onSelectSession}
          onDeleteSession={onDeleteSession}
          onRenameSession={onRenameSession}
        />
      </div>

      {/* User Profile */}
      <div className="px-6 py-5 border-t border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name}
                className="w-11 h-11 rounded-xl shadow-sm"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center shadow-sm">
                <User className="w-6 h-6 text-indigo-600" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {user?.name}
              </p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2.5 hover:bg-red-50 rounded-lg transition-colors group"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-slate-600 group-hover:text-red-600 transition-colors" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;