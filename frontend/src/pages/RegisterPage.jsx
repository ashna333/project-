import { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { validateRegisterForm } from '../utils/validation'
import DateOfBirthSelect from '../components/DateOfBirthSelect';
import AlertModal from '../components/AlertModal'

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



export default function Registeauthage() {
  const navigate = useNavigate()
  const { register, loading, error, successMessage, clearMessages } = useAuthStore()

  const [form, setForm] = useState({ 
    first_name: '', last_name: '', email: '', 
    password: '', confirm_password: '', dob: '' 
  })
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [alertModal, setAlertModal] = useState(null)

   const handleGoogleSignIn = () => {
    const googleAuthUrl = import.meta.env.VITE_GOOGLE_AUTH_URL
    if (!googleAuthUrl) {
      setAlertModal({
        title: 'Google sign-in unavailable',
        message: 'Set VITE_GOOGLE_AUTH_URL in your environment after the backend Google auth endpoint is configured.',
      })
      return
    }
    window.location.href = googleAuthUrl
  }
  const handleChange = (e) => {
    clearMessages()
    setFieldErrors(prev => ({ ...prev, [e.target.name]: '' }))
    setForm(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const validate = () => {
    const errs = validateRegisterForm(form)
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const res = await register({ ...form, email: form.email.trim().toLowerCase() })
    if (res.success) {
      setTimeout(() => navigate('/login'), 1500)
    } else if (res.error?.toLowerCase().includes('already exists')) {
      setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered. Sign in instead.' }))
    }
  }

  return (
    <>
      
      <div className="auth-root">
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19c-3 0-5.5-2.5-5.5-5.5s2.5-5.5 5.5-5.5 5.5 2.5 5.5 5.5-2.5 5.5-5.5 5.5Z" opacity="0.2" fill="white" stroke="none"/>
                <path d="M12 13V7m-4 4 4 4 4-4" />
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
              </svg>
            </div>
            <span className="auth-brand-name">CloudShare</span>
          </div>
          <div className="auth-hero">
            <h1 className="auth-hero-title">Your files,</h1>
            <h1 className="auth-hero-accent">your rules.</h1>
            <p className="auth-hero-sub">1GB free storage. Unlimited shares. Zero friction.</p>
          </div>
        </div>

        <div className="auth-right">
          <div className="auth-box">
            <h2 className="auth-form-title">Create account</h2>
            <p className="auth-form-sub">Start sharing in seconds</p>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
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

              <div className="auth-row">
                <div className="auth-group">
                  <label className="auth-label">First Name</label>
                  <input 
                    className={`auth-input ${fieldErrors.first_name ? 'error' : ''}`} 
                    name="first_name" 
                    value={form.first_name}
                    onChange={handleChange} 
                  />
                  {fieldErrors.first_name && <span className="field-error">⚠ {fieldErrors.first_name}</span>}
                </div>
                <div className="auth-group">
                  <label className="auth-label">Last Name</label>
                  <input 
                    className={`auth-input ${fieldErrors.last_name ? 'error' : ''}`} 
                    name="last_name" 
                    value={form.last_name}
                    onChange={handleChange} 
                  />
                  {fieldErrors.last_name && <span className="field-error">⚠ {fieldErrors.last_name}</span>}
                </div>
              </div>

              <div className="auth-group">
                <label className="auth-label">Email</label>
                <input 
                  className={`auth-input ${fieldErrors.email ? 'error' : ''}`} 
                  name="email" 
                  type="email" 
                  value={form.email}
                  onChange={handleChange} 
                />
                {fieldErrors.email && <span className="field-error">⚠ {fieldErrors.email}</span>}
              </div>


<div className="auth-group">
  <label className="auth-label">Date of Birth</label>
  <DateOfBirthSelect
    value={form.dob}
    onChange={handleChange}
    name="dob"
    error={fieldErrors.dob}
  />
  {fieldErrors.dob && <span className="field-error">⚠ {fieldErrors.dob}</span>}
</div>

              <div className="auth-group">
                <label className="auth-label">Password</label>
                <div className="auth-input-wrap">
                  <input 
                    className={`auth-input ${fieldErrors.password ? 'error' : ''}`} 
                    name="password" 
                    type={showPass ? 'text' : 'password'} 
                    placeholder="8+ chars, letters & numbers" 
                    value={form.password}
                    onChange={handleChange} 
                  />
                  <button type="button" className="auth-input-icon-btn" onClick={() => setShowPass(!showPass)}>
                    <EyeIcon open={showPass} />
                  </button>
                </div>
                {fieldErrors.password && <span className="field-error">⚠ {fieldErrors.password}</span>}
              </div>

              <div className="auth-group">
                <label className="auth-label">Confirm Password</label>
                <div className="auth-input-wrap">
                  <input 
                    className={`auth-input ${fieldErrors.confirm_password ? 'error' : ''}`} 
                    name="confirm_password" 
                    type={showConfirm ? 'text' : 'password'} 
                    value={form.confirm_password}
                    onChange={handleChange} 
                  />
                  <button type="button" className="auth-input-icon-btn" onClick={() => setShowConfirm(!showConfirm)}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {fieldErrors.confirm_password && <span className="field-error">⚠ {fieldErrors.confirm_password}</span>}
              </div>

              <button className="auth-submit" type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create account"}
              </button>
              <div className="auth-divider">or</div>
              <button type="button" className="btn btn-google" onClick={handleGoogleSignIn}>
                <span className="google-mark">G</span>
                Continue with Google
              </button>
            </form>

            <div className="auth-footer">
              Already have an account? <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>

      <AlertModal
        open={!!alertModal}
        title={alertModal?.title}
        message={alertModal?.message}
        onClose={() => setAlertModal(null)}
      />
    </>
  )
}