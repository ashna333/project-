import React, { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Share2, Search,
  File as FileIcon,
  Download, Trash2,
  Edit2, FileText, Image as ImageIcon, X, Star, Zap, ChevronDown,
  ArrowUp, ArrowDown, Music, Video, Sparkles,
} from 'lucide-react';
import { fetchFiles, downloadFile, toggleFileStar } from '../store/fileThunks';
import { setSearchQuery } from '../store/fileSlice';
import '../styles/DashboardPage.css';
import '../styles/FileManager.css';
import '../styles/responsive.css';
import ShareModal from '../components/ShareModal';
import RenameModal from '../components/RenameModal';
import { deleteFileApi } from '../store/fileApi';
import { useToast } from '../components/ToastContext';
import Pagination from '../components/Pagination';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import FileGrid from '../components/FileGrid';
import ViewToggle from '../components/ViewToggle';
import useViewMode from '../hooks/useViewMode';
import useSelectMode from '../hooks/useSelectMode';
import SelectToolbar from '../components/SelectToolbar';

const FILTER_CONFIG = [
  {
    key: 'file_type',
    label: 'Type',
    options: [
      { value: 'image',    label: 'Images' },
      { value: 'pdf',      label: 'PDF' },
      { value: 'document', label: 'Documents' },
      { value: 'video',    label: 'Videos' },
      { value: 'audio',    label: 'Audio' },
      { value: 'other',    label: 'Other' },
    ],
  },
  {
    key: 'uploaded',
    label: 'Uploaded',
    options: [
      { value: 'today', label: 'Today' },
      { value: 'week',  label: 'This week' },
      { value: 'month', label: 'This month' },
    ],
  },
];

const SORT_OPTIONS = [
  { value: 'uploaded_at',  label: 'Oldest' },
  { value: '-file_size',   label: 'Largest' },
  { value: 'file_size',    label: 'Smallest' },
];

