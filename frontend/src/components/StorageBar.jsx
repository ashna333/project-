// src/components/StorageBar.jsx
import { useSelector } from 'react-redux'

const fmt = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export default function StorageBar() {
  const { storage } = useSelector(s => s.files)
  const pct = storage.used_percent || 0
  const color = pct >= 90 ? '#b91c1c' : pct >= 70 ? '#b45309' : '#9b1c1c'

  return (
    <div className="storage-bar-wrap">
      <div className="storage-bar-header">
        <span className="storage-label">Storage</span>
        <span className="storage-nums">
          <strong>{fmt(storage.used_bytes)}</strong> of {fmt(storage.max_bytes)} used
        </span>
      </div>
      <div className="storage-track">
        <div
          className="storage-fill"
          style={{ width: `${Math.min(pct, 100)}%`, background: color }}
        />
      </div>
      <div className="storage-footer">
        <span style={{ color: pct >= 90 ? '#b91c1c' : 'var(--fm-text-muted)' }}>
          {pct >= 90 ? '⚠ Storage almost full!' : `${pct.toFixed(1)}% used`}
        </span>
        <span style={{ color: 'var(--fm-text-muted)' }}>{fmt(storage.remaining_bytes)} remaining</span>
      </div>
    </div>
  )
}