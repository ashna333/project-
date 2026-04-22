import { useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import AuthLayout from '../components/AuthLayout'

export default function ForgotPasswordPage() {
  const { forgotPassword, loading, error, successMessage, clearMessages } = useAuthStore()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) { setFieldError('Enter a valid email address'); return }
    setFieldError('')
    await forgotPassword(email)
  }

  return (
    <AuthLayout
      eyebrow="Account recovery"
      title="Forgot password?"
      subtitle="No worries. Enter your email and we'll send you a reset link."
      features={[
        'Reset link sent to your email',
        'Link is single-use and secure',
        'Back to login anytime',
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
            <span>✓</span> {successMessage}
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <input
            className={`form-input${fieldError ? ' error' : ''}`}
            type="email"
            placeholder="john@example.com"
            value={email}
            onChange={(e) => { clearMessages(); setFieldError(''); setEmail(e.target.value) }}
            autoFocus
          />
          {fieldError && <span className="field-error">⚠ {fieldError}</span>}
        </div>

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Send Reset Link →'}
        </button>

        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => window.history.back()}
        >
          ← Back
        </button>
      </form>

      <div className="auth-footer">
        Remembered it? <Link to="/login">Sign in</Link>
      </div>
    </AuthLayout>
  )
}