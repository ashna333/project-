import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Files, Share2, Layers, Search, File,
  Download, Trash2, ChevronLeft, ChevronRight, 
  Edit2, FileText, Image as ImageIcon, File as FileIcon
} from 'lucide-react';
import { fetchFiles, downloadFile } from '../store/fileThunks';
import { setSearchQuery } from '../store/fileSlice';
import '../styles/DashboardPage.css';
import ShareModal from '../components/ShareModal';
import RenameModal from '../components/RenameModal';
import { deleteFileApi } from '../store/fileApi';
import { useToast } from '../components/ToastContext';

export default function FileManagerPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { files, pagination, loading, searchQuery } = useSelector((s) => s.files);
  
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'grid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const { showToast } = useToast();

  // --- Helpers ---
  const getFileIcon = (file) => {
    const type = (file?.file_type || "").toLowerCase();
    const name = (file?.original_name || "").toLowerCase();
    if (type.includes("pdf") || type.includes("text") || name.match(/\.(pdf|txt|docx|doc|xls|xlsx)$/)) {
      return <FileText size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    }
    if (type.includes("image") || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/)) {
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

  // --- Effects ---
  useEffect(() => {
    dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery));
  }, [dispatch, pagination.currentPage, pagination.pageSize, searchQuery]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== searchQuery) {
        dispatch(setSearchQuery(searchInput.trim()));
      }
    }, 350);
    return () => clearTimeout(t);
  }, [dispatch, searchInput, searchQuery]);

  // --- Handlers ---
  const handleDeleteTrigger = (file) => {
    setFileToDelete(file);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFileApi(fileToDelete.id);
      showToast("File moved to trash"); 
      dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery));
      setIsDeleteModalOpen(false);
      setFileToDelete(null);
    } catch (err) {
      showToast("Failed to delete file");
    }
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(pagination.count / pagination.pageSize) || 1;
    if (newPage < 1 || newPage > totalPages) return;
    dispatch(fetchFiles(newPage, pagination.pageSize, searchQuery));
  };

  const totalPages = Math.ceil(pagination.count / pagination.pageSize) || 1;
  const currentPage = pagination.currentPage || 1;

  return (
    <div className="dashboard-container">
      <main className="dashboard-main fade-in">
        
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

        {/* View Controls */}
        <div className="view-controls" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
          <div className="view-toggle-group">
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} 
              onClick={() => setViewMode('list')}
            >
              <Files size={18} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={() => setViewMode('grid')}
            >
              <Layers size={18} />
            </button>
          </div>
        </div>

        {/* File List / Grid Area */}
        <section className="file-list-container">
          {loading ? (
            <div className="fm-empty-state"><div className="fm-spinner"></div></div>
          ) : files.length === 0 ? (
            <div className="fm-empty-state">
              <File size={60} color="#27272a" strokeWidth={1} />
              <h2 style={{ marginTop: '20px', color: 'white' }}>No files yet</h2>
            </div>
          ) : (
            /* CONDITIONAL LAYOUT WRAPPER */
           <div className={viewMode === 'grid' ? 'file-grid-inner' : 'file-list-card'}>
            {files.map((file) => {

              // BACKEND BASE
              const backendBase = "http://127.0.0.1:8001";

              const rawUrl = file.file || file.file_url || file.url;
              const fullUrl = rawUrl?.startsWith("http") ? rawUrl : `${backendBase}${rawUrl}`;
            const extension = file.original_name?.split(".").pop()?.toLowerCase();

            const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension);
            const isPDF = extension === "pdf";
            const isText = extension === "txt";

            /* EXCLUDE HTML FROM PREVIEW */
            const isPreviewable = isImage || isPDF || isText;

                return (
                  <div
                    key={file.id}
                    className={viewMode === 'grid' ? 'file-grid-item' : 'file-row-item'}
                  >

                    {/* ICON / PREVIEW BOX */}
                    {/* ICON / PREVIEW BOX */}
            <div className={viewMode === 'grid' ? 'file-preview-container' : 'file-icon-square'}>
              {isImage ? (
                <img
                  src={fullUrl}
                  alt={file.original_name}
                  className="file-image-preview"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.parentElement.innerHTML = `<div class="file-type-preview">${extension?.toUpperCase() || "FILE"}</div>`;
                  }}
                />
              ) : isPDF ? (
                <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                  <embed
                  src={`${fullUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                  className="pdf-embed-no-scroll"
                />
                
                </div>
              ) : isText ? (
              <div
                className="file-type-preview"
                onClick={() => window.open(fullUrl, "_blank")}
                style={{ cursor: "pointer" }}
              >
                TXT
              </div>
            ) :  (
                getFileIcon(file)
              )}
            </div>
                    {/* FILE INFO */}
                    <div className="file-info-stack">
                      <div className="file-name-main" title={file.original_name}>{file.original_name}</div>
                      <div className="file-meta-sub">
                        {formatFileSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString('en-GB')}
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="file-actions-strip">
                      <button className="icon-action-btn hover-white" title="Rename" onClick={() => { setActiveFile(file); setIsRenameModalOpen(true); }}><Edit2 size={16} /></button>
                      <button className="icon-action-btn hover-rose" onClick={() => { setActiveFile(file); setIsModalOpen(true); }}><Share2 size={16} /></button>
                      <button className="icon-action-btn hover-white" title="Download" onClick={() => dispatch(downloadFile(file.id, file.original_name))}><Download size={16} /></button>
                      <button className="icon-action-btn hover-rose" title="Delete" onClick={() => handleDeleteTrigger(file)}><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pagination.count > pagination.pageSize && (
            <div className="pagination-wrapper">
              <div className="page-info">Page <span>{currentPage}</span> of <span>{totalPages}</span></div>
              <div className="pagination-btns">
                <button className={`p-btn ${currentPage === 1 ? 'disabled-btn' : 'active-btn'}`} onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={18} /> Previous</button>
                <button className={`p-btn ${currentPage === totalPages ? 'disabled-btn' : 'active-btn'}`} onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next <ChevronRight size={18} /></button>
              </div>
            </div>
          )}
        </section>

        <footer className="fm-footer">CloudShare - Secure file sharing, built for teams.</footer>
      </main>

      {/* Modals */}
      <ShareModal file={activeFile} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setActiveFile(null); }} onRefresh={() => dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery))} />
      <RenameModal file={activeFile} isOpen={isRenameModalOpen} onClose={() => { setIsRenameModalOpen(false); setActiveFile(null); }} onRefresh={() => dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery))} />
      
      {isDeleteModalOpen && (
        <div className="modal-overlaydelete">
          <div className="modal-content">
            <h3 className="modal-title">Delete File?</h3> 
            <p className="modal-subtitle">The file will be moved to trash.</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => { setIsDeleteModalOpen(false); setFileToDelete(null); }}>Cancel</button>
              <button className="btn-revoke" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}