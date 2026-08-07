// src/components/Layout/MainLayout.tsx

import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import DocumentViewer from '../Viewer/DocumentViewer';
import TestModal from '../TestModal/TestModal';
import { Session, UploadedFile, Test } from '../../types';
import { sessionAPI, fileAPI, authAPI } from '../../services/api';
import ConvoAI from '../ConvoAI';
import './MainLayout.css';

export interface AgentState {
  session_id: string | null;
  file_id: string | null;
  pagenumber: string | null;
  auth_token: string | null;
  user_detail: string | null;
}

const MainLayout: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [agentState, setAgentState] = useState<AgentState>({
    session_id: null,
    file_id: null,
    pagenumber: null,
    auth_token: null,
    user_detail: null
  });

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    const updateAgentState = async () => {
      if (activeSessionId) {
        loadSessionFiles(activeSessionId);
        const token = authAPI.getToken();
        const user = await authAPI.getUserDetails();
        setAgentState({
          session_id: activeSessionId,
          file_id: null,
          pagenumber: null,
          auth_token: token,
          user_detail: JSON.stringify(user),
        });
      } else {
        setFiles([]);
        setSelectedFileId(null);
      }
    };
    
    updateAgentState();
  }, [activeSessionId]);

  useEffect(() => {
    const selectedFile = files.find((f) => f.id === selectedFileId) || null;
    setAgentState(prev => ({
      ...prev,
      file_id: selectedFile ? selectedFile.s3Key : null,
    }));
  }, [selectedFileId, files]);

  const loadSessions = async () => {
    try {
      const data = await sessionAPI.getSessions();
      setSessions(Array.isArray(data) ? data : []);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionFiles = async (sessionId: string) => {
    try {
      const data = await fileAPI.getSessionFiles(sessionId);
      
      const filesWithUrls = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (file) => {
          try {
            const tempUrl = await fileAPI.getPresignedUrl(file.s3Key);
            return { ...file, temp_url: tempUrl };
          } catch (error) {
            console.error(`Failed to get presigned URL for file ${file.id}:`, error);
            return file;
          }
        })
      );
      
      setFiles(filesWithUrls);
      if (filesWithUrls.length > 0 && !selectedFileId) {
        setSelectedFileId(filesWithUrls[0].id);
      } else if (filesWithUrls.length === 0) {
        setSelectedFileId(null);
      }
    } catch (error) {
      console.error('Failed to load files:', error);
      setFiles([]);
    }
  };

  const handleCreateSession = async () => {
    try {
      const name = `Session ${sessions.length + 1}`;
      const newSession = await sessionAPI.createSession(name);
      setSessions([newSession, ...sessions]);
      setActiveSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to create session:', error);
      alert('Failed to create session');
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      await sessionAPI.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId);
        setActiveSessionId(remainingSessions.length > 0 ? remainingSessions[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session');
    }
  };

  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      const updatedSession = await sessionAPI.renameSession(sessionId, newName);
      setSessions(sessions.map((s) => (s.id === sessionId ? updatedSession : s)));
    } catch (error) {
      console.error('Failed to rename session:', error);
      alert('Failed to rename session');
    }
  };

  const handleUploadFile = async (file: File) => {
    if (!activeSessionId) return;

    try {
      const uploadedFile = await fileAPI.uploadFile(activeSessionId, file);
      const tempUrl = await fileAPI.getPresignedUrl(uploadedFile.s3Key);
      uploadedFile.temp_url = tempUrl;
      setFiles([uploadedFile, ...files]);
      setSelectedFileId(uploadedFile.id);
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  };

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      await fileAPI.deleteFile(fileId);
      setFiles(files.filter((f) => f.id !== fileId));
      if (selectedFileId === fileId) {
        const remainingFiles = files.filter((f) => f.id !== fileId);
        setSelectedFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file');
    }
  };

  const handleSelectTest = (test: Test) => {
    setSelectedTest(test);
  };

  const handleCloseTestModal = () => {
    setSelectedTest(null);
  };

  const handleToggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;
  const activeSession = sessions.find((s) => s.id === activeSessionId);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="main-layout">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        files={files}
        onSelectSession={handleSelectSession}
        onCreateSession={handleCreateSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onSelectFile={handleSelectFile}
        onDeleteFile={handleDeleteFile}
        onUploadFile={handleUploadFile}
        isCollapsed={leftSidebarCollapsed}
        onToggleCollapse={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        onSelectTest={handleSelectTest}
        selectedFileId={selectedFileId}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <DocumentViewer 
        file={selectedFile} 
        setAgentState={setAgentState}
        sessionName={activeSession?.name || ''}
        isFullscreen={isFullscreen}
        onToggleFullscreen={setIsFullscreen}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      <ConvoAI 
        isOpen={!rightSidebarCollapsed} 
        onToggle={() => setRightSidebarCollapsed(!rightSidebarCollapsed)} 
        agentState={agentState} 
      />

      {selectedTest && (
        <TestModal test={selectedTest} onClose={handleCloseTestModal} />
      )}
    </div>
  );
};

export default MainLayout;