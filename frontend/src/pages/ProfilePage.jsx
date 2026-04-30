import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import useAuthStore from '../store/authStore'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'
  const isGoogle = user?.auth_provider === 'google'

  return (
    <AppShell title="Profile" subtitle="Manage your account details and security.">
      <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
        <div className="profile-summary">
          <div className="profile-avatar-lg">{initials}</div>
          <div>
            <div className="profile-name">{`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'User'}</div>
            <div className="profile-email">{user?.email || '-'}</div>
          </div>
        </div>
        <div className="profile-grid">
          <div className="profile-field"><span>First name</span><strong>{user?.first_name || '-'}</strong></div>
          <div className="profile-field"><span>Last name</span><strong>{user?.last_name || '-'}</strong></div>
          <div className="profile-field"><span>Email</span><strong>{user?.email || '-'}</strong></div>
          <div className="profile-field"><span>Date of birth</span><strong>{user?.dob || '-'}</strong></div>
        </div>
        <div style={{ marginTop: 16 }}>
          {!isGoogle ? (
            <button className="btn btn-primary" style={{ maxWidth: 260 }} onClick={() => navigate('/change-password')}>
              Change password
            </button>
          ) : (
            <div className="fm-alert fm-alert-warning" style={{ maxWidth: 420 }}>
              Password change is disabled for Google-authenticated accounts.
            </div>
          )}
        </div>
      </section>
    </AppShell>
  )
}