export default function FileManagerPage() {
  const dispatch = useDispatch();
  const { files, pagination, loading, searchQuery } = useSelector((s) => s.files);

  const [searchInput, setSearchInput]             = useState(searchQuery);
  const [viewMode, handleViewMode]                 = useViewMode('list');
  const [isModalOpen, setIsModalOpen]             = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [activeFile, setActiveFile]               = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete]           = useState(null);
  const { showToast }                              = useToast();
  const [selectedFile, setSelectedFile]           = useState(null);
  const [currentPage, setCurrentPage]             = useState(1);
  const [totalPages, setTotalPages]               = useState(1);
  const pageSize                                   = 12;

  // AI Insights — shown only when user clicks "Analyse"
  const [aiInsight, setAiInsight]               = useState('');
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightVisible, setAiInsightVisible] = useState(false);

  const [filters, setFilters]       = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const [ordering, setOrdering]     = useState('-uploaded_at');

  const safeFiles       = Array.isArray(files) ? files : [];
  const insightCacheRef = useRef({});
  const scrollPositionRef = useRef(0);

  const {
    selectMode, selectedIds,
    toggleSelectMode, toggleSelectFile,
    toggleSelectAll, clearSelection,
    allSelected, someSelected,
  } = useSelectMode(safeFiles);

  const saveScroll    = () => { scrollPositionRef.current = window.scrollY; };
  const restoreScroll = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    });
  };

  useBodyScrollLock(!!selectedFile || isModalOpen || isRenameModalOpen || isDeleteModalOpen);

  useEffect(() => {
    const close = () => setOpenFilter(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    const params = { ordering, ...filters };
    dispatch(fetchFiles(currentPage, pageSize, searchQuery, params));
  }, [dispatch, currentPage, pageSize, searchQuery, JSON.stringify(filters), ordering]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput.trim() !== searchQuery) {
        dispatch(setSearchQuery(searchInput.trim()));
        setCurrentPage(1);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [dispatch, searchInput, searchQuery]);

  useEffect(() => {
    if (pagination) {
      setCurrentPage(pagination.currentPage || 1);
      setTotalPages(Math.ceil((pagination.count || 0) / pageSize) || 1);
    }
  }, [pagination, pageSize]);

  // Reset AI insight panel when a different file is selected
  useEffect(() => {
    setAiInsight('');
    setAiInsightVisible(false);
    setAiInsightLoading(false);
  }, [selectedFile?.id]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    const params = { ordering, ...filters };
    await dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery, params));
    restoreScroll();
  };

  const handleSortChange = (value) => { setOrdering(value); setCurrentPage(1); };

  const handleNameSort = () => {
    handleSortChange(ordering === 'original_name' ? '-original_name' : 'original_name');
  };

  const isNameSort = ordering === 'original_name' || ordering === '-original_name';
  const nameAsc    = ordering === 'original_name';

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const updated = { ...prev };
      if (updated[key] === value) delete updated[key];
      else updated[key] = value;
      return updated;
    });
    setCurrentPage(1);
    setOpenFilter(null);
  };

  const clearFilters = () => { setFilters({}); setCurrentPage(1); };

  const activeFilterCount = Object.keys(filters).length;

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    dispatch(fetchFiles(newPage, pageSize, searchQuery, { ordering, ...filters }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteTrigger = (file) => { setFileToDelete(file); setIsDeleteModalOpen(true); };

  const handleBulkMoveToTrash = async () => {
    if (!someSelected) return;
    try {
      let successCount = 0;
      for (const id of selectedIds) {
        try { await deleteFileApi(id); successCount++; }
        catch (err) { if (err.response?.status !== 404) throw err; }
      }
      showToast(`${successCount} file(s) moved to trash.`);
      clearSelection();
      const remainingOnPage = safeFiles.filter(f => !selectedIds.includes(f.id)).length;
      const newPage = remainingOnPage === 0 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await dispatch(fetchFiles(newPage, pageSize, searchQuery, { ordering, ...filters }));
    } catch { showToast('Failed to move some files to trash.'); }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    try {
      await deleteFileApi(fileToDelete.id);
      showToast('File moved to trash');
      const newPage = safeFiles.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      setCurrentPage(newPage);
      await dispatch(fetchFiles(newPage, pageSize, searchQuery, { ordering, ...filters }));
      setIsDeleteModalOpen(false);
      setSelectedFile(null);
      setFileToDelete(null);
      restoreScroll();
    } catch { showToast('Failed to delete file'); }
  };

  const handleToggleStar = async (file, e) => {
    if (e) e.stopPropagation();
    try {
      const result = await dispatch(toggleFileStar(file.id));
      if (selectedFile?.id === file.id)
        setSelectedFile(prev => prev ? { ...prev, is_starred: result.is_starred } : null);
      showToast(result.is_starred ? 'Added to Starred' : 'Removed from Starred');
    } catch { showToast('Failed to update star'); }
  };

  const handleFileSelect = (file) => {
    if (selectedFile && selectedFile.id === file.id && file.url) window.open(file.url, '_blank');
    else setSelectedFile(file);
  };

  const handleOpenInNewTab = () => { if (selectedFile?.url) window.open(selectedFile.url, '_blank'); };

  // ─── AI Insights ─────────────────────────────────────────────────────────────

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchAiInsight = async (file) => {
    // Return cached result immediately
    if (insightCacheRef.current[file.id]) {
      setAiInsight(insightCacheRef.current[file.id]);
      setAiInsightVisible(true);
      return;
    }

    setAiInsightLoading(true);
    setAiInsightVisible(true);
    setAiInsight('');

    const ext     = file.original_name?.split('.').pop()?.toLowerCase();
    const isImage = ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);
    const isPDF   = ext === 'pdf';
    const isText  = ['txt','js','py','html','css','json','csv','md','ts','tsx','jsx'].includes(ext);
    const isVideo = ['mp4','webm','mov','avi','mkv'].includes(ext);
    const isAudio = ['mp3','wav','aac','flac','m4a','ogg'].includes(ext);

    try {
      let contents = [];

      if (isImage) {
        // Fetch and base64-encode the image, send it to Gemini vision
        const imgRes  = await fetch(file.url);
        const blob    = await imgRes.blob();
        const base64  = await new Promise((res) => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
        const mimeType = blob.type || `image/${ext}`;

        contents = [{
          parts: [
            { inline_data: { mime_type: mimeType, data: base64 } },
            { text: 'Describe what this image contains in 2-3 sentences. Be specific about the content, objects, people, text, or scene visible. No preamble, no "This image shows" — just describe directly.' },
          ],
        }];

      } else if (isPDF || isText) {
        // Fetch raw text content and send excerpt to Gemini
        const textRes  = await fetch(file.url);
        const textBody = await textRes.text();
        const snippet  = textBody.slice(0, 4000);

        contents = [{
          parts: [{
            text: `Analyse this file and describe what it contains in 2-3 sentences. Be specific about the actual content — mention key topics, data, names, or structure you see. Do not say "this file contains" — just describe the content directly.

File name: ${file.original_name}
Content:
${snippet}`,
          }],
        }];

      } else if (isVideo || isAudio) {
        // Media files — describe based on filename heuristics via Gemini
        contents = [{
          parts: [{
            text: `Based on this filename, describe in 1-2 sentences what this ${isVideo ? 'video' : 'audio'} file likely contains. Use the filename words as clues. Be specific and natural — no generic responses.

Filename: ${file.original_name}
Size: ${formatFileSize(file.file_size)}`,
          }],
        }];

      } else {
        // Generic files
        contents = [{
          parts: [{
            text: `Based on the filename and metadata below, describe in 1-2 sentences what this file likely contains or is used for. Be specific, no generic answers.

Filename: ${file.original_name}
Type: ${file.file_type || ext}
Size: ${formatFileSize(file.file_size)}
Uploaded: ${new Date(file.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          }],
        }];
      }

     const response = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models?key=${import.meta.env.VITE_GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

const data = await res.json();
console.log(data.models.map(m => m.name));
    

      // Surface any API-level error clearly
      if (data.error) {
        console.error('Gemini API error:', data.error);
        throw new Error(data.error.message);
      }

      const text    = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const insight = text?.trim() || 'Could not generate an insight for this file.';
      insightCacheRef.current[file.id] = insight;
      setAiInsight(insight);

    } catch (err) {
      console.error('AI insight error:', err);
      setAiInsight(`Could not analyse this file: ${err.message || 'Unknown error'}`);
    } finally {
      setAiInsightLoading(false);
    }
  };

  const handleAnalyseClick = () => {
    if (selectedFile) fetchAiInsight(selectedFile);
  };

  const handleRegenerateClick = () => {
    if (selectedFile) {
      delete insightCacheRef.current[selectedFile.id];
      fetchAiInsight(selectedFile);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getFileIcon = (file) => {
    const type = (file?.file_type || '').toLowerCase();
    const name = (file?.original_name || '').toLowerCase();
    if (type.includes('pdf') || type.includes('text') || name.match(/\.(pdf|txt|docx|doc|xls|xlsx)$/))
      return <FileText size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    if (type.includes('image') || name.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp)$/))
      return <ImageIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    if (type.includes('audio') || name.match(/\.(mp3|wav|aac|flac|m4a|ogg)$/))
      return <Music size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    if (type.includes('video') || name.match(/\.(mp4|webm|mov|avi|mkv)$/))
      return <Video size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
    return <FileIcon size={viewMode === 'grid' ? 40 : 20} className="text-rose" />;
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
      mp4: 'Video File', webm: 'Video File', mov: 'Video File',
      mp3: 'Audio File', wav: 'Audio File', aac: 'Audio File',
      flac: 'Audio File', m4a: 'Audio File', ogg: 'Audio File',
      js: 'JavaScript File', py: 'Python File',
      html: 'HTML File', css: 'CSS File', json: 'JSON File',
    };
    if (['jpg','jpeg','png','svg','webp','bmp'].includes(extension))
      return `Image (${extension.toUpperCase()})`;
    return fileTypes[extension] || 'Unknown File';
  };

  const sortBtnStyle = (active) => ({
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '5px 12px', borderRadius: '20px', fontSize: '12px',
    fontWeight: '500', cursor: 'pointer',
    border: active ? '1px solid #e11d48' : '1px solid #27272a',
    background: active ? 'rgba(225,29,72,0.1)' : 'transparent',
    color: active ? '#f43f5e' : '#71717a',
    transition: 'all 0.15s ease', whiteSpace: 'nowrap',
  });

  const openInNewTabBtnStyle = {
    position: 'absolute', top: '10px', right: '10px',
    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)',
    color: '#fff', fontSize: '12px', padding: '5px 10px',
    borderRadius: '6px', cursor: 'pointer', zIndex: 10,
    display: 'flex', alignItems: 'center', gap: '4px',
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

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
                      {filters[key] === opt.value && <span style={{ color: '#e11d48', marginRight: '4px' }}>✓</span>}
                      {opt.label}
                    </button>
                  ))}
                  {filters[key] && (
                    <button className="ps-filter-clear-one" onClick={() => handleFilterChange(key, filters[key])}>
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

        {/* Sort bar + Select toolbar + View toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '16px 0', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <SelectToolbar
              files={safeFiles}
              selectMode={selectMode}
              selectedIds={selectedIds}
              allSelected={allSelected}
              someSelected={someSelected}
              onToggleSelectMode={toggleSelectMode}
              onToggleSelectAll={toggleSelectAll}
              onBulkDelete={handleBulkMoveToTrash}
              actionLoading={null}
            />
            {!selectMode && (
              <>
                <button style={sortBtnStyle(isNameSort)} onClick={handleNameSort}>
                  Name {isNameSort ? (nameAsc ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
                </button>
                {SORT_OPTIONS.map(opt => (
                  <button key={opt.value} style={sortBtnStyle(ordering === opt.value)} onClick={() => handleSortChange(opt.value)}>
                    {opt.label}
                  </button>
                ))}
                {ordering !== '-uploaded_at' && (
                  <button style={sortBtnStyle(false)} onClick={() => handleSortChange('-uploaded_at')}>
                    <X size={12} /> Reset
                  </button>
                )}
              </>
            )}
          </div>
          <ViewToggle viewMode={viewMode} onChange={handleViewMode} />
        </div>

        {/* File list */}
        <section className="file-list-container">
          {loading ? (
            <div className="fm-empty-state"><div className="fm-spinner" /></div>
          ) : safeFiles.length === 0 ? (
            <div className="fm-empty-state">
              <FileIcon size={60} color="#27272a" strokeWidth={1} />
              <h2 style={{ marginTop: '20px', color: 'white' }}>
                {activeFilterCount > 0 ? 'No files match your filters' : 'No files yet'}
              </h2>
              {activeFilterCount > 0 && (
                <button onClick={clearFilters} style={{ marginTop: '12px', background: 'none', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <FileGrid
              files={safeFiles}
              viewMode={viewMode}
              onSelect={selectMode ? undefined : handleFileSelect}
              onStar={handleToggleStar}
              onRename={(file) => { saveScroll(); setActiveFile(file); setIsRenameModalOpen(true); }}
              onShare={(file) => { saveScroll(); setActiveFile(file); setIsModalOpen(true); }}
              onDownload={(file) => dispatch(downloadFile(file.id, file.original_name))}
              onDelete={(file) => { saveScroll(); handleDeleteTrigger(file); }}
              getFileIcon={getFileIcon}
              formatFileSize={formatFileSize}
              selectMode={selectMode}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelectFile}
            />
          )}
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} loading={loading} />
        </section>

        <footer className="fm-footer">CloudShare - Secure file sharing, built for teams.</footer>
      </main>

      {/* ── File Details Modal ── */}
      {selectedFile && (
        <div className="modal-overlay" onClick={() => setSelectedFile(null)}>
          <div className="file-details-modal fade-in-up" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header-section">
              <h3>File Details</h3>
              <button className="close-sidebar" onClick={() => setSelectedFile(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Preview area */}
            {(() => {
              const ext     = selectedFile.original_name?.split('.').pop()?.toLowerCase();
              const isImage = ['jpg','jpeg','png','gif','svg','webp','bmp'].includes(ext);
              const isPDF   = ext === 'pdf';
              const isVideo = ['mp4','webm','mov','avi','mkv'].includes(ext);
              const isAudio = ['mp3','wav','ogg','aac','flac','m4a'].includes(ext);

              if (isVideo) return (
                <div className="modal-preview-box" style={{ cursor: 'default' }}>
                  <video src={selectedFile?.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000', display: 'block' }} />
                  <button onClick={handleOpenInNewTab} style={openInNewTabBtnStyle}>↗ Open</button>
                </div>
              );

              if (isPDF) return (
                <div className="modal-preview-box" style={{ cursor: 'default' }}>
                  <iframe
                    src={`${selectedFile?.url}#toolbar=0&scrollbar=0&navpanes=0&view=FitH`}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    title="PDF Preview"
                  />
                  <button onClick={(e) => { e.stopPropagation(); handleOpenInNewTab(); }} style={openInNewTabBtnStyle}>↗ Open</button>
                </div>
              );

              if (isAudio) return (
                <div className="modal-preview-box" style={{ cursor: 'default', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ opacity: 0.15 }}>{getFileIcon(selectedFile)}</div>
                  <audio src={selectedFile?.url} controls style={{ width: '85%', accentColor: '#e11d48' }} />
                  <button onClick={handleOpenInNewTab} style={openInNewTabBtnStyle}>↗ Open</button>
                </div>
              );

              return (
                <div className="modal-preview-box modal-preview-clickable" onClick={handleOpenInNewTab} title="Click to open in new tab">
                  {isImage
                    ? <img src={selectedFile?.url} alt="Preview" className="modal-img-preview" />
                    : (
                      <div className="modal-icon-placeholder">
                        {getFileIcon(selectedFile)}
                        <span style={{ fontSize: '12px', color: '#71717a', marginTop: '8px', display: 'block' }}>Preview not available</span>
                      </div>
                    )
                  }
                  <div className="preview-open-overlay">
                    <span className="preview-open-label">Open in new tab ↗</span>
                  </div>
                </div>
              );
            })()}

            <div className="modal-body-content">

              {/* Filename + star */}
              <div className="detail-title-row">
                <h2 className="detail-filename">{selectedFile.original_name}</h2>
                <div
                  onClick={(e) => handleToggleStar(selectedFile, e)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', width: 'fit-content', color: selectedFile.is_starred ? '#fbbf24' : '#52525b', fontSize: '12px', marginTop: '4px' }}
                >
                  <Star size={13} fill={selectedFile.is_starred ? '#fbbf24' : 'none'} color={selectedFile.is_starred ? '#fbbf24' : '#52525b'} />
                  {selectedFile.is_starred ? 'Starred' : 'Add to starred'}
                </div>
              </div>

              {/* Metadata grid */}
              <div className="detail-info-grid">
                <div className="info-group"><label>Size</label><span>{formatFileSize(selectedFile.file_size)}</span></div>
                <div className="info-group"><label>Type</label><span>{getReadableFileType(selectedFile)}</span></div>
                <div className="info-group">
                  <label>Uploaded</label>
                  <span>{new Date(selectedFile.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="sidebar-actions-main">
                <button className="sidebar-btn-share" onClick={() => { setActiveFile(selectedFile); setIsRenameModalOpen(true); setSelectedFile(null); }}>
                  <Edit2 size={16} /> Edit
                </button>
                <button onClick={() => { dispatch(downloadFile(selectedFile.id, selectedFile.original_name)); setSelectedFile(null); }}>
                  <Download size={16} /> Download
                </button>
                <button className="sidebar-btn-share" onClick={() => { setActiveFile(selectedFile); setIsModalOpen(true); setSelectedFile(null); }}>
                  <Share2 size={16} /> Share
                </button>
                <button className="sidebar-btn-delete" onClick={() => { handleDeleteTrigger(selectedFile); setSelectedFile(null); }}>
                  <Trash2 size={16} /> Delete
                </button>
              </div>

              {/* ── AI Insights ── */}
              {!aiInsightVisible ? (
                // Button shown before analysis
                <button
                  onClick={handleAnalyseClick}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    border: '1px dashed #3f3f46', background: 'transparent',
                    color: '#71717a', fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: '8px', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#e11d48'; e.currentTarget.style.color = '#f43f5e'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#3f3f46'; e.currentTarget.style.color = '#71717a'; }}
                >
                  <Sparkles size={14} />
                  Analyse with AI
                </button>
              ) : (
                // Insight card shown after clicking Analyse
                <div className="ai-insights-card">
                  <div className="insights-header">
                    <div className="insights-title">
                      <Zap size={12} color="#e11d48" /> AI Insights
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="insights-regen"
                        onClick={handleRegenerateClick}
                        disabled={aiInsightLoading}
                      >
                        {aiInsightLoading ? 'Thinking...' : 'Regenerate'}
                      </button>
                      <button
                        className="insights-regen"
                        onClick={() => { setAiInsightVisible(false); setAiInsight(''); }}
                        style={{ color: '#52525b' }}
                      >
                        Hide
                      </button>
                    </div>
                  </div>

                  <p className="insights-text">
                    {aiInsightLoading
                      ? <span style={{ color: '#52525b', fontStyle: 'italic' }}>Analysing file...</span>
                      : aiInsight
                    }
                  </p>

                  <span className="insight-tag">
                    {selectedFile.original_name?.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      <ShareModal file={activeFile} isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setActiveFile(null); }} onRefresh={handleRefresh} />
      <RenameModal file={activeFile} isOpen={isRenameModalOpen} onClose={() => { setIsRenameModalOpen(false); setActiveFile(null); }} onRefresh={handleRefresh} />

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
    </>
  );
}