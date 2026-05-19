import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { resetPassword, loading, error, successMessage, clearMessages } = useAuthStore()
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [form, setForm] = useState({ new_password: '', confirm: '' })
  const [fieldErrors, setFieldErrors] = useState({})

  useEffect(() => {
    return () => clearMessages()
  }, [clearMessages])
  

  useEffect(() => {
    if (!error && !successMessage) return

    const timer = setTimeout(() => {
      clearMessages()
    }, 5000)

    return () => clearTimeout(timer) // cleanup if message changes before 5s
  }, [error, successMessage, clearMessages])



 const handleSubmit = async (e) => {
  e.preventDefault()

  if (!token) {
    setFieldErrors({ token: 'Invalid or missing reset link. Request a new one.' })
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

  const result = await resetPassword(
    token,
    form.new_password,
    form.confirm
  )

  if (result.success) {
    setTimeout(() => navigate('/login'), 3000)
  }
}
  return (
    <div className="auth-container reset-page-layout">
      <div className="reset-wrapper">
        {/* Security Header */}
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

        {/* The Stylized Form Container */}
        <form className="change-password-form" onSubmit={handleSubmit}>
          {error && <div className="message error">{error}</div>}
          {successMessage && <div className="message success">{successMessage}</div>}

          <div className="form-input-group">
            <label className="input-label">New password</label>

            <input
              className={`form-input-field ${fieldErrors.new_password ? 'input-error' : ''}`}
              type={showPass ? 'text' : 'password'}
              placeholder="8+ chars, letters & numbers"
              value={form.new_password}
              onChange={(e) =>
                setForm({ ...form, new_password: e.target.value })
              }
            />

            <button
              type="button"
              className="eyeicon"
              onClick={() => setShowPass(!showPass)}
            >
              <EyeIcon open={showPass} />
            </button>

            {fieldErrors.new_password && (
              <p className="field-error-text">{fieldErrors.new_password}</p>
            )}
          </div>

          <div className="form-input-group">
              <label className="input-label">Confirm new password</label>

              <input
                className={`form-input-field ${fieldErrors.confirm ? 'input-error' : ''}`}
                type={showConfirm ? "text" : "password"}
                value={form.confirm}
                onChange={(e) =>
                  setForm({ ...form, confirm: e.target.value })
                }
              />

              <button
                type="button"
                className="eyeicon"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                <EyeIcon open={showConfirm} />
              </button>

              {fieldErrors.confirm && (
                <p className="field-error-text">{fieldErrors.confirm}</p>
              )}
            </div>

          <button className="submit-btn-rose" type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  )
}