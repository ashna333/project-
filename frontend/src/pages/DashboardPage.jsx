import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { createShareApi, deleteFileApi, downloadFileApi, fetchFilesApi, fetchSharesApi, storageSummaryApi, uploadFilesApi } from '../api/fileApi'

const MAX_FILE_SIZE = 100 * 1024 * 1024

const Ico = ({ children, size = 18 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
)

const IconCloud = () => <Ico><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></Ico>
const IconGrid = () => <Ico><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></Ico>
const IconUpload = () => <Ico><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17,8 12,3 7,8" /><line x1="12" y1="3" x2="12" y2="15" /></Ico>
const IconFile = () => <Ico><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></Ico>
const IconShare = () => <Ico><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></Ico>
const IconDownload = () => <Ico><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" /></Ico>
const IconTrash = () => <Ico><polyline points="3,6 5,6 21,6" /><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2" /></Ico>
const IconLock = () => <Ico><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></Ico>
const IconClock = () => <Ico><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></Ico>
const IconUser = () => <Ico><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Ico>

const bytesToText = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const formatDate = (value) => value ? new Date(value).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '-'

const fileBadge = (mimeType = '', fileName = '') => {
  if (mimeType.startsWith('image/')) return 'IMG'
  if (mimeType.startsWith('video/')) return 'VID'
  if (mimeType.includes('pdf')) return 'PDF'
  if (mimeType.includes('sheet') || fileName.endsWith('.xlsx')) return 'XLS'
  if (mimeType.includes('zip') || fileName.endsWith('.zip')) return 'ZIP'
  return 'FILE'
}

function Panel({ title, subtitle, action, children }) {
  return (
    <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 22, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 18 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, marginBottom: 6 }}>{title}</h3>
          {subtitle ? <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6 }}>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function QuickAction({ title, text, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        padding: 16,
        borderRadius: 14,
        border: '1px solid var(--border)',
        background: 'var(--bg-input)',
        cursor: 'pointer',
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, lineHeight: 1.6 }}>{text}</div>
    </button>
  )
}

function StatCard({ icon, title, value, helper }) {
  return (
    <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(247,242,234,0.9))', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 18, boxShadow: 'var(--shadow-card)' }}>
      <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(95, 111, 82, 0.10)', color: 'var(--accent)', display: 'grid', placeItems: 'center', marginBottom: 14 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 30, lineHeight: 1.1, marginBottom: 6 }}>{value}</div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{title}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{helper}</div>
    </div>
  )
}

function StatusPill({ share }) {
  const expired = share.is_expired
  const accessed = share.is_accessed
  const bg = expired ? 'rgba(148, 163, 184, 0.12)' : accessed ? 'var(--success-bg)' : 'rgba(245, 158, 11, 0.14)'
  const color = expired ? '#64748b' : accessed ? 'var(--success)' : 'var(--warning)'
  const text = expired ? 'Expired' : accessed ? 'Accessed' : 'Pending'
  return <span style={{ padding: '5px 10px', borderRadius: 999, fontWeight: 700, fontSize: 11, background: bg, color }}>{text}</span>
}

function PageButtons({ page, count, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize))
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages, start + 4)
  const pages = []
  for (let p = start; p <= end; p += 1) pages.push(p)

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
      <button className="btn-sm" disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>
      {pages.map((p) => (
        <button
          key={p}
          className="btn-sm"
          onClick={() => onChange(p)}
          style={p === page ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : undefined}
        >
          {p}
        </button>
      ))}
      <button className="btn-sm" disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next</button>
    </div>
  )
}

export default function DashboardPage({ defaultTab = 'overview' }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef(null)
  const feedbackTimerRef = useRef(null)
  const { user, logout, changePassword } = useAuthStore()

  const activeTab = searchParams.get('tab') || defaultTab
  const [files, setFiles] = useState([])
  const [recentFiles, setRecentFiles] = useState([])
  const [allFiles, setAllFiles] = useState([])
  const [shares, setShares] = useState([])
  const [recentShares, setRecentShares] = useState([])
  const [storage, setStorage] = useState({ used_bytes: 0, max_bytes: 1024 * 1024 * 1024, used_percent: 0, remaining_bytes: 1024 * 1024 * 1024 })
  const [feedback, setFeedback] = useState({ type: '', text: '' })
  const [loadingFiles, setLoadingFiles] = useState(false)
  const [loadingShares, setLoadingShares] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [creatingShare, setCreatingShare] = useState(false)
  const [filePage, setFilePage] = useState(1)
  const [fileCount, setFileCount] = useState(0)
  const [sharePage, setSharePage] = useState(1)
  const [shareCount, setShareCount] = useState(0)
  const [fileSearch, setFileSearch] = useState('')
  const [shareSearch, setShareSearch] = useState('')
  const [createdShareLink, setCreatedShareLink] = useState('')
  const [shareForm, setShareForm] = useState({ file_id: '', recipient_email: '', expires_in_hours: 24, message: '' })
  const [passwordForm, setPasswordForm] = useState({ old_password: '', new_password: '', confirm_new_password: '' })
  const [passwordState, setPasswordState] = useState({ loading: false, error: '', success: '' })

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const displayName = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.email || 'User'
  const firstName = user?.first_name || 'there'

  const setTab = (tab) => setSearchParams({ tab })

  const showFeedback = useCallback((type, text, timeout = 0) => {
    setFeedback({ type, text })
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    if (timeout > 0) {
      feedbackTimerRef.current = setTimeout(() => setFeedback({ type: '', text: '' }), timeout)
    }
  }, [])

  const loadStorage = useCallback(async () => {
    const { data } = await storageSummaryApi()
    setStorage(data)
  }, [])

  const loadFiles = useCallback(async (page = 1, search = '') => {
    setLoadingFiles(true)
    try {
      const { data } = await fetchFilesApi(page, 6, search)
      setFiles(data.results?.files || [])
      setFileCount(data.count || 0)
    } catch (error) {
      showFeedback('error', error.response?.data?.detail || 'Failed to load files.')
    } finally {
      setLoadingFiles(false)
    }
  }, [showFeedback])

  const loadRecentFiles = useCallback(async () => {
    try {
      const { data } = await fetchFilesApi(1, 4, '')
      const list = data.results?.files || []
      setRecentFiles(list.slice(0, 4))
      setAllFiles(list)
    } catch {
      setRecentFiles([])
      setAllFiles([])
    }
  }, [])

  const loadShareableFiles = useCallback(async () => {
    try {
      const { data } = await fetchFilesApi(1, 100, '')
      setAllFiles(data.results?.files || [])
    } catch {
      setAllFiles([])
    }
  }, [])

  const loadShares = useCallback(async (page = 1, search = '') => {
    setLoadingShares(true)
    try {
      const { data } = await fetchSharesApi(page, 6, search)
      setShares(data.results?.shares || [])
      setShareCount(data.count || 0)
    } catch (error) {
      showFeedback('error', error.response?.data?.detail || 'Failed to load shared files.')
    } finally {
      setLoadingShares(false)
    }
  }, [showFeedback])

  const loadRecentShares = useCallback(async () => {
    try {
      const { data } = await fetchSharesApi(1, 4, '')
      const list = data.results?.shares || []
      setRecentShares(list.slice(0, 4))
    } catch {
      setRecentShares([])
    }
  }, [])

  useEffect(() => {
    if (!searchParams.get('tab') && defaultTab) setSearchParams({ tab: defaultTab }, { replace: true })
  }, [defaultTab, searchParams, setSearchParams])

  useEffect(() => {
    loadFiles(filePage, fileSearch)
  }, [filePage, fileSearch, loadFiles])

  useEffect(() => {
    loadShares(sharePage, shareSearch)
  }, [sharePage, shareSearch, loadShares])

  useEffect(() => {
    loadStorage().catch(() => {})
    loadRecentFiles()
    loadRecentShares()
    loadShareableFiles()
  }, [loadStorage, loadRecentFiles, loadRecentShares, loadShareableFiles])

  useEffect(() => () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
  }, [])

  const summary = useMemo(() => ({
    files: fileCount,
    storage: bytesToText(storage.used_bytes),
    activeShares: shares.filter((item) => !item.is_expired).length,
    expiringSoon: shares.filter((item) => !item.is_expired && new Date(item.expires_at).getTime() - Date.now() <= 24 * 60 * 60 * 1000).length,
  }), [fileCount, shares, storage.used_bytes])

  const quickActivity = useMemo(() => [
    ...recentFiles.map((file) => ({ id: `f-${file.id}`, text: `Uploaded ${file.original_name}`, time: formatDate(file.uploaded_at) })),
    ...recentShares.map((share) => ({ id: `s-${share.id}`, text: `Shared ${share.file_name} with ${share.recipient_email}`, time: formatDate(share.share_date) })),
  ].slice(0, 6), [recentFiles, recentShares])

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to logout?')) return
    logout()
    navigate('/login')
  }

  const handleUpload = async (inputFiles) => {
    const selected = Array.from(inputFiles || [])
    if (!selected.length) return
    const oversized = selected.filter((file) => file.size > MAX_FILE_SIZE)
    if (oversized.length) {
      showFeedback('error', `File limit is 100 MB. Oversized: ${oversized.map((file) => file.name).join(', ')}`)
      return
    }

    setUploading(true)
    try {
      const { data } = await uploadFilesApi(selected)
      showFeedback('success', data.message || 'Files uploaded successfully.', 3500)
      setFilePage(1)
      await Promise.all([loadFiles(1, fileSearch), loadRecentFiles(), loadShareableFiles(), loadStorage()])
    } catch (error) {
      const payload = error.response?.data
      const first = payload?.files?.[0] || payload?.non_field_errors?.[0] || 'Upload failed.'
      showFeedback('error', first)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleDownload = async (file) => {
    try {
      const { data } = await downloadFileApi(file.id)
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', file.original_name)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      showFeedback('error', 'Download failed.')
    }
  }

  const handleDelete = async (fileId) => {
    if (!window.confirm('Delete this file?')) return
    try {
      await deleteFileApi(fileId)
      showFeedback('success', 'File deleted successfully.', 2500)
      await Promise.all([loadFiles(filePage, fileSearch), loadRecentFiles(), loadShares(sharePage, shareSearch), loadRecentShares(), loadShareableFiles(), loadStorage()])
    } catch (error) {
      showFeedback('error', error.response?.data?.error || 'Failed to delete file.')
    }
  }

  const handleShare = async (event) => {
    event.preventDefault()
    setCreatingShare(true)
    setCreatedShareLink('')
    try {
      const payload = { ...shareForm, expires_in_hours: Number(shareForm.expires_in_hours) }
      const { data } = await createShareApi(payload)
      setCreatedShareLink(data.share_url || '')
      showFeedback('success', data.message || 'Share created successfully.', 3500)
      setShareForm((prev) => ({ ...prev, recipient_email: '', expires_in_hours: 24, message: '' }))
      setSharePage(1)
      await Promise.all([loadShares(1, shareSearch), loadRecentShares()])
    } catch (error) {
      const payload = error.response?.data || {}
      const first = Object.values(payload)[0]
      showFeedback('error', Array.isArray(first) ? first[0] : payload.error || 'Failed to create share.')
    } finally {
      setCreatingShare(false)
    }
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    if (!passwordForm.old_password || !passwordForm.new_password || !passwordForm.confirm_new_password) {
      setPasswordState({ loading: false, error: 'All password fields are required.', success: '' })
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_new_password) {
      setPasswordState({ loading: false, error: 'New password and confirm password must match.', success: '' })
      return
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordState({ loading: false, error: 'New password must be at least 8 characters.', success: '' })
      return
    }
    setPasswordState({ loading: true, error: '', success: '' })
    const result = await changePassword(passwordForm)
    if (result.success) {
      setPasswordForm({ old_password: '', new_password: '', confirm_new_password: '' })
      setPasswordState({ loading: false, error: '', success: 'Password updated successfully.' })
      return
    }
    setPasswordState({ loading: false, error: 'Unable to change password. Please check your input.', success: '' })
  }

  const mainNavItems = [
    { key: 'overview', label: 'Overview', icon: <IconGrid /> },
    { key: 'files', label: 'File manager', icon: <IconFile /> },
    { key: 'sharing', label: 'File sharing', icon: <IconShare /> },
  ]
  const accountNavItem = { key: 'profile', label: 'Profile', icon: <IconUser /> }

  return (
    <div className="page-enter" style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <span style={{ color: 'var(--accent)', display: 'flex' }}><IconCloud /></span>
          CloudNest
          <div className="dot" />
        </div>
        <div className="nav-actions" style={{ flexWrap: 'wrap' }}>
          <button className="user-avatar-btn" title={displayName} onClick={() => setTab('profile')}>{initials}</button>
          <button className="btn-sm" onClick={handleLogout}>Sign out</button>
        </div>
      </nav>

      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="dashboard-hero-card">
            <div className="dashboard-chip">Secure workspace</div>
            <h2>Hi, {firstName}</h2>
            <p>Upload files, monitor quota usage, create public share links, and manage your profile from one place.</p>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {mainNavItems.map((item) => {
              const active = activeTab === item.key
              return (
                <button key={item.key} className={`sidebar-tab ${active ? 'active' : ''}`} onClick={() => setTab(item.key)}>
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              )
            })}
          </div>

          <div className="storage-card">
            <div className="storage-card-title">Storage quota</div>
            <div className="storage-track-lg">
              <div className="storage-fill-lg" style={{ width: `${Math.min(storage.used_percent || 0, 100)}%` }} />
            </div>
            <div className="storage-card-meta">
              <span>{bytesToText(storage.used_bytes)} used</span>
              <span>{bytesToText(storage.max_bytes)} total</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto', display: 'grid', gap: 12 }}>
            <div className="sidebar-section-label">Account</div>
            <button className={`sidebar-tab ${activeTab === accountNavItem.key ? 'active' : ''}`} onClick={() => setTab(accountNavItem.key)}>
              {accountNavItem.icon}
              <span>{accountNavItem.label}</span>
            </button>
          </div>
        </aside>

        <main className="dashboard-main">
          {feedback.text ? <div className={`alert ${feedback.type === 'error' ? 'alert-error' : 'alert-success'}`}>{feedback.text}</div> : null}

          <div className="dashboard-stat-grid">
            <StatCard icon={<IconFile />} title="Files uploaded" value={summary.files} helper="Total files owned by you" />
            <StatCard icon={<IconCloud />} title="Storage used" value={summary.storage} helper={`${storage.used_percent || 0}% of your 1 GB limit`} />
            <StatCard icon={<IconShare />} title="Active shares" value={summary.activeShares} helper="Currently valid public links" />
            <StatCard icon={<IconClock />} title="Expiring soon" value={summary.expiringSoon} helper="Links expiring within 24 hours" />
          </div>

          {activeTab === 'overview' && (
            <div className="dashboard-two-col">
              <div style={{ display: 'grid', gap: 20 }}>
                <Panel title="Quick upload" subtitle="Drag and drop files here or browse. Success messages disappear automatically after a few seconds.">
                  <div
                    className="upload-dropzone"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => { event.preventDefault(); handleUpload(event.dataTransfer.files) }}
                  >
                    <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => handleUpload(event.target.files)} />
                    <div className="upload-dropzone-icon"><IconUpload size={26} /></div>
                    <div className="upload-dropzone-title">{uploading ? 'Uploading files...' : 'Drop files here or click to browse'}</div>
                    <div className="upload-dropzone-subtitle">Maximum 100 MB per file. Multiple files supported.</div>
                  </div>
                </Panel>

                <Panel title="Quick actions" subtitle="Shortcuts for the most common tasks in your file sharing app.">
                  <div style={{ display: 'grid', gap: 12 }}>
                    <QuickAction title="Upload and share a file" text="Upload a file, then jump directly into the share form to send an expiring public link." onClick={() => setTab('files')} />
                    <QuickAction title="Review recently shared files" text="Monitor which links were accessed and which are about to expire soon." onClick={() => setTab('sharing')} />
                    <QuickAction title="Update security settings" text="Review your account details and change password from the profile section." onClick={() => setTab('profile')} />
                  </div>
                </Panel>

                <Panel title="Recent files" subtitle="Only the most recently uploaded files are shown here." action={<button className="btn-sm" onClick={() => setTab('files')}>View all files</button>}>
                  <div className="list-stack">
                    {recentFiles.length === 0 ? <div className="empty-lite">No files uploaded yet.</div> : recentFiles.map((file) => (
                      <div key={file.id} className="dashboard-list-row">
                        <div className="file-pill">{fileBadge(file.mime_type, file.original_name)}</div>
                        <div className="dashboard-list-main">
                          <div className="dashboard-list-title">{file.original_name}</div>
                          <div className="dashboard-list-meta">{file.file_size_display} · {formatDate(file.uploaded_at)}</div>
                        </div>
                        <div className="dashboard-list-actions">
                          <button className="btn-sm" onClick={() => handleDownload(file)}><IconDownload />Download</button>
                          <button className="btn-sm" onClick={() => { setShareForm((prev) => ({ ...prev, file_id: file.id })); setTab('sharing') }}><IconShare />Share</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>

              <div style={{ display: 'grid', gap: 20 }}>
                <Panel title="Recently shared" subtitle="A short snapshot of your latest shared files." action={<button className="btn-sm" onClick={() => setTab('sharing')}>View all shares</button>}>
                  <div className="list-stack">
                    {recentShares.length === 0 ? <div className="empty-lite">No shared files yet.</div> : recentShares.map((share) => (
                      <div key={share.id} className="share-overview-row">
                        <div>
                          <div className="dashboard-list-title">{share.file_name}</div>
                          <div className="dashboard-list-meta">{share.recipient_email} · {formatDate(share.share_date)}</div>
                        </div>
                        <StatusPill share={share} />
                      </div>
                    ))}
                  </div>
                </Panel>

                <Panel title="Recent activity" subtitle="Latest upload and share activity only.">
                  <div className="list-stack">
                    {quickActivity.length === 0 ? <div className="empty-lite">No recent activity.</div> : quickActivity.map((item) => (
                      <div key={item.id} className="activity-row">
                        <span>{item.text}</span>
                        <span>{item.time}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="dashboard-two-col">
              <Panel title="Upload files" subtitle="Use the uploader here or switch back to overview for the compact uploader.">
                <div className="upload-dropzone" onClick={() => fileInputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleUpload(event.dataTransfer.files) }}>
                  <input ref={fileInputRef} type="file" multiple hidden onChange={(event) => handleUpload(event.target.files)} />
                  <div className="upload-dropzone-icon"><IconUpload size={26} /></div>
                  <div className="upload-dropzone-title">{uploading ? 'Uploading files...' : 'Upload files'}</div>
                  <div className="upload-dropzone-subtitle">Drag files here or click to browse.</div>
                </div>
              </Panel>

              <Panel
                title="File manager"
                subtitle="Paginated file list with search, download, share, and delete actions."
                action={<input className="dashboard-search" value={fileSearch} onChange={(event) => { setFileSearch(event.target.value); setFilePage(1) }} placeholder="Search files" />}
              >
                <div className="list-stack">
                  {loadingFiles ? <div className="empty-lite">Loading files...</div> : files.length === 0 ? <div className="empty-lite">No files found.</div> : files.map((file) => (
                    <div key={file.id} className="manager-row">
                      <div className="file-pill">{fileBadge(file.mime_type, file.original_name)}</div>
                      <div className="dashboard-list-main">
                        <div className="dashboard-list-title">{file.original_name}</div>
                        <div className="dashboard-list-meta">{file.file_size_display} · {formatDate(file.uploaded_at)}</div>
                      </div>
                      <div className="dashboard-list-actions">
                        <button className="btn-sm" onClick={() => handleDownload(file)}><IconDownload />Download</button>
                        <button className="btn-sm" onClick={() => { setShareForm((prev) => ({ ...prev, file_id: file.id })); setTab('sharing') }}><IconShare />Share</button>
                        <button className="btn-sm" onClick={() => handleDelete(file.id)}><IconTrash />Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pagination-bar">
                  <span>{fileCount} file(s)</span>
                  <PageButtons page={filePage} count={fileCount} pageSize={6} onChange={setFilePage} />
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'sharing' && (
            <div className="dashboard-two-col">
              <Panel title="Create share link" subtitle="Choose a file, recipient email, expiry time, and message.">
                <form className="form" onSubmit={handleShare}>
                  <div className="form-group">
                    <label className="form-label">File</label>
                    <select className="form-input" value={shareForm.file_id} onChange={(event) => setShareForm((prev) => ({ ...prev, file_id: Number(event.target.value) }))} required>
                      <option value="">Select one of your files</option>
                      {allFiles.map((file) => <option key={file.id} value={file.id}>{file.original_name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recipient email</label>
                    <input className="form-input" type="email" value={shareForm.recipient_email} onChange={(event) => setShareForm((prev) => ({ ...prev, recipient_email: event.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expires in hours</label>
                    <input className="form-input" type="number" min="1" max="720" value={shareForm.expires_in_hours} onChange={(event) => setShareForm((prev) => ({ ...prev, expires_in_hours: event.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Message</label>
                    <textarea className="form-textarea" value={shareForm.message} onChange={(event) => setShareForm((prev) => ({ ...prev, message: event.target.value }))} required />
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={creatingShare}>{creatingShare ? 'Creating share...' : 'Create share link'}</button>
                </form>
                {createdShareLink ? (
                  <div className="share-link-box">
                    <div className="share-link-title">Share link created</div>
                    <div className="share-link-value">{createdShareLink}</div>
                    <button className="btn-sm" onClick={() => navigator.clipboard?.writeText(createdShareLink)}>Copy link</button>
                  </div>
                ) : null}
              </Panel>

              <Panel title="Shared files" subtitle="Paginated list showing file name, recipient, expiry, and access state." action={<input className="dashboard-search" value={shareSearch} onChange={(event) => { setShareSearch(event.target.value); setSharePage(1) }} placeholder="Search shared files" />}>
                <div className="list-stack">
                  {loadingShares ? <div className="empty-lite">Loading shared files...</div> : shares.length === 0 ? <div className="empty-lite">No shared files yet.</div> : shares.map((share) => (
                    <div key={share.id} className="share-manager-row">
                      <div>
                        <div className="dashboard-list-title">{share.file_name}</div>
                        <div className="dashboard-list-meta">{share.recipient_email} · Shared {formatDate(share.share_date)}</div>
                      </div>
                      <div className="dashboard-list-meta">Expires {formatDate(share.expires_at)}</div>
                      <StatusPill share={share} />
                    </div>
                  ))}
                </div>
                <div className="pagination-bar">
                  <span>{shareCount} share(s)</span>
                  <PageButtons page={sharePage} count={shareCount} pageSize={6} onChange={setSharePage} />
                </div>
              </Panel>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="dashboard-two-col">
              <Panel title="Profile" subtitle="Basic account details for the logged-in user.">
                <div className="profile-summary">
                  <div className="profile-avatar-lg">{initials}</div>
                  <div>
                    <div className="profile-name">{displayName}</div>
                    <div className="profile-email">{user?.email || '-'}</div>
                  </div>
                </div>
                <div className="profile-grid">
                  <div className="profile-field"><span>First name</span><strong>{user?.first_name || '-'}</strong></div>
                  <div className="profile-field"><span>Last name</span><strong>{user?.last_name || '-'}</strong></div>
                  <div className="profile-field"><span>Email</span><strong>{user?.email || '-'}</strong></div>
                  <div className="profile-field"><span>Date of birth</span><strong>{user?.dob || '-'}</strong></div>
                </div>
                <div style={{ marginTop: 18, display: 'grid', gap: 12 }}>
                  <div className="profile-note-card">
                    <strong>Account access</strong>
                    <span>Your files and shares are private to your account. Public links only work when you explicitly create them.</span>
                  </div>
                  <div className="profile-note-card">
                    <strong>Storage rules</strong>
                    <span>Maximum file size is 100 MB per file and total storage per user is capped at 1 GB.</span>
                  </div>
                </div>
              </Panel>

              <Panel title="Security center" subtitle="Change password here and review the password rules before submitting.">
                {passwordState.error ? <div className="alert alert-error">{passwordState.error}</div> : null}
                {passwordState.success ? <div className="alert alert-success">{passwordState.success}</div> : null}
                <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: 18 }}>
                  <form className="form" onSubmit={handlePasswordSubmit}>
                    <div className="form-group">
                      <label className="form-label">Current password</label>
                      <input className="form-input" type="password" value={passwordForm.old_password} onChange={(event) => setPasswordForm((prev) => ({ ...prev, old_password: event.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">New password</label>
                      <input className="form-input" type="password" value={passwordForm.new_password} onChange={(event) => setPasswordForm((prev) => ({ ...prev, new_password: event.target.value }))} required />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm new password</label>
                      <input className="form-input" type="password" value={passwordForm.confirm_new_password} onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirm_new_password: event.target.value }))} required />
                    </div>
                    <button className="btn btn-primary" type="submit" disabled={passwordState.loading}>
                      {passwordState.loading ? 'Updating...' : 'Update password'}
                    </button>
                  </form>
                  <div className="security-rules-card">
                    <div className="security-rules-title">Password rules</div>
                    <ul className="security-rules-list">
                      <li>Use at least 8 characters</li>
                      <li>Include uppercase, lowercase, number, and special character</li>
                      <li>Do not reuse your current password</li>
                      <li>Confirm password must match exactly</li>
                    </ul>
                  </div>
                </div>
              </Panel>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}