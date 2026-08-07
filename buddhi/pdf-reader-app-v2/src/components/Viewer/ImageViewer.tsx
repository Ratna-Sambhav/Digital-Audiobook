// src/components/Viewer/ImageViewer.tsx

import React, { useState, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw, Maximize, Minimize, Eye, EyeOff } from 'lucide-react';
import './ImageViewer.css';

interface ImageViewerProps {
  fileUrl: string;
  fileName: string;
  isDarkMode: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: (fullscreen: boolean) => void;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ 
  fileUrl, 
  fileName,
  isDarkMode,
  isFullscreen,
  onToggleFullscreen
}) => {
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.3));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
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

  return (
    <div className={`image-viewer ${isDarkMode ? 'dark-mode' : ''}`}>
      <div className="image-content">
        <div className="image-display">
          <img
            src={fileUrl}
            alt={fileName}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-in-out',
            }}
            className="image-element"
          />
        </div>
      </div>

      <button 
        className="controls-toggle-btn"
        onClick={() => setShowControls(!showControls)}
        title={showControls ? "Hide Controls" : "Show Controls"}
      >
        {showControls ? <EyeOff className="btn-icon" /> : <Eye className="btn-icon" />}
      </button>

      <div className={`image-controls ${showControls ? 'visible' : 'hidden'}`}>
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
            onClick={rotate}
            className="control-btn rotate-btn"
            title="Rotate"
          >
            <RotateCw className="btn-icon" />
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
    </div>
  );
};

export default ImageViewer;