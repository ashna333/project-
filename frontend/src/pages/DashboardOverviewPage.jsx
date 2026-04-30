import { useEffect, useMemo, useState } from 'react'
import AppShell from '../components/AppShell'
import { fetchFilesApi, fetchSharesApi } from '../api/fileApi'

const formatTime = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DashboardOverviewPage() {
  const [files, setFiles] = useState([])
  const [shares, setShares] = useState([])
  const [totalFiles, setTotalFiles] = useState(0)
  const [totalShares, setTotalShares] = useState(0)
  const [storage, setStorage] = useState({ used_percent: 0, used_bytes: 0, max_bytes: 0 })

  useEffect(() => {
    fetchFilesApi(1, 6, '')
      .then(({ data }) => {
        setFiles(data.results?.files || [])
        setTotalFiles(data.count || 0)
        setStorage(data.results?.storage || { used_percent: 0, used_bytes: 0, max_bytes: 0 })
      })
      .catch(() => {})

    fetchSharesApi(1, 6, '')
      .then(({ data }) => {
        setShares(data.results?.shares || [])
        setTotalShares(data.count || 0)
      })
      .catch(() => {})
  }, [])

  const accessedCount = useMemo(
    () => shares.filter((item) => item.is_accessed).length,
    [shares]
  )

  return (
    <AppShell title="Dashboard" subtitle="Overview of your files and sharing activity.">
      <section className="dashboard-panel">
        <div className="dashboard-panel-header">
          <h3>Executive Summary</h3>
          <p>Track uploads, sharing activity, and storage utilization from one place.</p>
        </div>
        <div className="dashboard-stat-grid">
          <div className="profile-field"><span>Total files</span><strong>{totalFiles}</strong></div>
          <div className="profile-field"><span>Total shares</span><strong>{totalShares}</strong></div>
          <div className="profile-field"><span>Accessed shares</span><strong>{accessedCount}</strong></div>
          <div className="profile-field"><span>Storage used</span><strong>{(storage.used_percent || 0).toFixed(1)}%</strong></div>
        </div>
      </section>

      <section className="dashboard-two-col">
        <div className="dashboard-panel">
          <h4 className="dashboard-panel-title">Recent Uploads</h4>
          {files.length === 0 ? (
            <p className="empty-lite">No files uploaded yet.</p>
          ) : (
            files.map((file) => (
              <div key={file.id} className="share-manager-row">
                <div>
                  <div className="dashboard-list-title">{file.original_name}</div>
                  <div className="dashboard-list-meta">{file.file_size_display || '-'}</div>
                </div>
                <div className="dashboard-list-meta">{formatTime(file.uploaded_at)}</div>
              </div>
            ))
          )}
        </div>
        <div className="dashboard-panel">
          <h4 className="dashboard-panel-title">Recent Shares</h4>
          {shares.length === 0 ? (
            <p className="empty-lite">No shares yet.</p>
          ) : (
            shares.map((share) => (
              <div key={share.id} className="share-manager-row">
                <div>
                  <div className="dashboard-list-title">{share.file_name}</div>
                  <div className="dashboard-list-meta">{share.recipient_email}</div>
                </div>
                <div className="dashboard-list-meta">{share.is_accessed ? 'Accessed' : 'Pending'}</div>
              </div>
            ))
          )}
        </div>
      </section>
    </AppShell>
  )
}

