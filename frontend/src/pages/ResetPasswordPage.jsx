import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { validatePassword, validatePasswordMatch } from '../utils/validation'
import '../styles/Forgotpassword.css'


const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { uid, token } = useParams()
  const { resetPassword, validateResetToken, loading, error, successMessage, clearMessages } = useAuthStore()

  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({ new_password: '', confirm: '' })
  const [fieldErrors, setFieldErrors] = useState({})
  const [expired, setExpired] = useState(false)

  
  useEffect(() => {
    if (!error && !successMessage) return
    const timer = setTimeout(() => clearMessages(), 5000)
    return () => clearTimeout(timer)
  }, [error, successMessage, clearMessages])


  useEffect(() => {
    const verifyToken = async () => {
      if (!uid || !token) { setExpired(true); return }
      const result = await validateResetToken(uid, token)  // from store, not validation.js
      if (!result?.valid) setExpired(true)
    }
    verifyToken()
    return () => clearMessages()
  }, [uid, token, clearMessages])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!uid || !token) {
      setFieldErrors({ token: 'Invalid or missing reset link. Please request a new one.' })
      return
    }

    const errors = {}
    const pwErr = validatePassword(form.new_password)
    if (pwErr) errors.new_password = pwErr
    const matchErr = validatePasswordMatch(form.new_password, form.confirm)
    if (matchErr) errors.confirm = matchErr

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})

    const result = await resetPassword(uid, token, form.new_password, form.confirm)

    if (result?.success) {
      setTimeout(() => navigate('/login'), 3000)
    } else if (result?.error === 'Invalid or expired token') {
      setExpired(true)
    }
  }

  // Expired link screen
  if (expired) {
    return (
      <div className="auth-container reset-page-layout">
        <div className="reset-wrapper">
          <div className="security-header">
            <div className="security-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div>
              <h2 className="page-title">Link Expired</h2>
            </div>
          </div>
          <p style={{ color: '#94a3b8', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            This password reset link has expired.
          </p>
          <p style={{ color: '#64748b', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
            Reset links are only valid for <strong style={{ color: '#e11d48' }}>15 minutes</strong>. Please request a new one.
          </p>
          <button
            className="submit-btn-rose"
            onClick={() => navigate('/forgot-password')}
          >
            Request New Link
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container reset-page-layout">
      <div className="reset-wrapper">
        <div className="security-header">
          <div className="security-icon-box">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e11d48" strokeWidth="2">
              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3-3.5 3.5z" />
            </svg>
          </div>
          <div>
            <h2 className="page-title">Change password</h2>
          </div>
        </div>

        <form className="change-password-form" onSubmit={handleSubmit}>
          {error && <div className="message error">{error}</div>}
          {successMessage && <div className="message success">{successMessage}</div>}
          {fieldErrors.token && <div className="message error">{fieldErrors.token}</div>}

          <div className="form-input-group">
            <label className="input-label">New password</label>
            <input
              className={`form-input-field ${fieldErrors.new_password ? 'input-error' : ''}`}
              type={showPass ? 'text' : 'password'}
              placeholder="8+ chars, letters & numbers"
              value={form.new_password}
              onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            />
            <button type="button" className="eyeicon" onClick={() => setShowPass(!showPass)}>
              <EyeIcon open={showPass} />
            </button>
            {fieldErrors.new_password && <p className="field-error-text">{fieldErrors.new_password}</p>}
          </div>

          <div className="form-input-group">
            <label className="input-label">Confirm new password</label>
            <input
              className={`form-input-field ${fieldErrors.confirm ? 'input-error' : ''}`}
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
            <button type="button" className="eyeicon" onClick={() => setShowConfirm(!showConfirm)}>
              <EyeIcon open={showConfirm} />
            </button>
            {fieldErrors.confirm && <p className="field-error-text">{fieldErrors.confirm}</p>}
          </div>

          <button className="submit-btn-rose" type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}