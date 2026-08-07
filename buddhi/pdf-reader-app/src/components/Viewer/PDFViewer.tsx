// src/components/Viewer/PDFViewer.tsx

import React, { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';
import { AgentState } from '../Layout/MainLayout'
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface PDFViewerProps {
  fileUrl: string;
  fileName: string;
  setAgentState: React.Dispatch<React.SetStateAction<AgentState>>;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ fileUrl, fileName, setAgentState }) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  useEffect(() => {
    setAgentState(prev => ({
      ...prev,
      pagenumber: String(pageNumber),
    }));
  }, [pageNumber])

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const goToPrevPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages));
  };

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 3.0));
  };

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
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

          {/* Page Navigation */}
          {numPages > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={pageNumber <= 1}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600">
                Page {pageNumber} of {numPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={pageNumber >= numPages}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PDF Display */}
      <div className="flex-1 overflow-auto p-4 flex justify-center">
        <div className="bg-white shadow-lg">
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
              </div>
            }
            error={
              <div className="p-8 text-center text-red-600">
                Failed to load PDF. Please try again.
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
            />
          </Document>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;