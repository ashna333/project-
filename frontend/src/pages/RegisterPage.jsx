import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, loading, error, successMessage, clearMessages } = useAuthStore()

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm_password: '', dob: '',
  })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.first_name.trim()) errs.first_name = 'Required'
    if (!form.last_name.trim()) errs.last_name = 'Required'
    if (!form.email.includes('@')) errs.email = 'Enter a valid email'
    if (form.password.length < 8) errs.password = 'At least 8 characters'
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match'
    if (!form.dob) errs.dob = 'Date of birth is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (e) => {
    clearMessages()
    setFieldErrors((prev) => ({ ...prev, [e.target.name]: '' }))
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await register(form)
    if (result.success) {
      setTimeout(() => navigate('/login'), 1500)
    }
  }

  const handleGoogleSignIn = () => {
    const googleAuthUrl = import.meta.env.VITE_GOOGLE_AUTH_URL
    if (!googleAuthUrl) {
      window.alert('Google sign-in UI is added, but backend OAuth URL is not configured yet. Set VITE_GOOGLE_AUTH_URL after your backend Google auth endpoint is ready.')
      return
    }
    window.location.href = googleAuthUrl
  }

  return (
    <AuthLayout
      eyebrow="Get started"
      title="Create account"
      subtitle="Join thousands of users. Set up in under a minute."
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        {error && (
          <div className="alert alert-error">
            <span>⚠</span> {error}
          </div>
        )}
        {successMessage && (
          <div className="alert alert-success">
            <span>✓</span> {successMessage}
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">First Name</label>
            <input
              className={`form-input${fieldErrors.first_name ? ' error' : ''}`}
              name="first_name"
              placeholder="John"
              value={form.first_name}
              onChange={handleChange}
            />
            {fieldErrors.first_name && <span className="field-error">⚠ {fieldErrors.first_name}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Last Name</label>
            <input
              className={`form-input${fieldErrors.last_name ? ' error' : ''}`}
              name="last_name"
              placeholder="Doe"
              value={form.last_name}
              onChange={handleChange}
            />
            {fieldErrors.last_name && <span className="field-error">⚠ {fieldErrors.last_name}</span>}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className={`form-input${fieldErrors.email ? ' error' : ''}`}
            name="email"
            type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={handleChange}
          />
          {fieldErrors.email && <span className="field-error">⚠ {fieldErrors.email}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Date of Birth</label>
          <input
            className={`form-input${fieldErrors.dob ? ' error' : ''}`}
            name="dob"
            type="date"
            value={form.dob}
            onChange={handleChange}
            style={{ colorScheme: 'dark' }}
          />
          {fieldErrors.dob && <span className="field-error">⚠ {fieldErrors.dob}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <div className="form-input-wrap">
            <input
              className={`form-input has-icon${fieldErrors.password ? ' error' : ''}`}
              name="password"
              type={showPass ? 'text' : 'password'}
              placeholder="Min. 8 characters"
              value={form.password}
              onChange={handleChange}
            />
            <button type="button" className="input-icon" onClick={() => setShowPass(!showPass)}>
              <EyeIcon open={showPass} />
            </button>
          </div>
          {fieldErrors.password && <span className="field-error">⚠ {fieldErrors.password}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <div className="form-input-wrap">
            <input
              className={`form-input has-icon${fieldErrors.confirm_password ? ' error' : ''}`}
              name="confirm_password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Repeat your password"
              value={form.confirm_password}
              onChange={handleChange}
            />
            <button type="button" className="input-icon" onClick={() => setShowConfirm(!showConfirm)}>
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {fieldErrors.confirm_password && (
            <span className="field-error">⚠ {fieldErrors.confirm_password}</span>
          )}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Create Account →'}
        </button>

        <div className="divider">or</div>

        <button type="button" className="btn btn-google" onClick={handleGoogleSignIn}>
          <span className="google-mark">G</span>
          Continue with Google
        </button>
      </form>

      <div className="auth-footer">
        Already have an account? <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  )
}