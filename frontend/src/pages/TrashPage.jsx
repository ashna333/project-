import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { destroyTrashFileApi, fetchTrashApi, restoreTrashFileApi } from '../api/fileApi'

const PAGE_SIZE = 8

const IconRestore = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
)

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3,6 5,6 21,6" />
    <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" />
  </svg>
)

const IconFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14,2 14,8 20,8" />
  </svg>
)

const fileBadge = (mimeType = '', fileName = '') => {
  if (mimeType.startsWith('image/')) return { label: 'IMG', color: '#0f6e56', bg: '#e1f5ee' }
  if (mimeType.startsWith('video/')) return { label: 'VID', color: '#185fa5', bg: '#e6f1fb' }
  if (mimeType.includes('pdf')) return { label: 'PDF', color: '#993c1d', bg: '#faece7' }
  if (mimeType.includes('sheet') || fileName.endsWith('.xlsx')) return { label: 'XLS', color: '#3b6d11', bg: '#eaf3de' }
  if (mimeType.includes('zip') || fileName.endsWith('.zip')) return { label: 'ZIP', color: '#854f0b', bg: '#faeeda' }
  return { label: 'FILE', color: '#5f5e5a', bg: '#f1efe8' }
}

const formatDate = (value) =>
  value ? new Date(value).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'

