import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import useAuthStore from '../store/authStore'

export default function ChangePasswordPage() {
  const navigate = useNavigate()
  const { changePassword, user } = useAuthStore()
  const isGoogle = user?.auth_provider === 'google'
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_new_password: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (form.new_password !== form.confirm_new_password) {
      setError('Passwords do not match.')
      return
    }
    const result = await changePassword(form)
    if (result.success) {
      setMessage('Password changed successfully.')
      setForm({ old_password: '', new_password: '', confirm_new_password: '' })
      return
    }
    setError('Failed to change password.')
  }

  return (
    <AppShell title="Change Password" subtitle="Update your password securely.">
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, maxWidth: 620 }}>
        {isGoogle ? (
          <>
            <div className="alert alert-error" style={{ marginBottom: 12 }}>
              Password change is disabled for Google-authenticated accounts.
            </div>
            <button className="btn btn-ghost" type="button" onClick={() => navigate('/profile')}>Back to profile</button>
          </>
        ) : (
          <>
            {message ? <div className="alert alert-success">{message}</div> : null}
            {error ? <div className="alert alert-error">{error}</div> : null}
            <form className="form" onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Current password</label>
                <input className="form-input" type="password" value={form.old_password} onChange={(e) => setForm((p) => ({ ...p, old_password: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input className="form-input" type="password" value={form.new_password} onChange={(e) => setForm((p) => ({ ...p, new_password: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm new password</label>
                <input className="form-input" type="password" value={form.confirm_new_password} onChange={(e) => setForm((p) => ({ ...p, confirm_new_password: e.target.value }))} required />
              </div>
              <button className="btn btn-primary" type="submit">Update password</button>
              <button className="btn btn-ghost" type="button" onClick={() => navigate('/profile')}>Back to profile</button>
            </form>
          </>
        )}
      </section>
    </AppShell>
  )
}