import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { createShareApi, fetchFilesApi, fetchSharesApi } from '../api/fileApi'

const formatDate = (value) => {
  if (!value) return '-'
  return new Date(value).toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function FileSharingPage() {
  const [searchParams] = useSearchParams()
  const [shareForm, setShareForm] = useState({ file_id: '', recipient_email: '', expires_in_hours: 24, message: '' })
  const [files, setFiles] = useState([])
  const [shares, setShares] = useState([])
  const [page, setPage] = useState(1)
  const [count, setCount] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success')

  useEffect(() => {
    fetchFilesApi(1, 100, '').then(({ data }) => {
      const allFiles = data.results?.files || []
      setFiles(allFiles)
      const requestedId = Number(searchParams.get('fileId'))
      if (requestedId && allFiles.some((item) => item.id === requestedId)) {
        setShareForm((prev) => ({ ...prev, file_id: requestedId }))
      }
    }).catch(() => {})
  }, [searchParams])

  useEffect(() => {
    fetchSharesApi(page, 6, '').then(({ data }) => {
      setShares(data.results?.shares || [])
      setCount(data.count || 0)
    }).catch(() => {})
  }, [page])

  const totalPages = Math.max(1, Math.ceil(count / 6))

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await createShareApi({
        ...shareForm,
        expires_in_hours: Number(shareForm.expires_in_hours),
      })
      setFeedbackType('success')
      setFeedback('Share created and email sent to recipient.')
      setShareForm({
        file_id: '',
        recipient_email: '',
        expires_in_hours: 24,
        message: '',
      })
      setPage(1)
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.response?.data?.error || 'Failed to create share.')
    }
  }

  return (
    <AppShell title="File Sharing" subtitle="Create public links and track share access status.">
      <div className="dashboard-two-col">
        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Create Share</h3>
            <p>Generate secure public links with expiration and recipient tracking.</p>
          </div>
          {feedback ? <div className={`alert ${feedbackType === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: 10 }}>{feedback}</div> : null}
          <form className="form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">File</label>
              <select className="form-input" value={shareForm.file_id} onChange={(e) => setShareForm((prev) => ({ ...prev, file_id: Number(e.target.value) }))} required>
                <option value="">Select file</option>
                {files.map((file) => <option key={file.id} value={file.id}>{file.original_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Recipient email</label>
              <input className="form-input" type="email" value={shareForm.recipient_email} onChange={(e) => setShareForm((prev) => ({ ...prev, recipient_email: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Expires (hours)</label>
              <input className="form-input" type="number" min="1" max="720" value={shareForm.expires_in_hours} onChange={(e) => setShareForm((prev) => ({ ...prev, expires_in_hours: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label className="form-label">Message</label>
              <textarea className="form-textarea" value={shareForm.message} onChange={(e) => setShareForm((prev) => ({ ...prev, message: e.target.value }))} required />
            </div>
            <button className="btn btn-primary" type="submit">Create Share Link</button>
          </form>
        </section>

        <section className="dashboard-panel">
          <div className="dashboard-panel-header">
            <h3>Shared Files</h3>
            <p>Review delivery status and public access activity.</p>
          </div>
          {shares.length === 0 ? <p className="empty-lite">No shared files yet.</p> : shares.map((share) => (
            <div key={share.id} className="table-row-share">
              <div className="dashboard-list-main">
                <div className="dashboard-list-title">{share.file_name}</div>
                <div className="dashboard-list-meta">{share.recipient_email}</div>
              </div>
              <div className="share-meta-col">
                <div className="dashboard-list-meta">{formatDate(share.share_date)}</div>
                <span className={`status-pill ${share.is_accessed ? 'done' : share.is_expired ? 'expired' : 'pending'}`}>
                  {share.is_accessed ? 'Accessed' : share.is_expired ? 'Expired' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
          {totalPages > 1 && (
            <div className="pagination-bar">
              <span>{count} share(s)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn-sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Prev</button>
                <button className="btn-sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
