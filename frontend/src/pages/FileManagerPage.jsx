import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Share2, Search,
  File as FileIcon,
  Download, Trash2,
  Edit2, FileText, Image as ImageIcon, X, Star, Zap, ChevronDown
} from 'lucide-react';
import { fetchFiles, downloadFile, toggleFileStar } from '../store/fileThunks';
import { setSearchQuery } from '../store/fileSlice';
import '../styles/DashboardPage.css';
import '../styles/FileManager.css';
import ShareModal from '../components/ShareModal';
import RenameModal from '../components/RenameModal';
import { deleteFileApi } from '../store/fileApi';
import { useToast } from '../components/ToastContext';
import Pagination from '../components/Pagination';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import FileGrid from '../components/FileGrid';
import ViewToggle from '../components/ViewToggle';
import useViewMode from '../hooks/useViewMode';

const FILTER_CONFIG = [
  {
    key: 'file_type',
    label: 'Type',
    options: [
      { value: 'image', label: 'Images' },
      { value: 'pdf', label: 'PDF' },
      { value: 'document', label: 'Documents' },
      { value: 'other', label: 'Other' },
    ],
  },
  {
    key: 'modified',
    label: 'Modified',
    options: [
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This week' },
      { value: 'month', label: 'This month' },
    ],
  },
  {
    key: 'is_starred',
    label: 'Starred',
    options: [
      { value: 'true', label: 'Starred only' },
    ],
  },
];

