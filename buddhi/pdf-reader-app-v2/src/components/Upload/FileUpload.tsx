// src/components/Upload/FileUpload.tsx

import React, { useState } from 'react';
import { Upload, File, X, ChevronLeft } from 'lucide-react';
import { UploadedFile } from '../../types';

interface FileUploadProps {
  sessionId: string | null;
  onUpload: (file: File) => Promise<void>;
  files: UploadedFile[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({
  sessionId,
  onUpload,
  files,
  selectedFileId,
  onSelectFile,
  onDeleteFile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (!sessionId) {
      alert('Please select a session first');
      return;
    }

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await handleFileUpload(droppedFiles[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!sessionId) {
      alert('Please select a session first');
      return;
    }

    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      await handleFileUpload(selectedFiles[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      alert('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center p-2">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
        >
          <ChevronLeft className="w-4 h-4 rotate-180" style={{ writingMode: 'horizontal-tb' }} />
          <span>Files</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">Files</h2>
          <button
            onClick={onToggleCollapse}
            className="p-2.5 hover:bg-slate-100 rounded-lg transition-colors"
            title="Collapse files panel"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Upload Area */}
      <div className="px-6 py-5">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50 shadow-inner'
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
          } ${!sessionId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4 ${
            isDragging ? 'bg-emerald-100' : 'bg-slate-100'
          }`}>
            <Upload className={`w-7 h-7 ${isDragging ? 'text-emerald-600' : 'text-slate-500'}`} />
          </div>
          <p className="text-sm font-medium text-slate-700 mb-2">
            Drag & drop files here
          </p>
          <p className="text-xs text-slate-500 mb-3">
            PDF, PNG, JPG up to 10MB
          </p>
          <label className={`inline-block px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors ${
            !sessionId ? 'pointer-events-none' : 'cursor-pointer'
          }`}>
            Browse Files
            <input
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              disabled={!sessionId || uploading}
              accept=".pdf,.png,.jpg,.jpeg,.gif"
            />
          </label>
          {uploading && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-600 mx-auto"></div>
            </div>
          )}
        </div>
      </div>

      {/* Files List */}
      <div className="flex-1 overflow-y-auto px-6 pb-5">
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Recent Files ({files.length})
          </h3>
        </div>
        {files.length === 0 ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-4">
              <File className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500 font-medium">No files uploaded yet</p>
            <p className="text-xs text-slate-400 mt-1">Upload your first file to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className={`group p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                  selectedFileId === file.id
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                onClick={() => onSelectFile(file.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedFileId === file.id ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    <File className={`w-5 h-5 ${
                      selectedFileId === file.id ? 'text-emerald-600' : 'text-slate-500'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate mb-1">
                      {file.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(file.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 rounded-lg transition-all"
                    title="Delete"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;