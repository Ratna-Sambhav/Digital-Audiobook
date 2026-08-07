// src/components/Sidebar/Sidebar.tsx

import React, { useState } from 'react';
import { Session, Test, UploadedFile } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import SessionList from './SessionList';
import UploadModal from '../Upload/UploadModal';
import { Plus, LogOut, User, ChevronLeft } from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  files: UploadedFile[];
  onSelectSession: (sessionId: string) => void;
  onCreateSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onSelectFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onUploadFile: (file: File) => Promise<void>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectTest: (test: Test) => void;
  selectedFileId: string | null;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  files,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
  onRenameSession,
  onSelectFile,
  onDeleteFile,
  onUploadFile,
  isCollapsed,
  onToggleCollapse,
  onSelectTest,
  selectedFileId,
}) => {
  const { user, logout } = useAuth();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  const handleUploadClick = () => {
    if (!activeSessionId) {
      alert('Please select or create a session first');
      return;
    }
    setIsUploadModalOpen(true);
  };

  if (isCollapsed) {
    return (
      <div className="sidebar-collapsed">
        <button onClick={onToggleCollapse} className="sidebar-logo-btn" title="Open Sidebar">
          <img src="swan.png" alt="Logo" className="sidebar-logo-image" />
        </button>
        
        <div className="sidebar-user-mini">
          {user?.picture ? (
            <img 
              src={user.picture} 
              alt={user.name} 
              className="user-mini-avatar" 
              title={user.name}
            />
          ) : (
            <div className="user-mini-placeholder" title={user?.name}>
              <User className="user-mini-icon" />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar left-sidebar">
        <div className="sidebar-header">
          <div className="logo-section">
            <div className="logo-content">
              <img src="swan.png" alt="Logo" className="logo-image" />
              <div className="logo-text">
                <span className="logo-title">Smriti</span>
                <p className="logo-subtitle">Read. Understand. Evolve.</p>
              </div>
            </div>
            <button onClick={onToggleCollapse} className="collapse-btn" title="Collapse Sidebar">
              <ChevronLeft className="collapse-icon" />
            </button>
          </div>

          <button onClick={onCreateSession} className="new-session-btn">
            <Plus className="btn-icon" />
            New Session
          </button>
        </div>

        <div className="sessions-list-container">
          <SessionList
            sessions={sessions}
            activeSessionId={activeSessionId}
            files={files}
            onSelectSession={onSelectSession}
            onDeleteSession={onDeleteSession}
            onRenameSession={onRenameSession}
            onSelectTest={onSelectTest}
            onSelectFile={onSelectFile}
            onDeleteFile={onDeleteFile}
            selectedFileId={selectedFileId}
          />
        </div>

        <div className="upload-section">
          <button className="upload-label" onClick={handleUploadClick}>
            <span className="upload-icon">📤</span>
            Upload File
          </button>
        </div>

        <div className="user-section">
          <div className="user-info">
            {user?.picture ? (
              <img src={user.picture} alt={user.name} className="user-avatar-img" />
            ) : (
              <div className="user-avatar-placeholder">
                <User className="user-icon" />
              </div>
            )}
            <div className="user-details">
              <p className="user-name">{user?.name}</p>
              <p className="user-email">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout} className="logout-btn" title="Logout">
            <LogOut className="logout-icon" />
          </button>
        </div>
      </div>

      <UploadModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={onUploadFile}
      />
    </>
  );
};

export default Sidebar;