export default function FileManagerPage() {
  const dispatch = useDispatch();
  const { files, pagination, loading, searchQuery } = useSelector((s) => s.files);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [viewMode, handleViewMode] = useViewMode('list');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  const [filters, setFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);

  const scrollPositionRef = useRef(0);

  const saveScroll = () => { scrollPositionRef.current = window.scrollY; };
  const restoreScroll = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    });
  };

  useBodyScrollLock(!!selectedFile || isModalOpen || isRenameModalOpen || isDeleteModalOpen);

  // Close filter dropdown on outside click
  useEffect(() => {
    const close = () => setOpenFilter(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // Build params object from filters
  const buildParams = (f = filters) => {
    const params = {};
    Object.entries(f).forEach(([k, v]) => { if (v) params[k] = v; });
    return params;
  };

  // Main fetch effect
  useEffect(() => {
    dispatch(fetchFiles(currentPage, pageSize, searchQuery, buildParams()));
  }, [dispatch, currentPage, pageSize, searchQuery, filters]);

  // Search debounce
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== searchQuery) {
        dispatch(setSearchQuery(searchInput.trim()));
        setCurrentPage(1);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [dispatch, searchInput, searchQuery]);

  // Sync pagination from redux
  useEffect(() => {
    if (pagination) {
      setCurrentPage(pagination.currentPage || 1);
      setTotalPages(Math.ceil((pagination.count || 0) / pageSize) || 1);
    }
  }, [pagination, pageSize]);

  const handleRefresh = async () => {
    await dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery, buildParams()));
    restoreScroll();
  };

  // Filter handlers
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: filters[key] === value ? undefined : value };
    // Remove undefined keys
    Object.keys(newFilters).forEach(k => newFilters[k] === undefined && delete newFilters[k]);
    setFilters(newFilters);
    setCurrentPage(1);
    setOpenFilter(null);
    dispatch(fetchFiles(1, pageSize, searchQuery, buildParams(newFilters)));
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    dispatch(fetchFiles(1, pageSize, searchQuery, {}));
  };

  const activeFilterCount = Object.keys(filters).length;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    dispatch(fetchFiles(newPage, pageSize, searchQuery, buildParams()));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTrigger = (file) => {
    setFileToDelete(file);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFileApi(fileToDelete.id);
      showToast('File moved to trash');
      await dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery, buildParams()));
      setIsDeleteModalOpen(false);
      setSelectedFile(null);
      setFileToDelete(null);
      restoreScroll();
    } catch {
      showToast('Failed to delete file');
    }
  };

  const handleToggleStar = async (file, e) => {
    if (e) e.stopPropagation();
    try {
      const result = await dispatch(toggleFileStar(file.id));
      if (selectedFile?.id === file.id) {
        setSelectedFile(prev => prev ? { ...prev, is_starred: result.is_starred } : null);
      }
      showToast(result.is_starred ? 'Added to Starred' : 'Removed from Starred');
    } catch {
      showToast('Failed to update star');
    }
  };

  const getFileIcon = (file) => {
    const type = (file?.file_type || '').toLowerCase();
    const name = (file?.original_name || '').toLowerCase();
    if (type.includes('pdf') || type.includes('text') || name.match(/\.(pdf|txt|docx|doc|xls|xlsx)$/)) {
      return <FileText size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    }
    if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/)) {
      return <ImageIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    }
    return <FileIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getReadableFileType = (file) => {
    const extension = file?.original_name?.split('.').pop()?.toLowerCase();
    const fileTypes = {
      jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'Image',
      svg: 'Vector Image', webp: 'Image', bmp: 'Bitmap Image',
      pdf: 'PDF Document', txt: 'Text File',
      doc: 'Word Document', docx: 'Word Document',
      xls: 'Excel Spreadsheet', xlsx: 'Excel Spreadsheet',
      csv: 'CSV File', ppt: 'PowerPoint', pptx: 'PowerPoint',
      zip: 'ZIP Archive', rar: 'RAR Archive',
      mp4: 'Video File', mp3: 'Audio File',
      js: 'JavaScript File', py: 'Python File',
      html: 'HTML File', css: 'CSS File', json: 'JSON File',
    };
    if (['jpg', 'jpeg', 'png', 'svg', 'webp', 'bmp'].includes(extension)) {
      return `Image (${extension.toUpperCase()})`;
    }
    return fileTypes[extension] || 'Unknown File';
  };

  return (
    <>
      <main className="dashboard-main" style={{ transition: 'none' }}>

        {/* Header */}
        <div className="file-manager-header">
          <div className="welcome-sectionfm">
            <div className="welcome-labelfm">Library</div>
            <h1 className="welcome-titlefm">My Files</h1>
            <p style={{ color: '#71717a' }}>{pagination.count || 0} files · Managed by you</p>
          </div>
          <div className="search-containerfm">
            <Search size={18} className="search-iconfm" color="#71717a" />
            <input
              type="text"
              placeholder="Search files..."
              className="fm-search-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* Filter bar */}
        <div className="ps-filter-bar" onClick={(e) => e.stopPropagation()}>
          {FILTER_CONFIG.map(({ key, label, options }) => (
            <div key={key} className="ps-filter-wrap" onClick={(e) => e.stopPropagation()}>
              <button
                className={`ps-filter-btn ${filters[key] ? 'active' : ''}`}
                onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === key ? null : key); }}
              >
                {label}
                {filters[key] && (
                  <span className="ps-filter-active-val">
                    : {options.find(o => o.value === filters[key])?.label}
                  </span>
                )}
                <ChevronDown size={12} />
              </button>

              {openFilter === key && (
                <div className="ps-filter-dropdown" onClick={(e) => e.stopPropagation()}>
                  {options.map(opt => (
                    <button
                      key={opt.value}
                      className={`ps-filter-option ${filters[key] === opt.value ? 'active' : ''}`}
                      onClick={() => handleFilterChange(key, opt.value)}
                    >
                      {filters[key] === opt.value && (
                        <span style={{ color: '#e11d48', marginRight: '4px' }}>✓</span>
                      )}
                      {opt.label}
                    </button>
                  ))}
                  {filters[key] && (
                    <button
                      className="ps-filter-clear-one"
                      onClick={() => handleFilterChange(key, filters[key])}
                    >
                      Clear
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {activeFilterCount > 0 && (
            <button className="ps-filter-reset" onClick={clearFilters}>
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {/* View toggle */}
        <div className="view-controls" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <ViewToggle viewMode={viewMode} onChange={handleViewMode} />
        </div>

        {/* File list */}
        <section className="file-list-container">
          {loading ? (
            <div className="fm-empty-state"><div className="fm-spinner" /></div>
          ) : files.length === 0 ? (
            <div className="fm-empty-state">
              <FileIcon size={60} color="#27272a" strokeWidth={1} />
              <h2 style={{ marginTop: '20px', color: 'white' }}>
                {activeFilterCount > 0 ? 'No files match your filters' : 'No files yet'}
              </h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  style={{
                    marginTop: '12px', background: 'none', border: '1px solid #3f3f46',
                    color: '#a1a1aa', padding: '8px 16px', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <FileGrid
              files={files}
              viewMode={viewMode}
              onSelect={setSelectedFile}
              onStar={handleToggleStar}
              onRename={(file) => { saveScroll(); setActiveFile(file); setIsRenameModalOpen(true); }}
              onShare={(file) => { saveScroll(); setActiveFile(file); setIsModalOpen(true); }}
              onDownload={(file) => dispatch(downloadFile(file.id, file.original_name))}
              onDelete={(file) => { saveScroll(); handleDeleteTrigger(file); }}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
            />
          )}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </section>

        <footer className="fm-footer">CloudShare - Secure file sharing, built for teams.</footer>
      </main>

      {/* File details modal */}
      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
          <div className="file-details-modal fade-in-up" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="modal-header-section">
              <h3>File Details</h3>
              <button className="close-sidebar" onClick={() => setSelectedFile(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Preview */}
            <div className="modal-preview-box">
              {(() => {
                const ext = selectedFile.original_name?.split('.').pop()?.toLowerCase();
                const isImage = ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(ext);
                const isPDF = ext === 'pdf';
                if (isImage) return <img src={selectedFile?.url} alt="Preview" className="modal-img-preview" />;
                if (isPDF) return <embed src={selectedFile?.url} type="application/pdf" width="100%" height="100%" />;
                return <div className="modal-icon-placeholder">{getFileIcon(selectedFile)}</div>;
              })()}
            </div>

            {/* Body */}
            <div className="modal-body-content">

              {/* Name + star */}
              <div className="detail-title-row">
                <h2 className="detail-filename">{selectedFile.original_name}</h2>
                <div
                  onClick={(e) => handleToggleStar(selectedFile, e)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    cursor: 'pointer', width: 'fit-content',
                    color: selectedFile.is_starred ? '#fbbf24' : '#52525b',
                    fontSize: '12px', marginTop: '4px',
                  }}
                >
                  <Star
                    size={13}
                    fill={selectedFile.is_starred ? '#fbbf24' : 'none'}
                    color={selectedFile.is_starred ? '#fbbf24' : '#52525b'}
                  />
                  {selectedFile.is_starred ? 'Starred' : 'Add to starred'}
                </div>
              </div>

              {/* Info grid */}
              <div className="detail-info-grid">
                <div className="info-group">
                  <label>Size</label>
                  <span>{formatFileSize(selectedFile.file_size)}</span>
                </div>
                <div className="info-group">
                  <label>Type</label>
                  <span>{getReadableFileType(selectedFile)}</span>
                </div>
                <div className="info-group">
                  <label>Uploaded</label>
                  <span>{new Date(selectedFile.uploaded_at).toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric'
                  })}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="sidebar-actions-main">
                <button onClick={() => { dispatch(downloadFile(selectedFile.id, selectedFile.original_name)); setSelectedFile(null); }}>
                  <Download size={16} /> Download
                </button>
                <button
                  className="sidebar-btn-share"
                  onClick={() => { setActiveFile(selectedFile); setIsModalOpen(true); setSelectedFile(null); }}
                >
                  <Share2 size={16} /> Share
                </button>
                <button
                  className="sidebar-btn-delete"
                  onClick={() => { handleDeleteTrigger(selectedFile); setSelectedFile(null); }}
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>

              {/* AI Insights */}
              <div className="ai-insights-card">
                <div className="insights-header">
                  <div className="insights-title">
                    <Zap size={12} color="#e11d48" /> AI Insights
                  </div>
                  <button className="insights-regen">Regenerate</button>
                </div>
                <p className="insights-text">
                  A {selectedFile.file_type || 'document'} named '{selectedFile.original_name}'.
                  {selectedFile.file_size > 1000000 ? ' This is a large file.' : ' Optimized for quick sharing.'}
                </p>
                <span className="insight-tag">
                  {selectedFile.original_name?.split('.').pop()?.toUpperCase() || 'FILE'}
                </span>
              </div>

            </div>
          </div>
        </div>
      )}

      <ShareModal
        file={activeFile}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setActiveFile(null); }}
        onRefresh={handleRefresh}
      />
      <RenameModal
        file={activeFile}
        isOpen={isRenameModalOpen}
        onClose={() => { setIsRenameModalOpen(false); setActiveFile(null); }}
        onRefresh={handleRefresh}
      />

      {isDeleteModalOpen && (
        <div className="modal-overlaydelete">
          <div className="modal-content">
            <h3 className="modal-title">Delete File?</h3>
            <p className="modal-subtitle">The file will be moved to trash.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setIsDeleteModalOpen(false); setFileToDelete(null); }}>
                Cancel
              </button>
              <button className="btn-revoke" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}