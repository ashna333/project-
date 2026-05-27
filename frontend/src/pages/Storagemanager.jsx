import { useState, useEffect, useCallback, useRef } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  fetchStorageManagerSummary,
  fetchDuplicateGroups,
  deleteDuplicateGroup,
  fetchLargeFiles,
  fetchStaleDownloads,
  deleteStorageFiles,
  cleanAllStorage,
} from '../store/storageManagerThunks'
import '../styles/Storagemanager.css'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtSize(bytes) {
  if (!bytes) return '0 B'
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB'
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB'
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB'
  return bytes + ' B'
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function FileIcon({ mimeType = '', size = 18 }) {
  const color = '#71717a'
  if (mimeType.startsWith('image/'))
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
  if (mimeType.startsWith('video/'))
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><rect x="2" y="4" width="15" height="16" rx="2"/><path d="M17 8l5-3v14l-5-3V8z"/></svg>
  if (mimeType === 'application/pdf')
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h1.5a1.5 1.5 0 010 3H9v-3zm0 0V11"/></svg>
  if (mimeType.includes('zip') || mimeType.includes('archive'))
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5"><path d="M21 10V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-2"/><path d="M12 2v6m0 4v4m-2-2h4"/></svg>
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/>
    </svg>
  )
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="sm-spinner">
      <svg className="sm-spinner__icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
      </svg>
      Loading…
    </div>
  )
}

function Empty({ msg }) {
  return (
    <div className="sm-empty">
      <svg className="sm-empty__icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#27272a" strokeWidth="1.5">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
      </svg>
      {msg}
    </div>
  )
}

function Badge({ children, variant = 'danger' }) {
  return <span className={`sm-badge sm-badge--${variant}`}>{children}</span>
}

// ─── Preview Modal ────────────────────────────────────────────────────────────

