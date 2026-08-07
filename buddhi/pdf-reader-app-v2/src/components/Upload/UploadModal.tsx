// src/components/Upload/UploadModal.tsx

import React, { useState, useRef } from 'react';
import { X, Search, Download, Calendar } from 'lucide-react';
import './UploadModal.css';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
}

interface ArxivPaper {
  title: string;
  summary: string;
  published: string;
  link: string;
  authors: string[];
}

interface ArxivSearchResponse {
  count: number;
  results: ArxivPaper[];
}

const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [showResearchSearch, setShowResearchSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [endMonth, setEndMonth] = useState('');
  const [searchResults, setSearchResults] = useState<ArxivPaper[]>([]);
  const [selectedPapers, setSelectedPapers] = useState<Set<string>>(new Set());
  const [searching, setSearching] = useState(false);
  const [downloadingPapers, setDownloadingPapers] = useState(false);
  
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadingType(type);

    try {
      await onUpload(file);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
      setUploadingType(null);
      e.target.value = '';
    }
  };

  const handlePdfClick = () => {
    if (!uploading) {
      pdfInputRef.current?.click();
    }
  };

  const handleImageClick = () => {
    if (!uploading) {
      imageInputRef.current?.click();
    }
  };

  const handleResearchClick = () => {
    setShowResearchSearch(true);
    setSearchResults([]);
    setSelectedPapers(new Set());
    setSearchQuery('');
    setStartMonth('');
    setEndMonth('');
  };

  const handleBackToOptions = () => {
    setShowResearchSearch(false);
    setSearchResults([]);
    setSelectedPapers(new Set());
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      alert('Please enter a search query');
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams({
        title: searchQuery,
        number: '20'
      });
      
      if (startMonth) params.append('start_month', startMonth);
      if (endMonth) params.append('end_month', endMonth);

      const response = await fetch(
        `https://www.ratna-sambhav.online/api/rpdf/arxiv/search?${params}`
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: ArxivSearchResponse = await response.json();
      setSearchResults(data.results || []);
      
      if (data.results.length === 0) {
        alert('No papers found. Try adjusting your search criteria.');
      }
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search papers. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const togglePaperSelection = (link: string) => {
    const newSelected = new Set(selectedPapers);
    if (newSelected.has(link)) {
      newSelected.delete(link);
    } else {
      newSelected.add(link);
    }
    setSelectedPapers(newSelected);
  };

  const downloadAndUploadPapers = async () => {
    if (selectedPapers.size === 0) {
      alert('Please select at least one paper');
      return;
    }

    setDownloadingPapers(true);
    let successCount = 0;
    let failCount = 0;

    for (const link of Array.from(selectedPapers)) {
      try {
        // Convert arxiv.org link to PDF link
        const pdfLink = link.replace('arxiv.org/abs/', 'arxiv.org/pdf/') + '.pdf';
        
        // Fetch the PDF
        const response = await fetch(pdfLink);
        if (!response.ok) throw new Error('Failed to download PDF');
        
        const blob = await response.blob();
        const fileName = link.split('/').pop() + '.pdf';
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        // Upload the file
        await onUpload(file);
        successCount++;
      } catch (error) {
        console.error(`Failed to download/upload paper: ${link}`, error);
        failCount++;
      }
    }

    setDownloadingPapers(false);
    
    if (failCount > 0) {
      alert(`Uploaded ${successCount} paper(s). Failed to upload ${failCount} paper(s).`);
    } else {
      alert(`Successfully uploaded ${successCount} paper(s)!`);
    }
    
    onClose();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (showResearchSearch) {
    return (
      <div className="upload-modal-overlay">
        <div className="upload-modal-container research-modal">
          <div className="upload-modal-header">
            <h2 className="upload-modal-title">Search Research Papers</h2>
            <div className="header-actions">
              <button onClick={handleBackToOptions} className="back-btn" disabled={downloadingPapers}>
                ← Back
              </button>
              <button onClick={onClose} className="upload-close-btn" disabled={downloadingPapers}>
                <X className="close-icon" />
              </button>
            </div>
          </div>

          {/* Search Form */}
          <div className="search-form">
            <div className="search-input-group">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search papers (e.g., graph neural network)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="search-input"
                disabled={searching || downloadingPapers}
              />
            </div>
            
            <div className="date-inputs">
              <div className="date-input-group">
                <Calendar className="calendar-icon" />
                <input
                  type="text"
                  placeholder="Start (MM/YYYY)"
                  value={startMonth}
                  onChange={(e) => setStartMonth(e.target.value)}
                  className="date-input"
                  disabled={searching || downloadingPapers}
                />
              </div>
              <span className="date-separator">to</span>
              <div className="date-input-group">
                <Calendar className="calendar-icon" />
                <input
                  type="text"
                  placeholder="End (MM/YYYY)"
                  value={endMonth}
                  onChange={(e) => setEndMonth(e.target.value)}
                  className="date-input"
                  disabled={searching || downloadingPapers}
                />
              </div>
            </div>

            <button 
              onClick={handleSearch} 
              className="search-btn"
              disabled={searching || downloadingPapers}
            >
              {searching ? 'Searching...' : 'Search Papers'}
            </button>
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <>
              <div className="results-header">
                <span className="results-count">
                  {searchResults.length} paper(s) found • {selectedPapers.size} selected
                </span>
                {selectedPapers.size > 0 && (
                  <button 
                    onClick={downloadAndUploadPapers}
                    className="upload-selected-btn"
                    disabled={downloadingPapers}
                  >
                    {downloadingPapers ? (
                      <>
                        <div className="btn-spinner"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Download className="btn-icon" />
                        Upload Selected ({selectedPapers.size})
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="results-list">
                {searchResults.map((paper, index) => (
                  <div 
                    key={index}
                    className={`paper-card ${selectedPapers.has(paper.link) ? 'selected' : ''}`}
                    onClick={() => !downloadingPapers && togglePaperSelection(paper.link)}
                  >
                    <div className="paper-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedPapers.has(paper.link)}
                        onChange={() => {}}
                        disabled={downloadingPapers}
                      />
                    </div>
                    <div className="paper-content">
                      <h3 className="paper-title">{paper.title}</h3>
                      <p className="paper-authors">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                      </p>
                      <p className="paper-summary">
                        {paper.summary.substring(0, 200)}...
                      </p>
                      <div className="paper-meta">
                        <span className="paper-date">{formatDate(paper.published)}</span>
                        <a 
                          href={paper.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="paper-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View on arXiv →
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="upload-modal-overlay">
      <div className="upload-modal-container">
        <div className="upload-modal-header">
          <h2 className="upload-modal-title">Upload File</h2>
          <button onClick={onClose} className="upload-close-btn" disabled={uploading}>
            <X className="close-icon" />
          </button>
        </div>

        <div className="upload-options">
          {/* PDF Upload */}
          <div 
            className={`upload-option pdf ${uploading ? 'disabled' : ''}`}
            onClick={handlePdfClick}
          >
            <div className="upload-option-icon">📄</div>
            <div className="upload-option-content">
              <h3 className="upload-option-title">Upload PDF</h3>
              <p className="upload-option-desc">Upload PDF documents for reading and analysis</p>
            </div>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => handleFileSelect(e, 'pdf')}
              className="upload-file-input"
              disabled={uploading}
            />
            {uploading && uploadingType === 'pdf' && (
              <div className="upload-loading">
                <div className="upload-spinner"></div>
                <span className="upload-loading-text">Uploading PDF...</span>
              </div>
            )}
          </div>

          {/* Image Upload */}
          <div 
            className={`upload-option image ${uploading ? 'disabled' : ''}`}
            onClick={handleImageClick}
          >
            <div className="upload-option-icon">🖼️</div>
            <div className="upload-option-content">
              <h3 className="upload-option-title">Upload Image</h3>
              <p className="upload-option-desc">Upload images (PNG, JPG, JPEG) for viewing</p>
            </div>
            <input
              ref={imageInputRef}
              type="file"
              accept=".png,.jpg,.jpeg"
              onChange={(e) => handleFileSelect(e, 'image')}
              className="upload-file-input"
              disabled={uploading}
            />
            {uploading && uploadingType === 'image' && (
              <div className="upload-loading">
                <div className="upload-spinner"></div>
                <span className="upload-loading-text">Uploading Image...</span>
              </div>
            )}
          </div>

          {/* Research Paper Search */}
          <div 
            className={`upload-option research ${uploading ? 'disabled' : ''}`}
            onClick={handleResearchClick}
          >
            <div className="upload-option-icon">🔬</div>
            <div className="upload-option-content">
              <h3 className="upload-option-title">Search Research Papers</h3>
              <p className="upload-option-desc">Search and download papers from arXiv</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;