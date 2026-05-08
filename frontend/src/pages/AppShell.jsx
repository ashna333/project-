import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AppShell from '../components/AppShell'
import { deleteFile, downloadFile, fetchFiles, renameFile } from '../store/fileThunks'
import { setPage, setSearchQuery, setViewMode } from '../store/fileSlice'
import { createShareApi, fetchSharesApi } from '../store/fileApi'

const getPages = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

const formatBytes = (v) => {
  if (!v) return '—'
  if (v < 1024) return `${v} B`
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`
  if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)} MB`
  return `${(v / 1024 ** 3).toFixed(2)} GB`
}

const formatDate = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

const EXT_COLORS = {
  IMG: { bg: '#fce8e6', color: '#c5221f', icon: '🖼' },
  PDF: { bg: '#fce8e6', color: '#c5221f', icon: '📄' },
  DOC: { bg: '#e8f0fe', color: '#1a73e8', icon: '📝' },
  XLS: { bg: '#e6f4ea', color: '#188038', icon: '📊' },
  FILE: { bg: '#f1f3f4', color: '#5f6368', icon: '📁' },
}

const getTypeLabel = (filename = '') => {
  const ext = filename.split('.').pop().toLowerCase()
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'IMG'
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'DOC'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return 'XLS'
  return ext ? ext.slice(0, 4).toUpperCase() : 'FILE'
}

const getPreviewKind = (file) => {
  const mime = (file?.mime_type || '').toLowerCase()
  const name = (file?.original_name || file?.file_name || '').toLowerCase()
  if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(name)) return 'image'
  if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf'
  return 'other'
}

const FileIcon = ({ filename, size = 44 }) => {
  const label = getTypeLabel(filename)
  const style = EXT_COLORS[label] || EXT_COLORS.FILE
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: style.bg,
        color: style.color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size < 36 ? 10 : 12,
        fontWeight: 700,
        flexShrink: 0,
        fontFamily: 'Google Sans, Roboto, sans-serif',
      }}
    >
      {label}
    </div>
  )
}

