import { useState, useEffect } from 'react' // 1. Added useEffect
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { validateEmail } from '../utils/validation'
import '../styles/Forgotpassword.css'

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error, successMessage, clearMessages } = useAuthStore()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')

  // 2. Automatically clear messages after 5 seconds
  useEffect(() => {
    if (error || successMessage) {
      const timer = setTimeout(() => {
        clearMessages()
      }, 3000) // Adjust time (5000ms = 5s) as needed

      return () => clearTimeout(timer)
    }
  }, [error, successMessage, clearMessages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validateEmail(email)
    if (err) {
      setFieldError(err)
      return
    }
    setFieldError('')
    
    await forgotPassword(email)
    
    // 3. Clear the input box after clicking the button
    // You can also wrap this in an 'if (successMessage)' check if your store updates instantly
    setEmail('') 
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <Link to="/login" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Back to sign in
        </Link>

        <div className="brand-wrapper">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 13v8" />
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
              <path d="m8 17 4-4 4 4" />
            </svg>
          </div>
          <span className="brand-name">CloudShare</span>
        </div>

        <h2 className="auth-title">Forgot password?</h2>
        <p className="auth-subtitle">Enter your email and we'll send you a reset link.</p>

        {/* Feedback Messages */}
        {error && <div className="message error">{error}</div>}
        {successMessage && <div className="message success">{successMessage}</div>}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className={`form-input ${fieldError ? 'input-error' : ''}`}
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => {
                if(fieldError) setFieldError("");
                setEmail(e.target.value);
              }}
             
            />
            {fieldError && <p className="field-error-text">{fieldError}</p>}
          </div>

          <button
            className="btn-primary"
            type="submit"
            disabled={loading}
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
      </div>
    </div>
  )
}