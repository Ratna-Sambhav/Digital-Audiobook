// src/components/Layout/MainLayout.tsx

import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import DocumentViewer from '../Viewer/DocumentViewer';
import FileUpload from '../Upload/FileUpload';
import { Session, UploadedFile } from '../../types';
import { sessionAPI, fileAPI, authAPI } from '../../services/api';
import ConvoAI from '../ConvoAI';


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
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [convoAIOpen, setConvoAIOpen] = useState(false); // NEW: ConvoAI state
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
    loadSessions();
  }, []);

  useEffect(() => {
    const updateAgentState = async () => { // Made async
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
        console.log("############# Agent State Updated:", agentState);
      } else {
        setFiles([]);
        setSelectedFileId(null);
      }
    };
    
    updateAgentState(); // Call the async function
  }, [activeSessionId]);

  useEffect(() => {
    const selectedFile = files.find((f) => f.id === selectedFileId) || null;
    setAgentState(prev => ({
      ...prev,
      file_id: selectedFile ? selectedFile.s3Key:null,
    }));
    console.log("############# Agent State Updated:", agentState)
  }, [selectedFileId])

  const loadSessions = async () => {
    try {
      const data = await sessionAPI.getSessions();
      setSessions(data);
      if (data.length > 0 && !activeSessionId) {
        setActiveSessionId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionFiles = async (sessionId: string) => {
    try {
      const data = await fileAPI.getSessionFiles(sessionId);
      
      const filesWithUrls = await Promise.all(
        data.map(async (file) => {
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

  const selectedFile = files.find((f) => f.id === selectedFileId) || null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-14 w-14 border-4 border-slate-200 border-t-indigo-600 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* NEW: ConvoAI Sidebar */}
      <ConvoAI isOpen={convoAIOpen} onToggle={setConvoAIOpen} agentState={agentState} /> 
      {/* room={room} /> */}
      
      {/* NEW: ConvoAI Toggle Button (when closed) */}
      {!convoAIOpen && (
        <button
          onClick={() => setConvoAIOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          title="Open ConvoAI"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
            />
          </svg>
        </button>
      )}

      <div 
        className="flex w-full my-4 gap-4 rounded-2xl overflow-hidden shadow-xl"
        style={{
          marginLeft: convoAIOpen ? '420px' : '16px', // Adjust margin when ConvoAI is open
          marginRight: '16px',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onCreateSession={handleCreateSession}
          onDeleteSession={handleDeleteSession}
          onRenameSession={handleRenameSession}
          isCollapsed={leftSidebarCollapsed}
          onToggleCollapse={() => setLeftSidebarCollapsed(!leftSidebarCollapsed)}
        />
        <DocumentViewer file={selectedFile} setAgentState={setAgentState} />
        <FileUpload
          sessionId={activeSessionId}
          onUpload={handleUploadFile}
          files={files}
          selectedFileId={selectedFileId}
          onSelectFile={handleSelectFile}
          onDeleteFile={handleDeleteFile}
          isCollapsed={rightSidebarCollapsed}
          onToggleCollapse={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
        />
      </div>
    </div>
  );
};

export default MainLayout;