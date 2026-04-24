// src/components/FileCard.jsx
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { deleteFile, downloadFile, renameFile } from '../store/fileThunks'
import { clearMessages } from '../store/fileSlice'

const getFileIcon = (mimeType, name) => {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('zip') || mimeType.includes('rar') || name?.endsWith('.zip')) return '🗜️'
  if (mimeType.includes('word') || name?.endsWith('.docx')) return '📝'
  if (mimeType.includes('sheet') || name?.endsWith('.xlsx')) return '📊'
  if (mimeType.includes('presentation') || name?.endsWith('.pptx')) return '📊'
  if (mimeType.includes('text')) return '📃'
  return '📄'
}

const formatDate = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function FileCard({ file, viewMode }) {
  const dispatch = useDispatch()
  const [renaming, setRenaming] = useState(false)
  const [newName, setNewName] = useState(file.original_name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    await dispatch(downloadFile(file.id, file.original_name))
    setDownloading(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    dispatch(clearMessages())
    await dispatch(deleteFile(file.id))
    setConfirmDelete(false)
  }

  const handleRename = async () => {
    if (!newName.trim() || newName === file.original_name) { setRenaming(false); return }
    dispatch(clearMessages())
    const result = await dispatch(renameFile(file.id, newName.trim()))
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
          <button className="fm-btn-icon" title="Download" onClick={handleDownload} disabled={downloading}>
            {downloading ? '⏳' : '⬇'}
          </button>
          <button className="fm-btn-icon" title="Rename" onClick={() => setRenaming(true)}>✏️</button>
          <button
            className={`fm-btn-icon ${confirmDelete ? 'danger' : ''}`}
            title={confirmDelete ? 'Click again to confirm' : 'Delete'}
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
          >
            {confirmDelete ? '⚠ Sure?' : '🗑'}
          </button>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="file-card">
      <div className="file-card-icon">{getFileIcon(file.mime_type, file.original_name)}</div>

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
          </div>
        ) : (
          <span title={file.original_name}>{file.original_name}</span>
        )}
      </div>

      <div className="file-card-meta">
        <span>{file.file_size_display}</span>
        <span>{formatDate(file.uploaded_at)}</span>
      </div>

      <div className="file-card-actions">
        <button className="fm-btn-action" onClick={handleDownload} disabled={downloading}>
          {downloading ? '⏳' : '⬇'} Download
        </button>
        <button className="fm-btn-action" onClick={() => setRenaming(true)}>✏️ Rename</button>
        <button
          className={`fm-btn-action delete ${confirmDelete ? 'confirming' : ''}`}
          onClick={handleDelete}
          onBlur={() => setConfirmDelete(false)}
        >
          {confirmDelete ? '⚠ Confirm?' : '🗑 Delete'}
        </button>
      </div>
    </div>
  )
}