export default function FileManagerPage() {
  const dispatch = useDispatch()
  const { files, pagination, loading, error, successMessage, viewMode, searchQuery } = useSelector(
    (s) => s.files
  )

  const [searchInput, setSearchInput] = useState(searchQuery)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [activeTab, setActiveTab] = useState('my-drive')
  const [selectedIds, setSelectedIds] = useState([])
  const [folderNameInput, setFolderNameInput] = useState('')
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [shareForm, setShareForm] = useState({ recipient_email: '', expires_in_hours: 24, message: '' })
  const [shareFeedback, setShareFeedback] = useState('')
  const [shares, setShares] = useState([])
  const [activeFolder, setActiveFolder] = useState('all')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [meta, setMeta] = useState(() => {
    try {
      const raw = localStorage.getItem('cloudnest_file_meta')
      return raw ? JSON.parse(raw) : { starred: {}, folders: {}, folderList: [] }
    } catch {
      return { starred: {}, folders: {}, folderList: [] }
    }
  })

  useEffect(() => {
    dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery))
  }, [dispatch, pagination.currentPage, pagination.pageSize, searchQuery])

  useEffect(() => {
    fetchSharesApi(1, 100, '')
      .then(({ data }) => setShares(data.results?.shares || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => dispatch(setSearchQuery(searchInput.trim())), 300)
    return () => clearTimeout(t)
  }, [dispatch, searchInput])

  useEffect(() => {
    localStorage.setItem('cloudnest_file_meta', JSON.stringify(meta))
  }, [meta])

  const totalPages = Math.max(1, Math.ceil((pagination.count || 0) / pagination.pageSize))
  const visiblePages = useMemo(() => getPages(pagination.currentPage, totalPages), [pagination.currentPage, totalPages])
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const fileMap = useMemo(() => { const m = new Map(); files.forEach((f) => m.set(f.id, f)); return m }, [files])

  const startRename = (file) => { setRenamingId(file.id); setRenameValue(file.original_name || file.file_name || '') }
  const saveRename = async (fileId) => { const n = renameValue.trim(); if (!n) return; await dispatch(renameFile(fileId, n)); setRenamingId(null) }
  const handleDelete = async (fileId) => { await dispatch(deleteFile(fileId)); setConfirmDeleteId(null); setSelectedIds((p) => p.filter((id) => id !== fileId)) }
  const toggleSelected = (id) => setSelectedIds((p) => p.includes(id) ? p.filter((v) => v !== id) : [...p, id])
  const toggleSelectAll = (list) => {
    const ids = list.map((f) => f.id)
    const allSel = ids.every((id) => selectedSet.has(id))
    setSelectedIds((p) => allSel ? p.filter((id) => !ids.includes(id)) : Array.from(new Set([...p, ...ids])))
  }
  const createFolder = () => {
    const n = folderNameInput.trim()
    if (!n || meta.folderList.includes(n)) { setFolderNameInput(''); return }
    setMeta((p) => ({ ...p, folderList: [...p.folderList, n] }))
    setFolderNameInput('')
  }
  const moveSelectedToFolder = () => {
    if (!selectedIds.length || activeFolder === 'all') return
    setMeta((p) => { const nf = { ...p.folders }; selectedIds.forEach((id) => { nf[id] = activeFolder }); return { ...p, folders: nf } })
    setShareFeedback(`Moved ${selectedIds.length} file(s) to "${activeFolder}"`)
  }
  const toggleStar = (id) => setMeta((p) => { const s = { ...p.starred }; if (s[id]) delete s[id]; else s[id] = true; return { ...p, starred: s } })

  const folderScopedFiles = useMemo(() => activeFolder === 'all' ? files : files.filter((f) => meta.folders[f.id] === activeFolder), [files, meta.folders, activeFolder])
  const filteredFiles = useMemo(() => {
    if (activeTab === 'starred') return folderScopedFiles.filter((f) => Boolean(meta.starred[f.id]))
    if (activeTab === 'shared') return []
    return folderScopedFiles
  }, [activeTab, folderScopedFiles, meta.starred])

  const openShareModal = () => {
    if (!selectedIds.length && !(activeFolder !== 'all' && filteredFiles.length)) { setShareFeedback('Select files first.'); return }
    setShareForm({ recipient_email: '', expires_in_hours: 24, message: '' })
    setShareFeedback('')
    setShareModalOpen(true)
  }

  const shareSelected = async () => {
    const recipient = shareForm.recipient_email.trim()
    if (!recipient.includes('@')) { setShareFeedback('Enter a valid email.'); return }
    const targetIds = selectedIds.length ? selectedIds.filter((id) => fileMap.has(id)) : filteredFiles.map((f) => f.id)
    if (!targetIds.length) { setShareFeedback('No files to share.'); return }
    let ok = 0, fail = 0
    for (const fileId of targetIds) {
      try { await createShareApi({ file_id: fileId, recipient_email: recipient, expires_in_hours: Number(shareForm.expires_in_hours), message: shareForm.message }); ok++ }
      catch { fail++ }
    }
    fetchSharesApi(1, 100, '').then(({ data }) => setShares(data.results?.shares || [])).catch(() => {})
    setShareFeedback(fail ? `Shared ${ok}, failed ${fail}.` : `Shared ${ok} file(s) successfully.`)
    setShareModalOpen(false)
  }

  const tabs = [
    { key: 'my-drive', label: 'My Drive' },
    { key: 'shared', label: 'Shared with me' },
    { key: 'starred', label: 'Starred' },
  ]

  return (
    <AppShell title="My Drive" subtitle="">
      <div className="fm-root">
        {/* Toolbar */}
        <div className="fm-toolbar">
          <div className="fm-tabs">
            {tabs.map((t) => (
              <button key={t.key} className={`fm-tab ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="fm-toolbar-right">
            {activeTab !== 'shared' && selectedIds.length > 0 && (
              <span className="fm-sel-badge">{selectedIds.length} selected</span>
            )}
            {selectedIds.length > 0 && (
              <button className="fm-action-btn fm-share-btn" onClick={openShareModal}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/></svg>
                Share
              </button>
            )}
            <div className="fm-view-toggle">
              <button className={`fm-view-btn ${viewMode === 'grid' ? 'active' : ''}`} onClick={() => dispatch(setViewMode('grid'))} title="Grid view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h7v7H3zm0 11h7v7H3zm11-11h7v7h-7zm0 11h7v7h-7z"/></svg>
              </button>
              <button className={`fm-view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => dispatch(setViewMode('list'))} title="List view">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zm0-10v2h14V7H7z"/></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Upload section */}
        {activeTab !== 'shared' && (
          <div className="fm-upload-banner">
            <button className="fm-upload-toggle" onClick={() => setUploadOpen((v) => !v)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19.35 10.04A7.49 7.49 0 0012 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 000 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
              Upload files
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ transform: uploadOpen ? 'rotate(180deg)' : 'rotate(0)', transition: '0.2s' }}><path d="M7 10l5 5 5-5z"/></svg>
            </button>
            {uploadOpen && (
              <div className="fm-dropzone-area">
                <DropZone />
              </div>
            )}
          </div>
        )}

        {/* Folder bar */}
        {activeTab !== 'shared' && (
          <div className="fm-folder-bar">
            <div className="fm-folder-pills">
              <button className={`fm-folder-pill ${activeFolder === 'all' ? 'active' : ''}`} onClick={() => setActiveFolder('all')}>
                All files
              </button>
              {meta.folderList.map((folder) => (
                <button key={folder} className={`fm-folder-pill ${activeFolder === folder ? 'active' : ''}`} onClick={() => setActiveFolder(folder)}>
                  📁 {folder}
                </button>
              ))}
            </div>
            <div className="fm-folder-create">
              <input
                className="fm-folder-input"
                value={folderNameInput}
                onChange={(e) => setFolderNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createFolder()}
                placeholder="New folder name..."
              />
              <button className="fm-folder-add-btn" onClick={createFolder}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                Create
              </button>
            </div>
          </div>
        )}

        {/* Feedback */}
        {shareFeedback && (
          <div className="fm-feedback">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#188038"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
            {shareFeedback}
            <button className="fm-feedback-close" onClick={() => setShareFeedback('')}>✕</button>
          </div>
        )}

        {/* File area */}
        <div className="fm-file-area">
          {activeTab === 'shared' ? (
            <SharedTab shares={shares} />
          ) : (
            <>
              {error && <div className="fm-alert fm-alert-error">{error}</div>}
              {successMessage && <div className="fm-alert fm-alert-success">{successMessage}</div>}

              {/* File list header */}
              {!loading && filteredFiles.length > 0 && (
                <div className="fm-list-header">
                  <label className="fm-check-label">
                    <input
                      type="checkbox"
                      checked={filteredFiles.every((f) => selectedSet.has(f.id))}
                      onChange={() => toggleSelectAll(filteredFiles)}
                      className="fm-checkbox"
                    />
                    <span className="fm-col-name">Name</span>
                  </label>
                  <span className="fm-col-owner">Owner</span>
                  <span className="fm-col-modified">Last modified</span>
                  <span className="fm-col-size">File size</span>
                  <span className="fm-col-actions"></span>
                </div>
              )}

              {loading ? (
                <div className="fm-loading">
                  <div className="fm-spinner" />
                  <span>Loading files…</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="fm-empty">
                  <div className="fm-empty-icon">
                    {activeTab === 'starred' ? '⭐' : '📂'}
                  </div>
                  <h3 className="fm-empty-title">
                    {activeTab === 'starred' ? 'No starred files' : 'No files here'}
                  </h3>
                  <p className="fm-empty-sub">
                    {activeTab === 'starred' ? 'Star files to find them quickly.' : 'Upload files to get started.'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <GridView
                  files={filteredFiles}
                  meta={meta}
                  selectedSet={selectedSet}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  confirmDeleteId={confirmDeleteId}
                  setRenameValue={setRenameValue}
                  setRenamingId={setRenamingId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  toggleSelected={toggleSelected}
                  toggleStar={toggleStar}
                  startRename={startRename}
                  saveRename={saveRename}
                  handleDelete={handleDelete}
                  dispatch={dispatch}
                  downloadFile={downloadFile}
                />
              ) : (
                <ListView
                  files={filteredFiles}
                  meta={meta}
                  selectedSet={selectedSet}
                  renamingId={renamingId}
                  renameValue={renameValue}
                  confirmDeleteId={confirmDeleteId}
                  setRenameValue={setRenameValue}
                  setRenamingId={setRenamingId}
                  setConfirmDeleteId={setConfirmDeleteId}
                  toggleSelected={toggleSelected}
                  toggleStar={toggleStar}
                  startRename={startRename}
                  saveRename={saveRename}
                  handleDelete={handleDelete}
                  dispatch={dispatch}
                  downloadFile={downloadFile}
                  moveSelectedToFolder={moveSelectedToFolder}
                  activeFolder={activeFolder}
                />
              )}

              {totalPages > 1 && (
                <div className="fm-pagination">
                  <button className="fm-page-btn" disabled={!pagination.previous} onClick={() => dispatch(setPage(Math.max(1, pagination.currentPage - 1)))}>← Prev</button>
                  <div className="fm-page-nums">
                    {visiblePages.map((p, i) =>
                      p === '...'
                        ? <span key={`e${i}`} className="fm-page-ellipsis">…</span>
                        : <button key={p} className={`fm-page-btn ${pagination.currentPage === p ? 'active' : ''}`} onClick={() => dispatch(setPage(p))}>{p}</button>
                    )}
                  </div>
                  <button className="fm-page-btn" disabled={!pagination.next} onClick={() => dispatch(setPage(Math.min(totalPages, pagination.currentPage + 1)))}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Share modal */}
      {shareModalOpen && (
        <div className="fm-overlay" onClick={() => setShareModalOpen(false)}>
          <div className="fm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fm-modal-header">
              <h3>Share files</h3>
              <button className="fm-modal-close" onClick={() => setShareModalOpen(false)}>✕</button>
            </div>
            <p className="fm-modal-sub">
              {selectedIds.length > 0 ? `Sharing ${selectedIds.length} file(s)` : `Sharing all files in "${activeFolder}"`}
            </p>
            <div className="fm-modal-field">
              <label className="fm-modal-label">Recipient email</label>
              <input className="fm-modal-input" type="email" value={shareForm.recipient_email} onChange={(e) => setShareForm((p) => ({ ...p, recipient_email: e.target.value }))} placeholder="user@example.com" />
            </div>
            <div className="fm-modal-field">
              <label className="fm-modal-label">Link expires in (hours)</label>
              <input className="fm-modal-input" type="number" min="1" max="720" value={shareForm.expires_in_hours} onChange={(e) => setShareForm((p) => ({ ...p, expires_in_hours: e.target.value }))} />
            </div>
            <div className="fm-modal-field">
              <label className="fm-modal-label">Message (optional)</label>
              <textarea className="fm-modal-textarea" value={shareForm.message} onChange={(e) => setShareForm((p) => ({ ...p, message: e.target.value }))} placeholder="Add a note…" />
            </div>
            {shareFeedback && <div className="fm-modal-feedback">{shareFeedback}</div>}
            <div className="fm-modal-actions">
              <button className="fm-modal-cancel" onClick={() => setShareModalOpen(false)}>Cancel</button>
              <button className="fm-modal-primary" onClick={shareSelected}>Send invite</button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}

function SharedTab({ shares }) {
  return (
    <div className="fm-shared">
      {shares.length === 0 ? (
        <div className="fm-empty">
          <div className="fm-empty-icon">🤝</div>
          <h3 className="fm-empty-title">No shared files</h3>
          <p className="fm-empty-sub">Files shared with you will appear here.</p>
        </div>
      ) : (
        <>
          <div className="fm-list-header">
            <span className="fm-col-name">Name</span>
            <span className="fm-col-owner">Shared with</span>
            <span className="fm-col-size">Status</span>
          </div>
          {shares.map((share) => (
            <div key={share.id} className="fm-list-row">
              <div className="fm-row-name">
                <FileIcon filename={share.file_name} size={36} />
                <span className="fm-row-title">{share.file_name}</span>
              </div>
              <span className="fm-col-owner fm-row-text">{share.recipient_email}</span>
              <span className={`fm-status-pill ${share.is_accessed ? 'opened' : share.is_expired ? 'expired' : 'pending'}`}>
                {share.is_accessed ? 'Opened' : share.is_expired ? 'Expired' : 'Pending'}
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function ListView({ files, meta, selectedSet, renamingId, renameValue, confirmDeleteId, setRenameValue, setRenamingId, setConfirmDeleteId, toggleSelected, toggleStar, startRename, saveRename, handleDelete, dispatch, downloadFile }) {
  return (
    <div className="fm-list">
      {files.map((file) => {
        const fileName = file.original_name || file.file_name || 'Untitled'
        const isRenaming = renamingId === file.id
        const isConfirming = confirmDeleteId === file.id
        const isStarred = Boolean(meta.starred[file.id])
        const isSelected = selectedSet.has(file.id)
        const folderLabel = meta.folders[file.id]
        return (
          <div key={file.id} className={`fm-list-row ${isSelected ? 'selected' : ''}`}>
            <div className="fm-row-name">
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(file.id)} className="fm-checkbox" />
              <FileIcon filename={fileName} size={36} />
              {isRenaming ? (
                <div className="fm-rename-inline">
                  <input className="fm-rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveRename(file.id); if (e.key === 'Escape') setRenamingId(null) }} />
                  <button className="fm-inline-btn" onClick={() => saveRename(file.id)}>Save</button>
                  <button className="fm-inline-btn" onClick={() => setRenamingId(null)}>Cancel</button>
                </div>
              ) : (
                <div>
                  <span className="fm-row-title">{fileName}</span>
                  {folderLabel && <span className="fm-folder-badge">📁 {folderLabel}</span>}
                </div>
              )}
            </div>
            <span className="fm-col-owner fm-row-text">Me</span>
            <span className="fm-col-modified fm-row-text">{formatDate(file.uploaded_at)}</span>
            <span className="fm-col-size fm-row-text">{file.file_size_display || formatBytes(file.file_size)}</span>
            <div className="fm-col-actions fm-row-actions">
              <button className={`fm-star-btn ${isStarred ? 'active' : ''}`} onClick={() => toggleStar(file.id)} title="Star">★</button>
              {!isRenaming && (
                <>
                  <button className="fm-action-icon-btn" onClick={() => dispatch(downloadFile(file.id, fileName))} title="Download">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zm-8 2V5h2v6h1.17L12 13.17 9.83 11H11zm-6 7h14v2H5z"/></svg>
                  </button>
                  <button className="fm-action-icon-btn" onClick={() => startRename(file)} title="Rename">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  </button>
                  {isConfirming ? (
                    <button className="fm-action-icon-btn danger" onClick={() => handleDelete(file.id)} title="Confirm delete">✓ Delete</button>
                  ) : (
                    <button className="fm-action-icon-btn" onClick={() => setConfirmDeleteId(file.id)} title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 3v1H4v2h1v13a2 2 0 002 2h10a2 2 0 002-2V6h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z"/></svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function GridView({ files, meta, selectedSet, renamingId, renameValue, confirmDeleteId, setRenameValue, setRenamingId, setConfirmDeleteId, toggleSelected, toggleStar, startRename, saveRename, handleDelete, dispatch, downloadFile }) {
  return (
    <div className="fm-grid">
      {files.map((file) => {
        const fileName = file.original_name || file.file_name || 'Untitled'
        const isRenaming = renamingId === file.id
        const isConfirming = confirmDeleteId === file.id
        const isStarred = Boolean(meta.starred[file.id])
        const isSelected = selectedSet.has(file.id)
        const kind = getPreviewKind(file)
        return (
          <div key={file.id} className={`fm-grid-card ${isSelected ? 'selected' : ''}`}>
            <div className="fm-grid-card-top">
              <input type="checkbox" checked={isSelected} onChange={() => toggleSelected(file.id)} className="fm-checkbox" />
              <button className={`fm-star-btn ${isStarred ? 'active' : ''}`} onClick={() => toggleStar(file.id)}>★</button>
            </div>
            <div className="fm-grid-preview">
              {kind === 'image' && file.url ? (
                <img src={file.url} alt={fileName} className="fm-grid-img" />
              ) : kind === 'pdf' && file.url ? (
                <iframe title={fileName} src={file.url} className="fm-grid-frame" />
              ) : (
                <div className="fm-grid-preview-fallback">
                  <FileIcon filename={fileName} size={48} />
                </div>
              )}
            </div>
            <div className="fm-grid-info">
              {isRenaming ? (
                <div className="fm-rename-block">
                  <input className="fm-rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') saveRename(file.id); if (e.key === 'Escape') setRenamingId(null) }} />
                  <div className="fm-rename-actions">
                    <button className="fm-inline-btn" onClick={() => saveRename(file.id)}>Save</button>
                    <button className="fm-inline-btn" onClick={() => setRenamingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <span className="fm-grid-name" title={fileName}>{fileName}</span>
              )}
              <span className="fm-grid-meta">{file.file_size_display || formatBytes(file.file_size)} · {formatDate(file.uploaded_at)}</span>
            </div>
            {!isRenaming && (
              <div className="fm-grid-actions">
                <button className="fm-action-icon-btn" onClick={() => dispatch(downloadFile(file.id, fileName))} title="Download">↓</button>
                <button className="fm-action-icon-btn" onClick={() => startRename(file)} title="Rename">✏</button>
                {isConfirming ? (
                  <button className="fm-action-icon-btn danger" onClick={() => handleDelete(file.id)}>✓ Del</button>
                ) : (
                  <button className="fm-action-icon-btn" onClick={() => setConfirmDeleteId(file.id)} title="Delete">🗑</button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}