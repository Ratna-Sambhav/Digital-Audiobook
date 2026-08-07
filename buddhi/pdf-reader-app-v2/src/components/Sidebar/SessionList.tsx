// src/components/Sidebar/SessionList.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Session, Test, UploadedFile } from '../../types';
import { Trash2, Edit2, Check, X, FileText, ClipboardList, MoreVertical, RefreshCw } from 'lucide-react';
import { testAPI } from '../../services/api';
import './SessionList.css';

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string | null;
  files: UploadedFile[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onSelectTest: (test: Test) => void;
  onSelectFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  selectedFileId: string | null;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  files,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onSelectTest,
  onSelectFile,
  onDeleteFile,
  selectedFileId,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [tests, setTests] = useState<Record<string, Test[]>>({});
  const [loadingTests, setLoadingTests] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSessionId) {
      loadTests(activeSessionId);
    }
  }, [activeSessionId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadTests = async (sessionId: string) => {
    try {
      setLoadingTests(sessionId);
      const sessionTests = await testAPI.getSessionTests(sessionId);
      setTests(prev => ({ ...prev, [sessionId]: sessionTests }));
    } catch (error) {
      console.error('Failed to load tests:', error);
    } finally {
      setLoadingTests(null);
    }
  };

  const handleMenuToggle = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === sessionId ? null : sessionId);
  };

  const handleRefresh = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    loadTests(sessionId);
    setOpenMenuId(null);
  };

  const handleRename = (session: Session, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditName(session.name);
    setOpenMenuId(null);
  };

  const handleDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteSession(sessionId);
    setOpenMenuId(null);
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

  const toggleSection = (sessionId: string, section: string) => {
    const key = `${sessionId}-${section}`;
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isSectionExpanded = (sessionId: string, section: string) => {
    return expandedSections[`${sessionId}-${section}`] || false;
  };

  const getFilesByType = (type: 'files' | 'notes') => {
    if (type === 'notes') {
      return files.filter(f => f.fileName.toLowerCase().includes('note'));
    }
    return files.filter(f => !f.fileName.toLowerCase().includes('note'));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="session-list">
      {sessions.length === 0 ? (
        <div className="empty-sessions">
          No sessions yet. Create one to get started!
        </div>
      ) : (
        <div className="sessions">
          {sessions.map((session) => {
            const regularFiles = getFilesByType('files');
            const noteFiles = getFilesByType('notes');
            const sessionTests = tests[session.id] || [];
            
            return (
              <div key={session.id} className="session-item">
                <div
                  className={`session-header ${activeSessionId === session.id ? 'active' : ''}`}
                  onClick={() => !editingId && onSelectSession(session.id)}
                >
                  {editingId === session.id ? (
                    <div className="session-edit" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="session-edit-input"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEdit(session.id);
                          if (e.key === 'Escape') cancelEdit();
                        }}
                      />
                      <button onClick={() => saveEdit(session.id)} className="edit-btn save">
                        <Check className="edit-icon" />
                      </button>
                      <button onClick={cancelEdit} className="edit-btn cancel">
                        <X className="edit-icon" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="session-info">
                        <div className="session-icon-title">
                          <FileText className="session-icon" />
                          <span className="session-title">{session.name}</span>
                        </div>
                        <div className="session-date">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button 
                        className="session-menu-btn"
                        onClick={(e) => handleMenuToggle(session.id, e)}
                      >
                        <MoreVertical className="session-menu-icon" />
                      </button>
                      {openMenuId === session.id && (
                        <div className="session-dropdown" ref={menuRef}>
                          <button 
                            className="dropdown-item"
                            onClick={(e) => handleRename(session, e)}
                          >
                            <Edit2 className="dropdown-icon" />
                            Rename
                          </button>
                          <button 
                            className="dropdown-item"
                            onClick={(e) => handleRefresh(session.id, e)}
                          >
                            <RefreshCw className="dropdown-icon" />
                            Refresh
                          </button>
                          <button 
                            className="dropdown-item danger"
                            onClick={(e) => handleDelete(session.id, e)}
                          >
                            <Trash2 className="dropdown-icon" />
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {activeSessionId === session.id && (
                  <div className="session-sections">
                    {/* Files Section */}
                    <div className="section-item">
                      <div 
                        className="section-header"
                        onClick={() => toggleSection(session.id, 'files')}
                      >
                        <span className={`section-arrow ${isSectionExpanded(session.id, 'files') ? 'expanded' : ''}`}>
                          ▶
                        </span>
                        <span className="section-title">📄 Files</span>
                        <span className="section-count">{regularFiles.length}</span>
                      </div>
                      <div className={`section-content ${isSectionExpanded(session.id, 'files') ? 'expanded' : ''}`}>
                        {regularFiles.length === 0 ? (
                          <div className="section-empty">No files yet. Upload PDFs and Images.</div>
                        ) : (
                          regularFiles.map(file => (
                            <div 
                              key={file.id}
                              className={`file-item ${selectedFileId === file.id ? 'active' : ''}`}
                            >
                              <div className="file-content" onClick={() => onSelectFile(file.id)}>
                                <div className="file-name">{file.fileName}</div>
                                <div className="file-size">{formatFileSize(file.size)}</div>
                              </div>
                              <button 
                                className="file-delete-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteFile(file.id);
                                }}
                                title="Delete file"
                              >
                                <Trash2 className="delete-icon" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Quizzes Section */}
                    <div className="section-item">
                      <div 
                        className="section-header"
                        onClick={() => toggleSection(session.id, 'quizzes')}
                      >
                        <span className={`section-arrow ${isSectionExpanded(session.id, 'quizzes') ? 'expanded' : ''}`}>
                          ▶
                        </span>
                        <span className="section-title">📝 Quizzes</span>
                        <span className="section-count">{sessionTests.length}</span>
                      </div>
                      <div className={`section-content ${isSectionExpanded(session.id, 'quizzes') ? 'expanded' : ''}`}>
                        {loadingTests === session.id ? (
                          <div className="section-empty">Loading...</div>
                        ) : sessionTests.length === 0 ? (
                          <div className="section-empty">No quizzes yet. Ask Buddhi AI to generate quizzes for you and then refresh this session.</div>
                        ) : (
                          sessionTests.map(test => (
                            <div 
                              key={test.id}
                              className="test-item"
                              onClick={() => onSelectTest(test)}
                            >
                              <ClipboardList className="test-icon" />
                              <div className="test-info">
                                <div className="test-name">{test.test_name}</div>
                                <div className="test-questions">{test.num_questions} questions</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div className="section-item">
                      <div 
                        className="section-header"
                        onClick={() => toggleSection(session.id, 'notes')}
                      >
                        <span className={`section-arrow ${isSectionExpanded(session.id, 'notes') ? 'expanded' : ''}`}>
                          ▶
                        </span>
                        <span className="section-title">📓 Notes</span>
                        <span className="section-count">{noteFiles.length}</span>
                      </div>
                      <div className={`section-content ${isSectionExpanded(session.id, 'notes') ? 'expanded' : ''}`}>
                        {noteFiles.length === 0 ? (
                          <div className="section-empty">No notes yet. Ask Buddhi AI to generate notes of whichever pages you like.</div>
                        ) : (
                          noteFiles.map(file => (
                            <div 
                              key={file.id}
                              className={`file-item ${selectedFileId === file.id ? 'active' : ''}`}
                              onClick={() => onSelectFile(file.id)}
                            >
                              <div className="file-name">{file.fileName}</div>
                              <div className="file-size">{formatFileSize(file.size)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionList;