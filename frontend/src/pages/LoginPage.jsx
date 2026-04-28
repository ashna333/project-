import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
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

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loading, error, successMessage, clearMessages } = useAuthStore()

  const from = location.state?.from?.pathname || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!email.includes('@')) errs.email = 'Enter a valid email'
    if (!password) errs.password = 'Password is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await login(email, password)
    if (result.success) navigate(from, { replace: true })
  }

  const handleChange = (setter, field) => (e) => {
    clearMessages()
    setFieldErrors((p) => ({ ...p, [field]: '' }))
    setter(e.target.value)
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
      eyebrow="Welcome back"
      title="Sign in"
      subtitle="Enter your credentials to access your account."
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

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className={`form-input${fieldErrors.email ? ' error' : ''}`}
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={handleChange(setEmail, 'email')}
            autoFocus
          />
          {fieldErrors.email && <span className="field-error">⚠ {fieldErrors.email}</span>}
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className="form-label">Password</label>
            <Link
              to="/forgot-password"
              style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="form-input-wrap">
            <input
              className={`form-input has-icon${fieldErrors.password ? ' error' : ''}`}
              type={showPass ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={handleChange(setPassword, 'password')}
            />
            <button type="button" className="input-icon" onClick={() => setShowPass(!showPass)}>
              <EyeIcon open={showPass} />
            </button>
          </div>
          {fieldErrors.password && <span className="field-error">⚠ {fieldErrors.password}</span>}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Sign In →'}
        </button>

        <div className="divider">or</div>

        <button type="button" className="btn btn-google" onClick={handleGoogleSignIn}>
          <span className="google-mark">G</span>
          Continue with Google
        </button>
      </form>

      <div className="auth-footer">
        Don't have an account? <Link to="/register">Create one</Link>
      </div>
    </AuthLayout>
  )
}