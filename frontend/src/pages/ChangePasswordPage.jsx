import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { changePassword, loading, error, successMessage, clearMessages } = useAuthStore()

  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_new_password: '' })
  const [show, setShow] = useState({ old: false, new: false, confirm: false })
  const [fieldErrors, setFieldErrors] = useState({})

  const validate = () => {
    const errs = {}
    if (!form.old_password) errs.old_password = 'Current password is required'
    if (form.new_password.length < 8) errs.new_password = 'At least 8 characters'
    if (form.new_password === form.old_password) errs.new_password = 'New password must differ from current'
    if (form.new_password !== form.confirm_new_password) errs.confirm_new_password = 'Passwords do not match'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleChange = (field) => (e) => {
    clearMessages()
    setFieldErrors((p) => ({ ...p, [field]: '' }))
    setForm((p) => ({ ...p, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    const result = await changePassword(form)
    if (result.success) {
      setForm({ old_password: '', new_password: '', confirm_new_password: '' })
      setTimeout(() => navigate('/dashboard'), 2000)
    }
  }

  return (
    <AuthLayout
      eyebrow="Security"
      title="Change password"
      subtitle="Update your password to keep your account secure."
      features={[
        'Enter your current password to verify',
        'New password must be 8+ characters',
        'You stay logged in after changing',
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
            <span>✓</span> {successMessage} Redirecting…
          </div>
        )}

        {[
          { field: 'old_password', label: 'Current Password', placeholder: 'Your current password', key: 'old' },
          { field: 'new_password', label: 'New Password', placeholder: 'Min. 8 characters', key: 'new' },
          { field: 'confirm_new_password', label: 'Confirm New Password', placeholder: 'Repeat new password', key: 'confirm' },
        ].map(({ field, label, placeholder, key }) => (
          <div className="form-group" key={field}>
            <label className="form-label">{label}</label>
            <div className="form-input-wrap">
              <input
                className={`form-input has-icon${fieldErrors[field] ? ' error' : ''}`}
                type={show[key] ? 'text' : 'password'}
                placeholder={placeholder}
                value={form[field]}
                onChange={handleChange(field)}
              />
              <button
                type="button"
                className="input-icon"
                onClick={() => setShow((p) => ({ ...p, [key]: !p[key] }))}
              >
                <EyeIcon open={show[key]} />
              </button>
            </div>
            {fieldErrors[field] && <span className="field-error">⚠ {fieldErrors[field]}</span>}
          </div>
        ))}

        <button className="btn btn-primary" type="submit" disabled={loading || !!successMessage}>
          {loading ? <span className="spinner" /> : 'Update Password →'}
        </button>

        <button type="button" className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </button>
      </form>
    </AuthLayout>
  )
}