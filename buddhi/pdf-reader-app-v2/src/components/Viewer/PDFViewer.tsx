// src/components/Viewer/PDFViewer.tsx

import React, { useEffect, useState, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Minimize, Eye, EyeOff } from 'lucide-react';
import { AgentState } from '../Layout/MainLayout';
import './PDFViewer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  setAgentState: React.Dispatch<React.SetStateAction<AgentState>>;
  isFullscreen: boolean;
  onToggleFullscreen: (fullscreen: boolean) => void;
  isDarkMode: boolean;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ 
  fileUrl,
  setAgentState,
  isFullscreen,
  onToggleFullscreen,
  isDarkMode
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [pageInput, setPageInput] = useState<string>('1');
  const [showControls, setShowControls] = useState<boolean>(true);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<number>(0);

  useEffect(() => {
    setNumPages(0);
    setPageNumber(1);
    setPageInput('1');
    setError(null);
    setKey(prev => prev + 1);
  }, [fileUrl]);

  useEffect(() => {
    setAgentState(prev => ({
      ...prev,
      pagenumber: String(pageNumber),
    }));
  }, [pageNumber, setAgentState]);

  useEffect(() => {
    const updateWidth = () => {
      const container = document.querySelector('.pdf-content');
      if (container) {
        setContainerWidth(container.clientWidth - 40);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    console.log('PDF loaded successfully:', numPages, 'pages');
    setNumPages(numPages);
    setPageNumber(1);
    setPageInput('1');
    setError(null);
  }, []);

  const onDocumentLoadError = useCallback((error: Error) => {
    console.error('Error loading PDF:', error);
    setError('Failed to load PDF. The file may be corrupted or incompatible.');
    setNumPages(0);
  }, []);

  const onPageLoadError = useCallback((error: Error) => {
    console.error('Error loading page:', error);
  }, []);

  const goToPrevPage = () => {
    const newPage = Math.max(pageNumber - 1, 1);
    setPageNumber(newPage);
    setPageInput(String(newPage));
  };

  const goToNextPage = () => {
    const newPage = Math.min(pageNumber + 1, numPages);
    setPageNumber(newPage);
    setPageInput(String(newPage));
  };

  const goToPage = (page: number) => {
    const newPage = Math.max(1, Math.min(page, numPages));
    setPageNumber(newPage);
    setPageInput(String(newPage));
  };

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInput(e.target.value);
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(pageInput);
    if (!isNaN(page)) {
      goToPage(page);
    } else {
      setPageInput(String(pageNumber));
    }
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      }
      onToggleFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
      onToggleFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        onToggleFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [onToggleFullscreen]);

  if (error) {
    return (
      <div className={`pdf-viewer ${isDarkMode ? 'dark-mode' : ''}`}>
        <div className="pdf-content">
          <div className="pdf-error">
            <p className="error-text">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setKey(prev => prev + 1);
              }}
              className="retry-btn"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`pdf-viewer ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="pdf-content">
        <div className="pdf-scroll-container">
          <Document
            key={`document_${key}`}
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="pdf-loading">
                <div className="loading-spinner"></div>
                <p className="loading-text">Loading PDF...</p>
              </div>
            }
            error={
              <div className="pdf-error">
                <p className="error-text">Failed to load PDF. Please try again.</p>
              </div>
            }
          >
            <Page
              key={`page_${pageNumber}_${key}`}
              pageNumber={pageNumber}
              scale={scale}
              width={Math.min(containerWidth, 1200)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="pdf-page"
              loading={
                <div className="pdf-loading">
                  <div className="loading-spinner"></div>
                  <p className="loading-text">Rendering page...</p>
                </div>
              }
              onLoadError={onPageLoadError}
            />
          </Document>
        </div>
      </div>

      {numPages > 0 && (
        <>
          <button 
            className="controls-toggle-btn"
            onClick={() => setShowControls(!showControls)}
            title={showControls ? "Hide Controls" : "Show Controls"}
          >
            {showControls ? <EyeOff className="btn-icon" /> : <Eye className="btn-icon" />}
          </button>

          <div className={`pdf-controls ${showControls ? 'visible' : 'hidden'}`}>
            <div className="control-group">
              <button 
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="control-btn nav-btn"
                title="Previous Page"
              >
                <ChevronLeft className="btn-icon" />
              </button>
              
              <div className="page-info">
                <span className="page-current">{pageNumber}</span>
                <span className="page-separator">/</span>
                <span className="page-total">{numPages}</span>
              </div>
              
              <button 
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="control-btn nav-btn"
                title="Next Page"
              >
                <ChevronRight className="btn-icon" />
              </button>
            </div>

            <div className="control-group">
              <form onSubmit={handlePageInputSubmit} className="page-input-form">
                <label htmlFor="page-input" className="page-label">Go to page:</label>
                <input
                  id="page-input"
                  type="number"
                  className="page-input"
                  value={pageInput}
                  onChange={handlePageInputChange}
                  min="1"
                  max={numPages}
                />
                <button type="submit" className="go-btn">Go</button>
              </form>
            </div>

            <div className="control-group">
              <button 
                onClick={zoomOut}
                className="control-btn zoom-btn"
                title="Zoom Out"
              >
                <ZoomOut className="btn-icon" />
              </button>
              
              <div className="zoom-info">
                {Math.round(scale * 100)}%
              </div>
              
              <button 
                onClick={zoomIn}
                className="control-btn zoom-btn"
                title="Zoom In"
              >
                <ZoomIn className="btn-icon" />
              </button>
            </div>

            <div className="control-group">
              <button 
                onClick={toggleFullscreen}
                className="control-btn fullscreen-btn"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize className="btn-icon" />
                ) : (
                  <Maximize className="btn-icon" />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PDFViewer;