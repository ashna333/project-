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
import FilePreview from '../components/FilePreview';

// ─── Constants ────────────────────────────────────────────────────────────────

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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FileManagerPage() {
  const dispatch = useDispatch();
  const { files, pagination, loading, searchQuery } = useSelector((s) => s.files);

  const [searchInput, setSearchInput]             = useState(searchQuery);
  const [viewMode, handleViewMode]                = useViewMode('list');
  const [isModalOpen, setIsModalOpen]             = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [activeFile, setActiveFile]               = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete]           = useState(null);
  const { showToast }                             = useToast();
  const [selectedFile, setSelectedFile]           = useState(null);
  const [currentPage, setCurrentPage]             = useState(1);
  const [totalPages, setTotalPages]               = useState(1);
  const pageSize                                  = 12;

  // AI Insights
  const [aiInsight, setAiInsight]               = useState('');
  const [aiInsightLoading, setAiInsightLoading] = useState(false);
  const [aiInsightVisible, setAiInsightVisible] = useState(false);

  const [filters, setFilters]       = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const [ordering, setOrdering]     = useState('-uploaded_at');

  const safeFiles         = Array.isArray(files) ? files : [];
  const insightCacheRef   = useRef({});
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

  // ─── AI Insights ─────────────────────────────────────────────────────────────

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const fetchAiInsight = async (file) => {
  if (insightCacheRef.current[file.id]) {
    setAiInsight(insightCacheRef.current[file.id]);
    setAiInsightVisible(true);
    return;
  }

  setAiInsightLoading(true);
  setAiInsightVisible(true);
  setAiInsight('');

  const ext       = file.original_name?.split('.').pop()?.toLowerCase();
  const isImage   = ['jpg','jpeg','png','gif','webp','bmp','tiff','ico'].includes(ext);
  const isPDF     = ext === 'pdf';
  const isText    = ['txt','js','py','html','css','json','csv','md','ts','tsx','jsx','xml','rtf'].includes(ext);
  const isOffice  = ['doc','docx','xls','xlsx','ppt','pptx','odt','ods','odp'].includes(ext);
  const isVideo   = ['mp4','webm','mov','avi','mkv','flv','wmv'].includes(ext);
  const isAudio   = ['mp3','wav','aac','flac','m4a','ogg','wma'].includes(ext);
  const isArchive = ['zip','rar','7z','tar','gz'].includes(ext);

  try {
    let messages = [];
    let model = 'llama-3.1-8b-instant';

    if (isImage) {
      const imgRes  = await fetch(file.url);
      const blob    = await imgRes.blob();
      const base64  = await new Promise((res) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
      const mimeType = blob.type || `image/${ext}`;
      model    = 'meta-llama/llama-4-scout-17b-16e-instruct';
      messages = [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
          { type: 'text', text: 'Describe what this image contains in 2-3 sentences. Be specific about content, objects, people, text, or scene visible. No preamble.' },
        ],
      }];

    } else if (isPDF) {
  let pdfBase64 = null;
  try {
    // Load pdf.js — preload the worker as a blob to avoid timing issues
    const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
    
    // Wait for worker to be available
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

    const loadingTask = pdfjs.getDocument({ url: file.url, disableRange: true });
    const pdf         = await loadingTask.promise;
    const page        = await pdf.getPage(1);
    const viewport    = page.getViewport({ scale: 2 });
    const canvas      = document.createElement('canvas');
    canvas.width      = viewport.width;
    canvas.height     = viewport.height;
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
    pdfBase64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    console.log('PDF rendered OK, base64 length:', pdfBase64?.length);
  } catch (pdfErr) {
    console.warn('pdf.js failed:', pdfErr);
  }

  if (pdfBase64) {
    model    = 'meta-llama/llama-4-scout-17b-16e-instruct';
    messages = [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${pdfBase64}` } },
        { type: 'text', text: `This is the first page of a PDF named "${file.original_name}". Describe what this document is about in 2-3 sentences. Be specific about content, names, dates, or data visible. No preamble.` },
      ],
    }];
  } else {
    // Hard fallback — don't try to read binary, just use filename
    messages = [{
      role: 'user',
      content: `Based only on the filename, describe in 2 sentences what this PDF document likely contains.\n\nFilename: ${file.original_name}\nSize: ${formatFileSize(file.file_size)}`,
    }];
  }

    } else if (isText) {
      const textRes  = await fetch(file.url);
      const textBody = await textRes.text();
      messages = [{
        role: 'user',
        content: `Analyse this file and describe what it contains in 2-3 sentences. Mention key topics, data, or purpose. No preamble.\n\nFile: ${file.original_name}\nContent:\n${textBody.slice(0, 3000)}`,
      }];

    } else if (isOffice) {
      // Fetch binary and try to extract any readable strings
      const res    = await fetch(file.url);
      const buffer = await res.arrayBuffer();
      const bytes  = new Uint8Array(buffer);
      let readable = '';
      for (let i = 0; i < bytes.length && readable.length < 3000; i++) {
        if (bytes[i] >= 32 && bytes[i] < 127) readable += String.fromCharCode(bytes[i]);
        else readable += ' ';
      }
      const snippet = readable.replace(/\s+/g, ' ').match(/[A-Za-z]{3,}/g)?.join(' ').slice(0, 2000) || '';
      messages = [{
        role: 'user',
        content: `Describe what this ${ext?.toUpperCase()} Office document is about in 2-3 sentences. Use the filename and any readable content below.\n\nFilename: ${file.original_name}\nSize: ${formatFileSize(file.file_size)}\nReadable content: ${snippet || '(binary file, use filename only)'}`,
      }];

    } else if (isVideo) {
      // Capture a frame from the video
      let videoBase64 = null;
      try {
        videoBase64 = await new Promise((resolve, reject) => {
          const video    = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.src      = file.url;
          video.muted    = true;
          video.currentTime = 2;
          video.onloadeddata = () => {
            video.currentTime = 2;
          };
          video.onseeked = () => {
            const canvas  = document.createElement('canvas');
            canvas.width  = video.videoWidth  || 640;
            canvas.height = video.videoHeight || 360;
            canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
          };
          video.onerror = reject;
          setTimeout(() => reject(new Error('Video load timeout')), 8000);
        });
      } catch (e) {
        console.warn('Video frame capture failed', e);
      }

      if (videoBase64) {
        model    = 'meta-llama/llama-4-scout-17b-16e-instruct';
        messages = [{
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${videoBase64}` } },
            { type: 'text', text: `This is a frame from a video file named "${file.original_name}". Describe what this video appears to be about in 2 sentences based on what you see. No preamble.` },
          ],
        }];
      } else {
        messages = [{
          role: 'user',
          content: `Based on this video filename, describe in 2 sentences what it likely contains.\n\nFilename: ${file.original_name}\nSize: ${formatFileSize(file.file_size)}`,
        }];
      }

    } else if (isAudio) {
      messages = [{
        role: 'user',
        content: `Based on this audio filename, describe in 2 sentences what it likely is — is it music, a podcast, a recording, a sound effect? Use the filename words as clues.\n\nFilename: ${file.original_name}\nSize: ${formatFileSize(file.file_size)}`,
      }];

    } else if (isArchive) {
      messages = [{
        role: 'user',
        content: `Based on this archive filename, describe in 2 sentences what it likely contains.\n\nFilename: ${file.original_name}\nSize: ${formatFileSize(file.file_size)}`,
      }];

    } else {
      messages = [{
        role: 'user',
        content: `Based on filename and metadata, describe in 2 sentences what this file likely is and its purpose.\n\nFilename: ${file.original_name}\nType: ${file.file_type || ext}\nSize: ${formatFileSize(file.file_size)}`,
      }];
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_GROQ_KEY}`,
      },
      body: JSON.stringify({ model, max_tokens: 250, messages }),
    });

    const data    = await response.json();
    const insight = data.choices?.[0]?.message?.content?.trim();

    if (!insight) {
      console.error('Groq empty response:', data);
      throw new Error(data.error?.message || 'Empty response from AI');
    }

    // Only cache successful results
    insightCacheRef.current[file.id] = insight;
    setAiInsight(insight);

  } catch (err) {
    console.error('AI insight error:', err);
    setAiInsight(`Could not analyse this file: ${err.message || 'Unknown error'}`);
    // Don't cache errors so user can retry
  } finally {
    setAiInsightLoading(false);
  }
};
  const handleAnalyseClick    = () => { if (selectedFile) fetchAiInsight(selectedFile); };
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
      md: 'Markdown File', xml: 'XML File',
    };
    if (['jpg','jpeg','png','svg','webp','bmp'].includes(extension))
      return `Image (${extension?.toUpperCase()})`;
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
                <button
                  onClick={clearFilters}
                  style={{ marginTop: '12px', background: 'none', border: '1px solid #3f3f46', color: '#a1a1aa', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}
                >
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            loading={loading}
          />
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

            {/* ── Preview ── */}
            <FilePreview file={selectedFile} />

            <div className="modal-body-content">

              {/* Filename + star */}
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

              {/* Metadata grid */}
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
                  <span>{new Date(selectedFile.uploaded_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="sidebar-actions-main">
                <button
                  className="sidebar-btn-share"
                  onClick={() => { setActiveFile(selectedFile); setIsRenameModalOpen(true); setSelectedFile(null); }}
                >
                  <Edit2 size={16} /> Edit
                </button>
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

              {/* ── AI Insights ── */}
              {!aiInsightVisible ? (
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
              <button className="btn-revoke" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}