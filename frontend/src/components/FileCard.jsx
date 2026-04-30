// src/components/FileCard.jsx
import { useEffect, useRef, useState } from 'react'
import { useDispatch } from 'react-redux'
import { deleteFile, downloadFile, renameFile } from '../store/fileThunks'
import { clearMessages } from '../store/fileSlice'
import api from '../api/axiosInstance'

const splitNameAndExtension = (name = '') => {
  const lastDot = name.lastIndexOf('.')
  if (lastDot <= 0 || lastDot === name.length - 1) return { base: name, extension: '' }
  return { base: name.slice(0, lastDot), extension: name.slice(lastDot) }
}

const getFileIcon = (mimeType, name) => {
  if (!mimeType) return 'FILE'
  if (mimeType.startsWith('image/')) return 'IMG'
  if (mimeType.startsWith('video/')) return 'VID'
  if (mimeType.startsWith('audio/')) return 'AUD'
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.includes('zip') || mimeType.includes('rar') || name?.endsWith('.zip')) return 'ZIP'
  if (mimeType.includes('word') || name?.endsWith('.docx')) return 'DOC'
  if (mimeType.includes('sheet') || name?.endsWith('.xlsx')) return 'XLS'
  if (mimeType.includes('presentation') || name?.endsWith('.pptx')) return 'PPT'
  if (mimeType.includes('text')) return 'TXT'
  return 'FILE'
}

const formatDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

const isPreviewable = (mime = '') =>
  mime.startsWith('image/') || mime.includes('pdf') || mime.startsWith('text/')

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const IconRename = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
  </svg>
)

const IconDelete = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </svg>
)

export default function FileCard({ file, viewMode, folderName, onOrganize, onShare }) {
  const dispatch = useDispatch()
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(file.original_name)
  const [downloading, setDownloading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [previewBlobUrl, setPreviewBlobUrl] = useState('')
  const menuRef = useRef(null)
  const { extension: originalExtension } = splitNameAndExtension(file.original_name)
  const isImage = file.mime_type?.startsWith('image/')
  const isPdf = file.mime_type?.includes('pdf')
  const isText = file.mime_type?.startsWith('text/')
  const previewUrl = file.url || file.file_url || file.download_url || null
  const canPreview = Boolean(previewUrl) && isPreviewable(file.mime_type || '')

  useEffect(() => {
    if (viewMode !== 'grid' || !canPreview || !previewUrl) {
      setPreviewBlobUrl('')
      return
    }
    let active = true
    let objectUrl = ''
    api.get(previewUrl, { responseType: 'blob' })
      .then(({ data }) => {
        if (!active) return
        objectUrl = URL.createObjectURL(data)
        setPreviewBlobUrl(objectUrl)
      })
      .catch(() => {
        setPreviewBlobUrl('')
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [viewMode, canPreview, previewUrl])

  useEffect(() => {
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const handleDownload = async () => {
    setDownloading(true)
    await dispatch(downloadFile(file.id, file.original_name))
    setDownloading(false)
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this file? It will move to Trash.')) return
    dispatch(clearMessages())
    await dispatch(deleteFile(file.id))
  }

  const handleRename = async () => {
    const trimmed = newName.trim()
    if (!trimmed || trimmed === file.original_name) { setRenaming(false); return }
    const { base } = splitNameAndExtension(trimmed)
    const normalizedName = originalExtension ? `${base}${originalExtension}` : trimmed
    dispatch(clearMessages())
    const result = await dispatch(renameFile(file.id, normalizedName))
    if (result.success) setRenaming(false)
  }

  if (viewMode === 'list') {
    return (
      <div className="file-list-row">
        <div className="file-list-icon">{getFileIcon(file.mime_type, file.original_name)}</div>
        <div className="file-list-name">
          {renaming ? (
            <div className="rename-inline">
              <input
                className="rename-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false) }}
                autoFocus
              />
              <button className="rename-save" onClick={handleRename}>✓</button>
              <button className="rename-cancel" onClick={() => { setRenaming(false); setNewName(file.original_name) }}>✕</button>
            </div>
          ) : (
            <span className="file-name-text">{file.original_name}</span>
          )}
        </div>
        <div className="file-list-size">{file.file_size_display}</div>
        <div className="file-list-date">{formatDate(file.uploaded_at)}</div>
        <div className="file-list-actions">
          <div className="fm-menu-wrap" ref={menuRef}>
            <button className="fm-btn-icon menu-trigger" title="More actions" onClick={() => setMenuOpen((v) => !v)}>•••</button>
            {menuOpen && (
              <div className="fm-context-menu">
                <button className="fm-menu-item" onClick={() => { setMenuOpen(false); handleDownload() }}><IconDownload />Download</button>
                <button className="fm-menu-item" onClick={() => { setMenuOpen(false); setRenaming(true) }}><IconRename />Rename</button>
                <button className="fm-menu-item" onClick={() => { setMenuOpen(false); onShare?.(file) }}>Share</button>
                <button className="fm-menu-item" onClick={() => { setMenuOpen(false); onOrganize?.(file) }}>Organize</button>
                <button className="fm-menu-item danger" onClick={() => { setMenuOpen(false); handleDelete() }}><IconDelete />Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="file-card">
      <div className="file-card-preview">
        {isImage && previewBlobUrl ? (
          <img src={previewBlobUrl} alt={file.original_name} className="file-card-image" />
        ) : isPdf && previewBlobUrl ? (
          <iframe title={file.original_name} src={`${previewBlobUrl}#toolbar=0`} className="file-card-frame" />
        ) : isText && previewBlobUrl ? (
          <iframe title={file.original_name} src={previewBlobUrl} className="file-card-frame" />
        ) : (
          <div className="file-card-icon">{getFileIcon(file.mime_type, file.original_name)}</div>
        )}
      </div>

      <div className="file-card-name">
        {renaming ? (
          <div className="rename-block">
            <input
              className="rename-input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setRenaming(false); setNewName(file.original_name) } }}
              autoFocus
            />
            <div className="rename-actions">
              <button className="rename-save" onClick={handleRename}>Save</button>
              <button className="rename-cancel" onClick={() => { setRenaming(false); setNewName(file.original_name) }}>Cancel</button>
            </div>
            {originalExtension ? <span className="rename-extension-note">Extension fixed: {originalExtension}</span> : null}
          </div>
        ) : (
          <span title={file.original_name}>{file.original_name}</span>
        )}
      </div>
      {folderName ? <div className="file-folder-chip">{folderName}</div> : null}

      <div className="file-card-meta">
        <span>{file.file_size_display}</span>
        <span>{formatDate(file.uploaded_at)}</span>
      </div>

      <div className="file-card-actions">
        <div className="fm-menu-wrap" ref={menuRef}>
          <button className="fm-btn-icon menu-trigger" title="More actions" onClick={() => setMenuOpen((v) => !v)}>•••</button>
          {menuOpen && (
            <div className="fm-context-menu">
              <button className="fm-menu-item" onClick={() => { setMenuOpen(false); handleDownload() }}><IconDownload />Download</button>
              <button className="fm-menu-item" onClick={() => { setMenuOpen(false); setRenaming(true) }}><IconRename />Rename</button>
              <button className="fm-menu-item" onClick={() => { setMenuOpen(false); onShare?.(file) }}>Share</button>
              <button className="fm-menu-item" onClick={() => { setMenuOpen(false); onOrganize?.(file) }}>Organize</button>
              <button className="fm-menu-item danger" onClick={() => { setMenuOpen(false); handleDelete() }}><IconDelete />Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}