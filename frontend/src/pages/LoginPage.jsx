import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import '../styles/AuthStyles.css'
import { useToast } from '../components/ToastContext'
import { CloudUpload, Lock, Mail } from "lucide-react"

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
  const { login, loading, error, clearMessages } = useAuthStore()
  const { showToast } = useToast()

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

  const handleChange = (setter, field) => (e) => {
    clearMessages()
    setFieldErrors((p) => ({ ...p, [field]: '' }))
    setter(e.target.value)
  }

 const handleSubmit = async (e) => {
  e.preventDefault()
  if (!validate()) return
  
  const result = await login(email, password)
  
  if (result.success) {
    showToast("Welcome back!") // Trigger the global toast
    navigate(from, { replace: true })
  }
}
  const handleGoogleSignIn = () => {
    const googleAuthUrl = import.meta.env.VITE_GOOGLE_AUTH_URL
    if (googleAuthUrl) window.location.href = googleAuthUrl
  }

  return (
    <>
      
      <div className="auth-root">
        {/* Left Branding Panel */}
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M12 13V7m-4 4 4 4 4-4" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="auth-brand-name">CloudShare</span>
          </div>
          <div className="auth-hero">
            <h1 className="auth-hero-title">Share files</h1>
            <h1 className="auth-hero-accent">without limits.</h1>
            <p className="auth-hero-sub">
              Encrypted cloud storage with time-boxed share links, delivered straight to inboxes.
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="auth-right">
          <div className="auth-box">
            <h2 className="auth-form-title">Sign in</h2>
            <p className="auth-form-sub">Access your secure file vault</p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              {error && (
                <div className="alert alert-error">
                  <span>⚠</span> {error}
                </div>
              )}

          

              {/* Email Group */}
<div className="auth-group">
  <label className="auth-label">Email</label>
  <div className="auth-input-wrap">
    <div className="auth-input-icon-left">
      <Mail size={16} strokeWidth={2} />
    </div>
    <input 
      className={`auth-input has-icon-left ${fieldErrors.email ? 'error' : ''}`}
      type="email"
      placeholder="you@example.com"
      value={email}
      onChange={handleChange(setEmail, 'email')}
    />
  </div>
  {fieldErrors.email && <span className="field-error">⚠ {fieldErrors.email}</span>}
</div>

{/* Password Group */}
<div className="auth-group">
  <div className="auth-label-row">
    <label className="auth-label">Password</label>
    <Link to="/forgot-password" strokeWidth={1.5} className="auth-forgot">Forgot password?</Link>
  </div>
  <div className="auth-input-wrap">
    <div className="auth-input-icon-left">
      <Lock size={16} strokeWidth={2} />
    </div>
    <input 
      className={`auth-input has-icon-left ${fieldErrors.password ? 'error' : ''}`}
      type={showPass ? 'text' : 'password'}
      placeholder="••••••••"
      value={password}
      onChange={handleChange(setPassword, 'password')}
    />
    <button type="button" className="auth-input-icon-btn" onClick={() => setShowPass(!showPass)}>
      <EyeIcon open={showPass} />
    </button>
  </div>
  {fieldErrors.password && <span className="field-error">⚠ {fieldErrors.password}</span>}
</div>

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
              </button>

              <div className="auth-divider">or</div>

              <button type="button" className="btn btn-google" onClick={handleGoogleSignIn}>
                <span className="google-mark">G</span>
                Continue with Google
              </button>
            </form>

            <div className="auth-footer">
              New to CloudShare? <Link to="/register">Create account</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}