function PreviewModal({ file, onClose }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!file) return null

  const mime = file.mime_type || ''
  const url  = file.file_url || file.file || ''

  const renderPreview = () => {
    if (mime.startsWith('image/'))
      return <img src={url} alt={file.original_name} className="sm-modal__preview-img" />
    if (mime.startsWith('video/'))
      return <video src={url} controls className="sm-modal__preview-video" />
    if (mime === 'application/pdf')
      return <iframe src={url} title={file.original_name} className="sm-modal__preview-iframe" />
    return (
      <div className="sm-modal__no-preview">
        <div className="sm-modal__no-preview-icon">
          <FileIcon mimeType={mime} size={28} />
        </div>
        <p className="sm-modal__no-preview-label">No preview available for this file type</p>
        <p className="sm-modal__no-preview-type">{mime || 'Unknown type'}</p>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="sm-btn-ghost sm-modal__open-link">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <path d="M15 3h6v6"/><path d="M10 14L21 3"/>
            </svg>
            Open file
          </a>
        )}
      </div>
    )
  }

  return (
    <div
      ref={overlayRef}
      className="sm-modal-overlay"
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
    >
      <div className="sm-modal">
        <div className="sm-modal__header">
          <div className="sm-modal__header-left">
            <div className="sm-modal__icon-wrap">
              <FileIcon mimeType={mime} size={15} />
            </div>
            <div>
              <p className="sm-modal__title">{file.original_name}</p>
              <p className="sm-modal__meta">{fmtSize(file.file_size)} · {fmtDate(file.uploaded_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="sm-btn-ghost" style={{ padding: '6px 8px', flexShrink: 0 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div className="sm-modal__body">{renderPreview()}</div>
      </div>
    </div>
  )
}

// ─── Storage Bar ──────────────────────────────────────────────────────────────

function StorageBar({ summary }) {
  if (!summary) return <div className="sm-storage-bar--skeleton" />

  const pct = Math.min(summary.used_percent, 100)
  const fillColor = pct >= 90
    ? 'linear-gradient(to right, #e11d48, #fb7185)'
    : pct >= 70
    ? 'linear-gradient(to right, #d97706, #fbbf24)'
    : 'linear-gradient(to right, #059669, #34d399)'
  const statusColor = pct >= 90 ? '#fb7185' : pct >= 70 ? '#fbbf24' : '#34d399'

  return (
    <div className="sm-storage-bar">
      <div className="sm-storage-bar__top">
        <div className="sm-storage-bar__left">
          <div className="sm-storage-bar__db-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="1.5">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <div>
            <p className="sm-storage-bar__label">Storage used</p>
            <p className="sm-storage-bar__used">
              {fmtSize(summary.used_bytes)}{' '}
              <span className="sm-storage-bar__of">of {fmtSize(summary.total_bytes)}</span>
            </p>
          </div>
        </div>
        {summary.recoverable_bytes > 0 && (
          <div className="sm-storage-bar__recoverable">
            <p className="sm-storage-bar__rec-label">Recoverable</p>
            <p className="sm-storage-bar__rec-value">~{fmtSize(summary.recoverable_bytes)}</p>
          </div>
        )}
      </div>

      <div className="sm-storage-bar__track">
        <div className="sm-storage-bar__fill" style={{ width: `${pct}%`, background: fillColor }} />
      </div>

      <div className="sm-storage-bar__bottom">
        <span className="sm-storage-bar__pct">{pct.toFixed(1)}% used</span>
        {pct >= 70 && (
          <span className="sm-storage-bar__warning" style={{ color: statusColor }}>
            {pct >= 90 ? '⚠ Critical — ' : '⚠ '}free up space to avoid issues
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Duplicates tab ───────────────────────────────────────────────────────────

function DuplicatesTab({ onRefresh }) {
  const dispatch = useDispatch()
  const [groups, setGroups]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState({})
  const [previewFile, setPreviewFile] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await dispatch(fetchDuplicateGroups())
    if (res.success) setGroups(res.data)
    setLoading(false)
  }, [dispatch])

  useEffect(() => { load() }, [load])

  const handleDelete = async (fileHash) => {
    if (!window.confirm('Keep the original and permanently delete all duplicate copies? This cannot be undone.')) return
    setDeleting(d => ({ ...d, [fileHash]: true }))
    const res = await dispatch(deleteDuplicateGroup(fileHash))
    if (res.success) { await load(); onRefresh() }
    else alert(res.error)
    setDeleting(d => ({ ...d, [fileHash]: false }))
  }

  if (loading) return <Spinner />
  if (!groups.length) return <Empty msg="No duplicate files found." />

  const totalRecoverable = groups.reduce((s, g) => s + g.recoverable_size, 0)

  return (
    <div>
      <p className="sm-section-meta" style={{ marginBottom: 16 }}>
        {groups.length} duplicate {groups.length === 1 ? 'group' : 'groups'} —{' '}
        <span className="sm-section-meta--danger">{fmtSize(totalRecoverable)}</span> recoverable
      </p>

      {groups.map(group => {
        const first = group.files[0] || {}
        return (
          <div key={group.file_hash} className="sm-card">
            <div className="sm-dup-card__top">
              <div className="sm-dup-card__file-row">
                <div className="sm-file-icon-wrap" onClick={() => setPreviewFile(first)} title="Preview file">
                  <FileIcon mimeType={first.mime_type} />
                </div>
                <div>
                  <p className="sm-dup-card__name" onClick={() => setPreviewFile(first)}>
                    {first.original_name}
                  </p>
                  <p className="sm-dup-card__copies">{group.count} copies · {fmtSize(group.total_size)} total</p>
                </div>
              </div>
              <Badge variant="danger">Free {fmtSize(group.recoverable_size)}</Badge>
            </div>

            <div className="sm-dup-card__copies-list">
              {group.files.map((file, idx) => (
                <div key={file.id} className="sm-dup-card__copy-row">
                  <span className="sm-dup-card__copy-date" onClick={() => setPreviewFile(file)} title="Preview this copy">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>
                    </svg>
                    {fmtDate(file.uploaded_at)}
                  </span>
                  {idx === 0
                    ? <span className="sm-dup-card__copy-original">Keep (original)</span>
                    : <span className="sm-dup-card__copy-dupe">{fmtSize(file.file_size)} · duplicate</span>}
                </div>
              ))}
            </div>

            <button
              disabled={!!deleting[group.file_hash]}
              className="sm-btn-danger"
              onClick={() => handleDelete(group.file_hash)}
            >
              {deleting[group.file_hash] ? 'Deleting…' : 'Delete duplicates'}
            </button>
          </div>
        )
      })}

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}

// ─── Selectable file row ──────────────────────────────────────────────────────

function SelectableFileRow({ file, selected, onSelect, onDelete, onPreview, deleting }) {
  return (
    <div className={`sm-file-row${selected ? ' sm-file-row--selected' : ''}`}>
      <div
        className={`sm-file-row__checkbox${selected ? ' sm-file-row__checkbox--checked' : ''}`}
        onClick={() => onSelect(file.id)}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        )}
      </div>

      <div className="sm-file-icon-wrap" onClick={() => onPreview(file)} title="Preview file">
        <FileIcon mimeType={file.mime_type} />
      </div>

      <div className="sm-file-row__info" onClick={() => onPreview(file)}>
        <p className="sm-file-row__name">{file.original_name}</p>
        <p className="sm-file-row__meta">{fmtSize(file.file_size)} · {fmtDate(file.uploaded_at)}</p>
      </div>

      <button
        disabled={!!deleting}
        className="sm-btn-danger"
        onClick={() => onDelete([file.id])}
      >
        {deleting ? 'Deleting…' : 'Delete'}
      </button>
    </div>
  )
}

// ─── Bulk action bar ──────────────────────────────────────────────────────────

function BulkBar({ count, totalBytes, onDeleteSelected, onClearSelection, deleting }) {
  if (count === 0) return null
  return (
    <div className="sm-bulk-bar">
      <span className="sm-bulk-bar__count">{count} selected · {fmtSize(totalBytes)}</span>
      <div className="sm-bulk-bar__actions">
        <button className="sm-btn-ghost sm-btn-ghost--sm" onClick={onClearSelection}>Clear</button>
        <button
          disabled={deleting}
          className="sm-btn-danger sm-btn-ghost--sm"
          onClick={onDeleteSelected}
        >
          {deleting ? 'Deleting…' : `Delete ${count} files`}
        </button>
      </div>
    </div>
  )
}

// ─── Large Files tab ──────────────────────────────────────────────────────────

function LargeFilesTab({ onRefresh, selected, setSelected, onBytesChange }) {
  const dispatch = useDispatch()
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState({})
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [previewFile, setPreviewFile]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await dispatch(fetchLargeFiles())
    if (res.success) setFiles(res.data)
    setLoading(false)
    setSelected(new Set())
  }, [dispatch, setSelected])

  useEffect(() => { load() }, [load])

  // ── Compute selected bytes (safe to call even when loading/empty) ─────────
  const selectedBytes = files.filter(f => selected.has(f.id)).reduce((s, f) => s + f.file_size, 0)

  // ── Notify parent whenever selected bytes change (must be before returns) ─
  useEffect(() => { onBytesChange(selectedBytes) }, [selectedBytes, onBytesChange])

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(prev => prev.size === files.length ? new Set() : new Set(files.map(f => f.id)))
  }

  const handleDelete = async (ids) => {
    if (!window.confirm(`Permanently delete ${ids.length > 1 ? ids.length + ' files' : 'this file'}? This cannot be undone.`)) return
    if (ids.length === 1) {
      setDeleting(d => ({ ...d, [ids[0]]: true }))
      const res = await dispatch(deleteStorageFiles(ids))
      if (res.success) { await load(); onRefresh() }
      else alert(res.error)
      setDeleting(d => ({ ...d, [ids[0]]: false }))
    } else {
      setBulkDeleting(true)
      const res = await dispatch(deleteStorageFiles(ids))
      if (res.success) { await load(); onRefresh() }
      else alert(res.error)
      setBulkDeleting(false)
    }
  }

  if (loading) return <Spinner />
  if (!files.length) return <Empty msg="No large files found." />

  const allSelected = selected.size === files.length

  return (
    <div>
      <div className="sm-section-header">
        <p className="sm-section-meta">
          {files.length} files over 60 MB —{' '}
          <span className="sm-section-meta--highlight">{fmtSize(files.reduce((s, f) => s + f.file_size, 0))}</span> total
        </p>
        <button className="sm-btn-ghost sm-btn-ghost--sm" onClick={toggleAll}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <BulkBar
        count={selected.size}
        totalBytes={selectedBytes}
        onDeleteSelected={() => handleDelete([...selected])}
        onClearSelection={() => setSelected(new Set())}
        deleting={bulkDeleting}
      />

      <div className="sm-file-list">
        {files.map(file => (
          <SelectableFileRow
            key={file.id}
            file={file}
            selected={selected.has(file.id)}
            onSelect={toggleSelect}
            onDelete={handleDelete}
            onPreview={setPreviewFile}
            deleting={deleting[file.id]}
          />
        ))}
      </div>

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}

// ─── Stale Downloads tab ──────────────────────────────────────────────────────

function StaleDownloadsTab({ onRefresh, selected, setSelected, onBytesChange }) {
  const dispatch = useDispatch()
  const [files, setFiles]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [deleting, setDeleting] = useState({})
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [previewFile, setPreviewFile]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await dispatch(fetchStaleDownloads(90))
    if (res.success) setFiles(res.data)
    setLoading(false)
    setSelected(new Set())
  }, [dispatch, setSelected])

  useEffect(() => { load() }, [load])

  // ── Compute selected bytes (safe to call even when loading/empty) ─────────
  const selectedBytes = files.filter(f => selected.has(f.id)).reduce((s, f) => s + f.file_size, 0)

  // ── Notify parent whenever selected bytes change (must be before returns) ─
  useEffect(() => { onBytesChange(selectedBytes) }, [selectedBytes, onBytesChange])

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    setSelected(prev => prev.size === files.length ? new Set() : new Set(files.map(f => f.id)))
  }

  const handleDelete = async (ids) => {
    if (!window.confirm(`Permanently delete ${ids.length > 1 ? ids.length + ' files' : 'this file'}? This cannot be undone.`)) return
    if (ids.length === 1) {
      setDeleting(d => ({ ...d, [ids[0]]: true }))
      const res = await dispatch(deleteStorageFiles(ids))
      if (res.success) { await load(); onRefresh() }
      else alert(res.error)
      setDeleting(d => ({ ...d, [ids[0]]: false }))
    } else {
      setBulkDeleting(true)
      const res = await dispatch(deleteStorageFiles(ids))
      if (res.success) { await load(); onRefresh() }
      else alert(res.error)
      setBulkDeleting(false)
    }
  }

  if (loading) return <Spinner />
  if (!files.length) return <Empty msg="No old files found." />

  const allSelected = selected.size === files.length

  return (
    <div>
      <div className="sm-section-header">
        <p className="sm-section-meta">
          Old files (90+ days) —{' '}
          <span className="sm-section-meta--highlight">{fmtSize(files.reduce((s, f) => s + f.file_size, 0))}</span>
        </p>
        <button className="sm-btn-ghost sm-btn-ghost--sm" onClick={toggleAll}>
          {allSelected ? 'Deselect all' : 'Select all'}
        </button>
      </div>

      <BulkBar
        count={selected.size}
        totalBytes={selectedBytes}
        onDeleteSelected={() => handleDelete([...selected])}
        onClearSelection={() => setSelected(new Set())}
        deleting={bulkDeleting}
      />

      <div className="sm-file-list">
        {files.map(file => (
          <SelectableFileRow
            key={file.id}
            file={file}
            selected={selected.has(file.id)}
            onSelect={toggleSelect}
            onDelete={handleDelete}
            onPreview={setPreviewFile}
            deleting={deleting[file.id]}
          />
        ))}
      </div>

      {previewFile && <PreviewModal file={previewFile} onClose={() => setPreviewFile(null)} />}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'duplicates', label: 'Duplicates',  countKey: 'duplicate_groups'     },
  { key: 'large',      label: 'Large files', countKey: 'large_file_count'     },
  { key: 'stale',      label: 'Old iles',   countKey: 'stale_download_count' },
]

