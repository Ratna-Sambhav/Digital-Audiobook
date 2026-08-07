// src/components/Viewer/DocumentViewer.tsx

import React from 'react';
import { UploadedFile } from '../../types';
import PDFViewer from './PDFViewer';
import ImageViewer from './ImageViewer';
import { FileText } from 'lucide-react';
import { AgentState } from '../Layout/MainLayout'

interface DocumentViewerProps {
  file: UploadedFile | null;
  setAgentState: React.Dispatch<React.SetStateAction<AgentState>>;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ file, setAgentState }) => {

  if (!file) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No Document Selected
          </h3>
          <p className="text-gray-500">
            Upload a file or select from your library to view
          </p>
        </div>
      </div>
    );
  }

  const isPDF = file.fileType === 'application/pdf';
  const isImage = file.fileType.startsWith('image/');

  return (
    <div className="flex-1 flex flex-col">
      {isPDF && <PDFViewer fileUrl={file.temp_url} fileName={file.fileName} setAgentState={setAgentState} />}
      {isImage && <ImageViewer fileUrl={file.temp_url} fileName={file.fileName} />}
      {!isPDF && !isImage && (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <p className="text-red-600">Unsupported file type</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;