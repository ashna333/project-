import { useState } from 'react'
import { X, Lock, Eye, EyeOff } from 'lucide-react'
import useAuthStore from '../store/authStore'
import { validateChangePassword } from '../utils/validation'

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { changePassword, user } = useAuthStore()
  const isGoogle = user?.auth_provider === 'google'
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_new_password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showOld, setShowOld] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleClose = () => {
    setForm({ old_password: '', new_password: '', confirm_new_password: '' })
    setMessage('')
    setError('')
    onClose()
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    const errs = validateChangePassword(form)
    if (Object.keys(errs).length > 0) {
      setError(Object.values(errs)[0])
      return
    }
    setLoading(true)
    const result = await changePassword(form)
    setLoading(false)
    if (result.success) {
      setMessage('Password changed successfully.')
      setForm({ old_password: '', new_password: '', confirm_new_password: '' })
      return
    }
    setError(result.error || 'Failed to change password.')
  }

  if (!isOpen) return null

  const inputWrap = { position: 'relative', display: 'flex', alignItems: 'center' }
  const inputStyle = {
    width: '100%', background: '#09090b', border: '1px solid #27272a',
    borderRadius: 8, padding: '9px 40px 9px 12px', color: '#f4f4f5',
    fontSize: 14, boxSizing: 'border-box', outline: 'none',
  }
  const eyeBtn = {
    position: 'absolute', right: 10, background: 'none', border: 'none',
    color: '#71717a', cursor: 'pointer', display: 'flex', alignItems: 'center',
    padding: 0,
  }
  const labelStyle = {
    display: 'block', fontSize: 12, fontWeight: 500, color: '#71717a',
    marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase',
  }

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div
        className="file-details-modal fade-in-up"
        style={{ maxWidth: 480, width: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={16} color="#e11d48" />
            <h3 style={{ margin: 0 }}>Change Password</h3>
          </div>
          <button className="close-sidebar" onClick={handleClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-content">
          {isGoogle ? (
            <div className="alert alert-error">
              Password change is disabled for Google-authenticated accounts.
            </div>
          ) : (
            <>
              {message && <div className="alert alert-success">{message}</div>}
              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={submit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Current password</label>
                  <div style={inputWrap}>
                    <input
                      style={inputStyle}
                      type={showOld ? 'text' : 'password'}
                      value={form.old_password}
                      onChange={(e) => setForm((p) => ({ ...p, old_password: e.target.value }))}
                      required
                    />
                    <button type="button" style={eyeBtn} onClick={() => setShowOld((v) => !v)}>
                      {showOld ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>New password</label>
                  <div style={inputWrap}>
                    <input
                      style={inputStyle}
                      type={showNew ? 'text' : 'password'}
                      value={form.new_password}
                      onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))}
                      required
                    />
                    <button type="button" style={eyeBtn} onClick={() => setShowNew((v) => !v)}>
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Confirm new password</label>
                  <div style={inputWrap}>
                    <input
                      style={inputStyle}
                      type={showConfirm ? 'text' : 'password'}
                      value={form.confirm_new_password}
                      onChange={(e) => setForm((p) => ({ ...p, confirm_new_password: e.target.value }))}
                      onCopy={(e) => e.preventDefault()}
                      onPaste={(e) => e.preventDefault()}
                      onCut={(e) => e.preventDefault()}
                      required
                    />
                    <button type="button" style={eyeBtn} onClick={() => setShowConfirm((v) => !v)}>
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{ flex: 1, background: '#e11d48', border: 'none', borderRadius: 8, padding: '10px', color: 'white', fontSize: 14, fontWeight: 500, cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? 'Updating...' : 'Update password'}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    style={{ flex: 1, background: 'transparent', border: '1px solid #27272a', borderRadius: 8, padding: '10px', color: '#a1a1aa', fontSize: 14, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}