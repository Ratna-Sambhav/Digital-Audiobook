// src/components/Viewer/DocumentViewer.tsx

import React from 'react';
import { UploadedFile } from '../../types';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';
// import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import { FileText, Moon, Sun } from 'lucide-react';
import { AgentState } from '../Layout/MainLayout';
import './DocumentViewer.css';

interface DocumentViewerProps {
  file: UploadedFile | null;
  setAgentState: React.Dispatch<React.SetStateAction<AgentState>>;
  sessionName: string;
  isFullscreen: boolean;
  onToggleFullscreen: (fullscreen: boolean) => void;
  isDarkMode: boolean;
  onToggleDarkMode?: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ 
  file, 
  setAgentState, 
  sessionName,
  isFullscreen,
  onToggleFullscreen,
  isDarkMode,
  onToggleDarkMode
}) => {
  if (!file) {
    return (
      <div className="document-viewer-container">
        <div className={`top-navbar ${isFullscreen ? 'hidden' : ''}`}>
          <div className="navbar-secondary">
            <div className="navbar-left">
              <div className="session-name-display">{sessionName || 'No Session Selected'}</div>
              <div className="file-name-display">{'No File Selected'}</div>
            </div>
            {onToggleDarkMode && (
              <button 
                onClick={onToggleDarkMode}
                className="dark-mode-toggle"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun className="toggle-icon" /> : <Moon className="toggle-icon" />}
              </button>
            )}
          </div>
        </div>
        
        <div className={`document-viewer ${isDarkMode ? 'dark-mode' : ''}`}>
          <div className="empty-state">
            <FileText className="empty-icon" />
            <h3 className="empty-title">No Document Selected</h3>
            <p className="empty-text">Upload a file or select from your library to view</p>
          </div>
        </div>
      </div>
    );
  }

  const isPDF = file.fileType === 'application/pdf';
  const isImage = file.fileType.startsWith('image/');

  return (
    <div className="document-viewer-container">
      <div className={`top-navbar ${isFullscreen ? 'hidden' : ''}`}>
        <div className="navbar-secondary">
          <div className="navbar-left">
            <div className="session-name-display">{sessionName}</div>
            <div className="file-name-display">{file.fileName}</div>
          </div>
          {onToggleDarkMode && (
            <button 
              onClick={onToggleDarkMode}
              className="dark-mode-toggle"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="toggle-icon" /> : <Moon className="toggle-icon" />}
            </button>
          )}
        </div>
      </div>

      <div className={`document-viewer ${isFullscreen ? 'fullscreen' : ''} ${isDarkMode ? 'dark-mode' : ''}`}>
        {isPDF && (
          <PDFViewer 
            fileUrl={file.temp_url}
            setAgentState={setAgentState}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
            isDarkMode={isDarkMode}
          />
        )}
        {isImage && (
          <ImageViewer 
            fileUrl={file.temp_url} 
            fileName={file.fileName}
            isDarkMode={isDarkMode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={onToggleFullscreen}
          />
        )}
        {!isPDF && !isImage && (
          <div className="empty-state">
            <p className="unsupported-text">Unsupported file type</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;