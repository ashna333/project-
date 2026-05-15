import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Files, Share2, Layers, Search, File,
  Download, Trash2, ChevronLeft, ChevronRight,
  Edit2, FileText, Image as ImageIcon, File as FileIcon, X, Star, Zap
} from 'lucide-react';
import { fetchFiles, downloadFile ,toggleFileStar} from '../store/fileThunks';
import { setSearchQuery,updateFileSuccess} from '../store/fileSlice';
import '../styles/DashboardPage.css';
import '../styles/FileManager.css';
import ShareModal from '../components/ShareModal';
import RenameModal from '../components/RenameModal';
import { deleteFileApi } from '../store/fileApi';
import { useToast } from '../components/ToastContext';
import Pagination from '../components/Pagination';

export default function FileManagerPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { files, pagination, loading, searchQuery } = useSelector((s) => s.files);
  const [showStarredOnly, setShowStarredOnly] = useState(false);

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [viewMode, setViewMode] = useState('grid'); // 'list' or 'grid'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [activeFile, setActiveFile] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const { showToast } = useToast();
  const [selectedFile, setSelectedFile] = useState(null); // For sidebar details
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 12; // Adjust this to match your preference

                
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
  dispatch(
    fetchFiles(
      currentPage,
      pageSize,
      searchQuery,
      showStarredOnly ? { is_starred: true } : {}
    )
  );
}, [dispatch, currentPage, pageSize, searchQuery, showStarredOnly]);

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
      setSelectedFile(null);
      setFileToDelete(null);

    } catch (err) {
      showToast("Failed to delete file");
    }
  };
 

  const handlePageChange = (newPage) => {
  // Corrected: Dispatch fetchFiles instead of calling loadShares
  dispatch(
    fetchFiles(
      newPage,
      pageSize,
      searchQuery,
      showStarredOnly ? { is_starred: true } : {}
    )
  );
  // Optional: Scroll to top when page changes
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
// Sync local pagination state with Redux store
useEffect(() => {
  if (pagination) {
    setCurrentPage(pagination.currentPage || 1);
    const total = Math.ceil((pagination.count || 0) / pageSize);
    setTotalPages(total || 1);
  }
}, [pagination, pageSize]);

  const handleToggleStar = async (file) => {
  try {
    const result = await dispatch(toggleFileStar(file.id));
    
    // Sync the main list in the Redux store
    dispatch(updateFileSuccess({ 
      id: file.id, 
      updates: { is_starred: result.is_starred } 
    }));

    
    showToast(result.is_starred ? "Added to Starred" : "Removed from Starred");
  } catch (err) {
    showToast("Failed to update star");
  }
};

 
  
  // ADD this helper near your other helper functions
const getReadableFileType = (file) => {
  // const mime =
  //   file?.file_type ||
  //   file?.mime_type ||
  //   file?.content_type ||
  //   "";

  const extension = file?.original_name
    ?.split(".")
    .pop()
    ?.toLowerCase();

  // Prefer MIME if available
  // if (mime) {
  //   if (mime.includes("image")) return "Image";
  //   if (mime.includes("pdf")) return "PDF Document";
  //   if (mime.includes("word") || mime.includes("document")) return "Word Document";
  //   if (mime.includes("sheet") || mime.includes("excel")) return "Spreadsheet";
  //   if (mime.includes("text")) return "Text File";
  //   if (mime.includes("zip")) return "Archive";
  //   return mime;
  // }

  // Fallback by extension
  const fileTypes = {
    jpg: "Image",
    jpeg: "Image",
    png: "Image",
    gif: "Image",
    svg: "Vector Image",
    webp: "Image",
    bmp: "Bitmap Image",
    pdf: "PDF Document",
    txt: "Text File",
    doc: "Word Document",
    docx: "Word Document",
    xls: "Excel Spreadsheet",
    xlsx: "Excel Spreadsheet",
    csv: "CSV File",
    ppt: "PowerPoint Presentation",
    pptx: "PowerPoint Presentation",
    zip: "ZIP Archive",
    rar: "RAR Archive",
    mp4: "Video File",
    mp3: "Audio File",
    js: "JavaScript File",
    py: "Python File",
    html: "HTML File",
    css: "CSS File",
    json: "JSON File",
  };

  if (extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "svg" || extension === "webp" || extension === "bmp") {
    return `Image (${extension.toUpperCase()})`;
  }

  return fileTypes[extension] || "Unknown File";
};

  return (
    <div className="dashboard-container" style={{ position: 'relative', overflowX: 'hidden' }}>
      <main className="dashboard-main" style={{ transition: 'none' }}>
        <div className="file-manager-header" style={{ height: '100px', flexShrink: 0 }}>
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
                    
                
                
                const extension = file.original_name?.split(".").pop()?.toLowerCase();
                const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension);
                const isPDF = extension === "pdf";
                const isText = extension === "txt";
                const isPreviewable = isImage || isPDF || isText;

                return (
                
                  <div
                    key={file.id}
                    className={viewMode === 'grid' ? 'file-grid-item' : 'file-row-item'}
                    onClick={() => {
                      
                      setSelectedFile(file);
                    }}

                    >               
                       
                    {/* ICON / PREVIEW BOX */}
                    <div className={viewMode === 'grid' ? 'file-preview-container' : 'file-icon-square'}>
                      
                      {isImage ? (
                        <img
                          src={file.url}
                          alt={file.original_name}
                          className="file-image-preview"
                          onError={(e) => {
                            e.target.style.display = "none";
                            e.target.parentElement.innerHTML = `<div class="file-type-preview">${extension?.toUpperCase() || "FILE"}</div>`;
                          }}
                        />
                      ) : isPDF ? (
                      <div className="pdf-preview-container" style={{ overflow: 'hidden', pointerEvents: 'none' }}>
                        <iframe
                          src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          type="application/pdf"
                          width="100%"
                          height="100%"
                          title="PDF Preview"
                          style={{ border: 'none' }}
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
                      ) : (
                        getFileIcon(file)
                      )}
                    </div>
                    {/* FILE INFO */}
                   {/* FILE INFO STACK */}
                    <div className="file-info-stack">
                      <div className="file-name-container" style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div className="file-name-main" title={file.original_name}>
                          {file.original_name}
                        </div>
                        
                        {/* GRID VIEW STAR (Right side of name) */}
                        {viewMode === 'grid' && (
                          <Star 
                            size={16} 
                            className="star-trigger" // Matches the check in the onClick above
                            onClick={(e) => { 
                              e.stopPropagation();
                              handleToggleStar(file);
                              
                            }}
                            fill={file.is_starred ? "#fbbf24" : "none"} 
                            color={file.is_starred ? "#fbbf24" : "#71717a"} 
                          />
                        )}
                      </div>

                      <div className="file-meta-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {formatFileSize(file.file_size)} · {new Date(file.uploaded_at).toLocaleDateString('en-GB')}
                        
                        {/* LIST VIEW STAR (Beside the date) */}
                        {viewMode === 'list' && (
                          <>
                            <span style={{ color: '#27272a' }}>•</span>
                            <Star 
                              size={14} 
                              className={`star-icon ${file.is_starred ? 'is-active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); handleToggleStar(file); }}
                              fill={file.is_starred ? "#fbbf24" : "none"} 
                              color={file.is_starred ? "#fbbf24" : "#71717a"} 
                              style={{ cursor: 'pointer' }}
                            />
                          </>
                        )}
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="file-actions-strip">
                      <button className="icon-action-btn hover-white" title="Rename" onClick={(e) => { e.stopPropagation();setActiveFile(file); setIsRenameModalOpen(true); }}><Edit2 size={16} /></button>
                      <button className="icon-action-btn hover-rose" onClick={(e) => { e.stopPropagation();setActiveFile(file); setIsModalOpen(true); }}><Share2 size={16} /></button>
                        <button className="icon-action-btn hover-white" title="Download" onClick={(e) => {e.stopPropagation();dispatch(downloadFile(file.id, file.original_name))}}><Download size={16} /></button>
                      <button className="icon-action-btn hover-rose" title="Delete" onClick={(e) => {e.stopPropagation();handleDeleteTrigger(file)}}><Trash2 size={16} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loading={loading}
          />
        </section>

        <footer className="fm-footer">CloudShare - Secure file sharing, built for teams.</footer>
      </main>

      {/* --- FILE DETAILS SIDEBAR --- */}
{/* --- FILE DETAILS MODAL --- */}
{selectedFile && (
  <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
    <div 
      className="file-details-modal fade-in-up" 
      onClick={(e) => e.stopPropagation()} /* Prevents closing when clicking inside */
    >
      {/* HEADER */}
      <div className="modal-header-section">
        <span className="sidebar-label">File Details</span>
        <button className="close-sidebar" onClick={() => setSelectedFile(null)}>
          <X size={24} />
        </button>
      </div>

      <div className="modal-body-content">
        {/* PREVIEW AREA */}
        <div className="modal-preview-box">
          {(() => {
            const extension = selectedFile.original_name?.split(".").pop()?.toLowerCase();
            const isImage = ["jpg", "jpeg", "png", "gif", "svg", "webp", "bmp"].includes(extension);
            const isPDF = extension === "pdf";

            if (isImage) return <img src={selectedFile?.url} alt="Preview" className="modal-img-preview" />;
            if (isPDF) return <embed src={selectedFile?.url} type="application/pdf" width="100%" height="100%" />;
            return <div className="modal-icon-placeholder">{getFileIcon(selectedFile)}</div>;
          })()}
        </div>

        {/* TITLE & STAR */}
        <div className="detail-title-row">
          <h2 className="detail-filename">{selectedFile.original_name}</h2>
          <Star 
            size={22} 
            className={`star-icon ${selectedFile.is_starred ? 'is-active' : ''}`} 
            onClick={() => handleToggleStar(selectedFile)}
            fill={selectedFile.is_starred ? "#fbbf24" : "none"} 
            color={selectedFile.is_starred ? "#fbbf24" : "#71717a"} 
            style={{ cursor: 'pointer' }}
          />
        </div>

        {/* INFO GRID (Reusing your existing grid CSS) */}
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
            <span>
              {new Date(selectedFile.uploaded_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}
            </span>
          </div>
        </div>

        {/* ACTIONS (Reusing your existing actions CSS) */}
        <div className="sidebar-actions-main">
          <button onClick={() => {dispatch(downloadFile(selectedFile.id, selectedFile.original_name)); setSelectedFile(null);}}>
            <Download size={18} /> Download
          </button>
          <button className="sidebar-btn-share" onClick={() => { setActiveFile(selectedFile); setIsModalOpen(true); setSelectedFile(null); }}>
            <Share2 size={18} /> Share
          </button>
          <button onClick={() => handleDeleteTrigger(selectedFile)}>
            <Trash2 size={18} /> Delete
          </button>
        </div>

        {/* AI INSIGHTS (Reusing your existing insights CSS) */}
        <div className="ai-insights-card">
          <div className="insights-header">
            <div className="insights-title"><Zap size={14} /> AI Insights</div>
            <button className="insights-regen">Regenerate</button>
          </div>
          <p className="insights-text">
            A {selectedFile.file_type || 'document'} named '{selectedFile.original_name}'.
            {selectedFile.file_size > 1000000 ? " This is a large file." : " Optimized for quick sharing."}
          </p>
          <div className="insight-tag">
            {selectedFile.original_name?.split(".").pop()?.toUpperCase() || "FILE"}
          </div>
        </div>
      </div>
    </div>
  </div>
)}

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