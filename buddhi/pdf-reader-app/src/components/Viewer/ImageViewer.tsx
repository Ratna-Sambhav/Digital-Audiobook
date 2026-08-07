// src/components/Viewer/ImageViewer.tsx

import React, { useState } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface ImageViewerProps {
  fileUrl: string;
  fileName: string;
}

const ImageViewer: React.FC<ImageViewerProps> = ({ fileUrl, fileName }) => {
  const [scale, setScale] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.3));
  };

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-800 truncate max-w-md">
            {fileName}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-5 h-5 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Rotate */}
          <button
            onClick={rotate}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Rotate"
          >
            <RotateCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Image Display */}
      <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
        <div className="bg-white shadow-lg p-4">
          <img
            src={fileUrl}
            alt={fileName}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease-in-out',
              maxWidth: '100%',
              height: 'auto',
            }}
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
};

export default ImageViewer;