export default function StorageManager() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [tab, setTab]           = useState('duplicates')
  const [summary, setSummary]   = useState(null)
  const [cleaning, setCleaning] = useState(false)

  const switchTab = (key) => {
    setTab(key)
    // Reset bytes/selection for whichever tab is leaving so they don't
    // linger in the clean button total when the user switches away
    if (key !== 'large') { setSelectedLargeBytes(0); setSelectedLarge(new Set()) }
    if (key !== 'stale') { setSelectedStaleBytes(0); setSelectedStale(new Set()) }
  }

  // ── Lifted selection state ────────────────────────────────────────────────
  const [selectedLarge, setSelectedLarge] = useState(new Set())
  const [selectedStale, setSelectedStale] = useState(new Set())

  // ── Lifted selected-bytes state (updated by each tab via onBytesChange) ──
  const [selectedLargeBytes, setSelectedLargeBytes] = useState(0)
  const [selectedStaleBytes, setSelectedStaleBytes] = useState(0)

  const loadSummary = useCallback(async () => {
    const res = await dispatch(fetchStorageManagerSummary())
    if (res.success) setSummary(res.data)
  }, [dispatch])

  useEffect(() => { loadSummary() }, [loadSummary])

  // ── Derived flags ─────────────────────────────────────────────────────────
  const hasDuplicates      = (summary?.duplicate_groups ?? 0) > 0
  const totalSelected      = selectedLarge.size + selectedStale.size
  const hasAnythingToClean = hasDuplicates || totalSelected > 0

  // ── Combined recoverable size: duplicates + selected large + selected stale
  const totalRecoverable =
    (summary?.recoverable_bytes ?? 0) + selectedLargeBytes + selectedStaleBytes

  // ── Clean all handler ─────────────────────────────────────────────────────
  const handleCleanAll = async () => {
    const parts = []
    if (hasDuplicates)      parts.push('all duplicate extras')
    if (selectedLarge.size) parts.push(`${selectedLarge.size} large file(s)`)
    if (selectedStale.size) parts.push(`${selectedStale.size} old file(s)`)

    if (!window.confirm(`Delete ${parts.join(' + ')}? This cannot be undone.`)) return

    setCleaning(true)

    if (hasDuplicates) {
      const res = await dispatch(cleanAllStorage())
      if (!res.success) {
        alert(res.error)
        setCleaning(false)
        return
      }
    }

    const ids = [...selectedLarge, ...selectedStale]
    if (ids.length) {
      const res = await dispatch(deleteStorageFiles(ids))
      if (!res.success) {
        alert(res.error)
        setCleaning(false)
        return
      }
    }

    setSelectedLarge(new Set())
    setSelectedStale(new Set())
    navigate('/files')
  }

  // ── Clean button label ────────────────────────────────────────────────────
  const cleanLabel = () => {
    if (cleaning) {
      return (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ animation: 'sm-spin 0.8s linear infinite' }}>
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/>
          </svg>
          Cleaning up — you'll be redirected…
        </>
      )
    }

    const labelParts = []
    if (hasDuplicates)      labelParts.push('duplicates')
    if (selectedLarge.size) labelParts.push(`${selectedLarge.size} large`)
    if (selectedStale.size) labelParts.push(`${selectedStale.size} old`)

    return (
      <>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"/>
        </svg>
        Clean {labelParts.join(' + ')} — free ~{fmtSize(totalRecoverable)}
      </>
    )
  }

  return (
    <div className="dashboard-main sm-page">

      {/* Header */}
      <div className="sm-header">
        <div className="sm-header__back-row">
          <button onClick={() => navigate(-1)} className="sm-btn-ghost" style={{ padding: '6px 10px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back
          </button>
        </div>
        <p className="sm-header__eyebrow">Storage</p>
        <h1 className="sm-header__title">
          Free up <span className="sm-header__title-accent">space</span>
        </h1>
        <p className="sm-header__sub">Find and remove duplicate files, large files, and old installers.</p>
      </div>

      {/* Storage bar */}
      <StorageBar summary={summary} />

      {/* Summary tiles */}
      {summary && (
        <div className="sm-tiles">
          {[
            { label: 'Duplicate groups', value: summary.duplicate_groups,     accent: '#fb7185' },
            { label: 'Large files',      value: summary.large_file_count,     accent: '#fbbf24' },
            { label: 'Old files',        value: summary.stale_download_count, accent: '#a78bfa' },
          ].map(t => (
            <div key={t.label} className="sm-tile">
              <p className="sm-tile__label">{t.label}</p>
              <p className="sm-tile__value" style={{ color: t.value > 0 ? t.accent : '#3f3f46' }}>{t.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="sm-tabs">
        {TABS.map(t => {
          const active = tab === t.key
          const count  = summary?.[t.countKey]
          return (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              className={`sm-tab${active ? ' sm-tab--active' : ''}`}
            >
              {t.label}
              {count > 0 && <span className="sm-tab__badge">{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Tab panels — min-height prevents layout shift when switching tabs */}
      <div style={{ minHeight: 320 }}>
        {tab === 'duplicates' && (
          <DuplicatesTab onRefresh={loadSummary} />
        )}
        {tab === 'large' && (
          <LargeFilesTab
            onRefresh={loadSummary}
            selected={selectedLarge}
            setSelected={setSelectedLarge}
            onBytesChange={setSelectedLargeBytes}
          />
        )}
        {tab === 'stale' && (
          <StaleDownloadsTab
            onRefresh={loadSummary}
            selected={selectedStale}
            setSelected={setSelectedStale}
            onBytesChange={setSelectedStaleBytes}
          />
        )}
      </div>

      {/* Clean button: only renders when there's something to clean */}
      {hasAnythingToClean && (
        <div className="sm-footer">
          <p className="sm-footer__note">
            {totalSelected > 0
              ? `Will delete: ${[
                  hasDuplicates      && 'all duplicate extras',
                  selectedLarge.size && `${selectedLarge.size} large file(s)`,
                  selectedStale.size && `${selectedStale.size} old file(s)`,
                ].filter(Boolean).join(' + ')}`
              : 'Select files in the Large / Old tabs to include them in this clean.'}
          </p>

          <button
            disabled={cleaning}
            className={`sm-clean-btn ${cleaning ? 'sm-clean-btn--disabled' : 'sm-clean-btn--active'}`}
            onClick={handleCleanAll}
          >
            {cleanLabel()}
          </button>

          {!cleaning && (
            <p className="sm-footer__hint">You'll be taken back to your files after cleaning</p>
          )}
        </div>
      )}

    </div>
  )
}