export default function TrashPage() {
  const [files, setFiles] = useState([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(null) // fileId or 'all-restore' | 'all-delete'
  const [selected, setSelected] = useState(new Set())
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const loadTrash = async (targetPage = page) => {
    setLoading(true)
    try {
      const { data } = await fetchTrashApi(targetPage, PAGE_SIZE, '')
      setFiles(data.results?.files || [])
      setCount(data.count || 0)
      setSelected(new Set())
    } catch {
      showToast('error', 'Failed to load trash.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTrash(page) }, [page])

  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === files.length) setSelected(new Set())
    else setSelected(new Set(files.map(f => f.id)))
  }

  const handleRestore = async (fileId) => {
    setActionLoading(fileId)
    try {
      await restoreTrashFileApi(fileId)
      showToast('success', 'File restored successfully.')
      loadTrash(page)
    } catch {
      showToast('error', 'Failed to restore file.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (fileId) => {
    if (!window.confirm('Permanently delete this file? This cannot be undone.')) return
    setActionLoading(fileId)
    try {
      await destroyTrashFileApi(fileId)
      showToast('success', 'File permanently deleted.')
      loadTrash(page)
    } catch {
      showToast('error', 'Failed to delete file.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreSelected = async () => {
    if (!selected.size) return
    if (!window.confirm(`Restore ${selected.size} file(s)?`)) return
    setActionLoading('bulk')
    try {
      await Promise.all([...selected].map(id => restoreTrashFileApi(id)))
      showToast('success', `${selected.size} file(s) restored.`)
      loadTrash(page)
    } catch {
      showToast('error', 'Some files could not be restored.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteSelected = async () => {
    if (!selected.size) return
    if (!window.confirm(`Permanently delete ${selected.size} file(s)? This cannot be undone.`)) return
    setActionLoading('bulk')
    try {
      await Promise.all([...selected].map(id => destroyTrashFileApi(id)))
      showToast('success', `${selected.size} file(s) permanently deleted.`)
      loadTrash(page)
    } catch {
      showToast('error', 'Some files could not be deleted.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreAll = async () => {
    if (!files.length) return
    if (!window.confirm(`Restore all ${count} file(s) in trash?`)) return
    setActionLoading('all-restore')
    try {
      await Promise.all(files.map(f => restoreTrashFileApi(f.id)))
      showToast('success', 'All files restored.')
      loadTrash(1)
      setPage(1)
    } catch {
      showToast('error', 'Some files could not be restored.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmptyTrash = async () => {
    if (!files.length) return
    if (!window.confirm(`Permanently delete ALL ${count} file(s) in trash? This cannot be undone.`)) return
    setActionLoading('all-delete')
    try {
      await Promise.all(files.map(f => destroyTrashFileApi(f.id)))
      showToast('success', 'Trash emptied.')
      loadTrash(1)
      setPage(1)
    } catch {
      showToast('error', 'Some files could not be deleted.')
    } finally {
      setActionLoading(null)
    }
  }

  const isAllSelected = files.length > 0 && selected.size === files.length

  return (
    <AppShell title="Trash" subtitle="Deleted files are stored here until you restore or permanently delete them.">
      {toast && (
        <div className={`toast-box ${toast.type === 'success' ? 'success' : 'error'}`}>
          {toast.message}
        </div>
      )}

      <div className="trash-layout">
        <div className="dashboard-panel trash-header-panel">
          <div className="trash-title-wrap">
            <div className="trash-icon-box">
              <IconTrash />
            </div>
            <div>
              <div className="trash-title">Trash</div>
              <div className="dashboard-list-meta">{count} file{count !== 1 ? 's' : ''} deleted</div>
            </div>
          </div>

          <div className="trash-actions">
            {selected.size > 0 && (
              <>
                <button
                  className="btn-sm"
                  onClick={handleRestoreSelected}
                  disabled={actionLoading === 'bulk'}
                >
                  <IconRestore /> Restore {selected.size} selected
                </button>
                <button
                  className="btn-sm"
                  onClick={handleDeleteSelected}
                  disabled={actionLoading === 'bulk'}
                >
                  <IconTrash /> Delete {selected.size} selected
                </button>
              </>
            )}
            {files.length > 0 && selected.size === 0 && (
              <>
                <button
                  className="btn-sm"
                  onClick={handleRestoreAll}
                  disabled={!!actionLoading}
                >
                  <IconRestore /> {actionLoading === 'all-restore' ? 'Restoring...' : 'Restore all'}
                </button>
                <button
                  className="btn-sm"
                  onClick={handleEmptyTrash}
                  disabled={!!actionLoading}
                >
                  <IconTrash /> {actionLoading === 'all-delete' ? 'Deleting...' : 'Empty trash'}
                </button>
              </>
            )}
          </div>
        </div>

        <section className="dashboard-panel trash-table-panel">
          {files.length > 0 && (
            <div className={`trash-select-all ${selected.size > 0 ? 'active' : ''}`}>
              <input
                type="checkbox"
                checked={isAllSelected}
                onChange={toggleSelectAll}
                className="trash-checkbox"
              />
              <span className="dashboard-list-meta">
                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
              </span>
            </div>
          )}

          {loading ? (
            <div className="trash-empty-state">
              Loading deleted files...
            </div>
          ) : files.length === 0 ? (
            <div className="trash-empty-state">
              <div className="trash-empty-icon">🗑</div>
              <div className="trash-title">Trash is empty</div>
              <div className="dashboard-list-meta">Deleted files will appear here</div>
            </div>
          ) : (
            <div className="trash-rows">
              {files.map((file, idx) => {
                const badge = fileBadge(file.mime_type, file.original_name)
                const isSelected = selected.has(file.id)
                const isActing = actionLoading === file.id
                return (
                  <div
                    key={file.id}
                    className={`trash-row ${isSelected ? 'selected' : ''} ${idx < files.length - 1 ? 'with-border' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(file.id)}
                      className="trash-checkbox"
                    />

                    <div className="trash-file-badge" style={{ background: badge.bg, color: badge.color }}>
                      {badge.label}
                    </div>

                    <div className="trash-file-main">
                      <div className="trash-file-name">
                        {file.original_name}
                      </div>
                      <div className="dashboard-list-meta">
                        {file.file_size_display} · Deleted {formatDate(file.deleted_at || file.uploaded_at)}
                      </div>
                    </div>

                    <div className="trash-row-actions">
                      <button
                        className="btn-sm"
                        onClick={() => handleRestore(file.id)}
                        disabled={!!actionLoading}
                        style={{ opacity: isActing ? 0.6 : 1 }}
                      >
                        <IconRestore />
                        {isActing ? '...' : 'Restore'}
                      </button>
                      <button
                        className="btn-sm"
                        onClick={() => handleDelete(file.id)}
                        disabled={!!actionLoading}
                        style={{ opacity: isActing ? 0.6 : 1 }}
                      >
                        <IconTrash />
                        Delete
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="pagination-bar trash-pagination">
              <span>{count} file(s)</span>
              <div className="trash-pagination-actions">
                <button className="btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    className="btn-sm"
                    onClick={() => setPage(p)}
                    style={p === page ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : {}}
                  >
                    {p}
                  </button>
                ))}
                <button className="btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}