import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import AuthLayout from '../components/AuthLayout'

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

  const [form, setForm] = useState({ new_password: '', confirm: '' })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (form.new_password.length < 8) errs.new_password = 'At least 8 characters'
    if (form.new_password !== form.confirm) errs.confirm = 'Passwords do not match'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await resetPassword(token, form.new_password)
    if (result.success) setTimeout(() => navigate('/login'), 2000)
  }

  if (!token) {
    return (
      <AuthLayout eyebrow="Error" title="Invalid link" subtitle="This password reset link is missing or invalid.">
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          <span>⚠</span> No reset token found in the URL.
        </div>
        <Link to="/forgot-password">
          <button className="btn btn-primary" type="button">Request a new link →</button>
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      eyebrow="Reset password"
      title="Choose new password"
      subtitle="Your new password must be at least 8 characters."
      features={[
        'Minimum 8 characters required',
        'Token is single-use for security',
        'You can log in immediately after',
      ]}
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert-error">
            <span>⚠</span> {error}
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success">
            <span>✓</span> {successMessage} Redirecting to login…
          </div>
        )}

        <div className="form-group">
          <label className="form-label">New Password</label>
          <div className="form-input-wrap">
            <input
              className={`form-input has-icon${fieldErrors.new_password ? ' error' : ''}`}
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={form.new_password}
              onChange={(e) => { clearMessages(); setFieldErrors(p => ({...p, new_password:''})); setForm(p => ({...p, new_password: e.target.value})) }}
            />
            <button type="button" className="input-icon" onClick={() => setShowPass(!showPass)}>
              <EyeIcon open={showPass} />
            </button>
          </div>
          {fieldErrors.new_password && <span className="field-error">⚠ {fieldErrors.new_password}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <div className="form-input-wrap">
            <input
              className={`form-input has-icon${fieldErrors.confirm ? ' error' : ''}`}
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat new password"
              value={form.confirm}
              onChange={(e) => { clearMessages(); setFieldErrors(p => ({...p, confirm:''})); setForm(p => ({...p, confirm: e.target.value})) }}
            />
            <button type="button" className="input-icon" onClick={() => setShowConfirm(!showConfirm)}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {fieldErrors.confirm && <span className="field-error">⚠ {fieldErrors.confirm}</span>}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading || !!successMessage}>
          {loading ? <span className="spinner" /> : 'Reset Password →'}
        </button>
      </form>

      <div className="auth-footer">
        <Link to="/login">Back to Sign in</Link>
      </div>
    </AuthLayout>
  )
}