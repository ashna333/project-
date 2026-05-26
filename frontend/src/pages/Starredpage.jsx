import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Star, Download, Share2, Edit2, X,
  FileText, Image as ImageIcon, File as FileIcon,Trash2
} from 'lucide-react';
import { fetchFiles, downloadFile, toggleFileStar } from '../store/fileThunks';
import { setPage } from '../store/fileSlice';
import ShareModal from '../components/ShareModal';
import RenameModal from '../components/RenameModal';
import Pagination from '../components/Pagination';
import { deleteFileApi } from '../store/fileApi';
import { useToast } from '../components/ToastContext';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import FileGrid from '../components/FileGrid';
import ViewToggle from '../components/ViewToggle';
import useViewMode from '../hooks/useViewMode';
import ConfirmModal from '../components/ConfirmModal';

import '../styles/DashboardPage.css';
import '../styles/FileManager.css';

export default function StarredPage() {
  const dispatch = useDispatch();
  const { files, pagination, loading } = useSelector((s) => s.files);
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12;

  const [viewMode, handleViewMode] = useViewMode('list');

  const starredFilters = { is_starred: true };

  useBodyScrollLock(
    !!selectedFile || isModalOpen || isRenameModalOpen || !!deleteTarget
  );

  useEffect(() => {
    dispatch(fetchFiles(currentPage, pageSize, '', starredFilters));
  }, [dispatch, currentPage]);

  useEffect(() => {
    if (pagination) {
      setCurrentPage(pagination.currentPage || 1);
      setTotalPages(Math.ceil((pagination.count || 0) / pageSize) || 1);
    }
  }, [pagination]);

  const getFileIcon = (file) => {
    const name = (file?.original_name || '').toLowerCase();
    if (name.match(/\.(pdf|txt|docx|doc|xls|xlsx)$/)) {
      return <FileText size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    }
    if (name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/)) {
      return <ImageIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    }
    return <FileIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    dispatch(setPage(newPage));
    dispatch(fetchFiles(newPage, pageSize, '', starredFilters));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleStar = async (file, e) => {
    if (e) e.stopPropagation();
    try {
      const result = await dispatch(toggleFileStar(file.id));
      if (selectedFile?.id === file.id) setSelectedFile(null);
      showToast(result.is_starred ? 'Added to Starred' : 'Removed from Starred');
      dispatch(fetchFiles(currentPage, pageSize, '', starredFilters));
    } catch {
      showToast('Failed to update star');
    }
  };

  const handleFileSelect = (file) => {
    if (selectedFile && selectedFile.id === file.id && file.url) {
      window.open(file.url, '_blank');
    } else {
      setSelectedFile(file);
    }
  };

  const handleDeleteTrigger = (file) => {
    setDeleteTarget(file);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFileApi(deleteTarget.id);
      showToast('File moved to trash');
      setDeleteTarget(null);
      setSelectedFile(null);
      dispatch(fetchFiles(currentPage, pageSize, '', starredFilters));
    } catch {
      showToast('Failed to delete file');
    }
  };

  return (
    <>
      <main className="dashboard-main">
        <div className="file-manager-header">
          <div className="welcome-sectionfm">
            <div className="welcome-labelfm">Collections</div>
            <h1 className="welcome-titlefm" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Star fill="#fbbf24" color="#fbbf24" size={28} /> Starred Files
            </h1>
            <p style={{ color: '#71717a' }}>{pagination.count || 0} starred items</p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <ViewToggle viewMode={viewMode} onChange={handleViewMode} />
        </div>

        <section className="file-list-container">
          {loading ? (
            <div className="fm-empty-state"><div className="fm-spinner" /></div>
          ) : !files ||  files.length === 0 ? (
            <div className="fm-empty-state">
              <Star size={64} color="#27272a" strokeWidth={1} />
              <h2 style={{ color: 'white', marginTop: '16px' }}>No stars yet</h2>
              <p style={{ color: '#71717a' }}>Files you star will appear here for quick access.</p>
            </div>
          ) : (
            <FileGrid
              files={files}
              viewMode={viewMode}
              onSelect={handleFileSelect}
              onStar={handleToggleStar}
              onRename={(file) => { setActiveFile(file); setIsRenameModalOpen(true); }}
              onShare={(file) => { setActiveFile(file); setIsModalOpen(true); }}
              onDownload={(file) => dispatch(downloadFile(file.id, file.original_name))}
              onDelete={handleDeleteTrigger}
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
      </main>

      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
          <div className="file-details-modal fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-section">
              <span className="sidebar-label">File Details</span>
              <button type="button" className="close-sidebar" onClick={() => setSelectedFile(null)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body-content">
              <div className="modal-preview-box">
                {(() => {
                  const ext = selectedFile.original_name?.split('.').pop()?.toLowerCase();
                  const isImage = ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(ext) || selectedFile.mime_type?.includes('image');
                  const isPDF   = ext === 'pdf' || selectedFile.mime_type?.includes('pdf');
                  if (isImage) return <img src={selectedFile.url} alt="Preview" className="modal-img-preview" />;
                  if (isPDF)   return <embed src={selectedFile.url} type="application/pdf" width="100%" height="100%" />;
                  return <div className="modal-icon-placeholder">{getFileIcon(selectedFile)}</div>;
                })()}
              </div>
              <div className="detail-title-row">
                <h2 className="detail-filename">{selectedFile.original_name}</h2>
                <Star
                  size={22}
                  className="star-icon is-active"
                  onClick={(e) => handleToggleStar(selectedFile, e)}
                  fill="#fbbf24"
                  color="#fbbf24"
                  style={{ cursor: 'pointer' }}
                />
              </div>
              <div className="detail-info-grid">
                <div className="info-group">
                  <label>Size</label>
                  <span>{formatFileSize(selectedFile.file_size)}</span>
                </div>
                <div className="info-group">
                  <label>Uploaded</label>
                  <span>{new Date(selectedFile.uploaded_at).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="info-group">
                  <label>Status</label>
                  <span>Starred</span>
                </div>
              </div>
              <div className="sidebar-actions-main">
                <button type="button"
                  onClick={() => { setActiveFile(selectedFile); setIsRenameModalOpen(true); }}>
                  <Edit2 size={18} /> Rename
                </button>
                <button type="button" onClick={() => dispatch(downloadFile(selectedFile.id, selectedFile.original_name))}>
                  <Download size={18} /> Download
                </button>
                <button type="button" className="sidebar-btn-share"
                  onClick={() => { setActiveFile(selectedFile); setIsModalOpen(true); }}>
                  <Share2 size={18} /> Share
                </button>
                
                <button type="button" onClick={() => setDeleteTarget(selectedFile)}>
                   <Trash2 size={16}/> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        file={activeFile}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setActiveFile(null); }}
        onRefresh={() => dispatch(fetchFiles(currentPage, pageSize, '', starredFilters))}
      />
      <RenameModal
        file={activeFile}
        isOpen={isRenameModalOpen}
        onClose={() => { setIsRenameModalOpen(false); setActiveFile(null); }}
        onRefresh={() => dispatch(fetchFiles(currentPage, pageSize, '', starredFilters))}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title="Delete file?"
        message="The file will be moved to trash."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}