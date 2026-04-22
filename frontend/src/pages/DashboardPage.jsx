import { useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'
    : 'U'

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : user?.email ?? 'User'

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="dashboard page-enter">
      {/* Navbar */}
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <span>⚡ CloudNest</span>
          <span className="dot" />
        </div>
        <div className="nav-actions">
          <div className="user-badge">
            <div className="avatar">{initials}</div>
            <span>{displayName}</span>
          </div>
          <button className="btn-sm" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </nav>

      {/* Body */}
      <div className="dashboard-body">
        <div className="dashboard-welcome">
          <div className="tag">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display:'inline-block' }} />
            Authenticated
          </div>
          <h1>Welcome back, {user?.first_name ?? 'there'} 👋</h1>
          <p>You're successfully logged in. Here's your account overview.</p>
        </div>

        <div className="dashboard-grid">
          {/* Profile Card */}
          <div className="dash-card" style={{ animationDelay: '0.05s' }}>
            <div className="card-icon" style={{ background: 'rgba(108,99,255,0.12)' }}>👤</div>
            <h3>Profile</h3>
            <p style={{ marginBottom: 12 }}>
              <strong style={{ color: 'var(--text-primary)' }}>{displayName}</strong>
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              {user?.email}
            </p>
            <span className="btn-sm" style={{ cursor: 'default', color: 'var(--success)', borderColor: 'rgba(67,217,162,0.3)' }}>
              ● Active
            </span>
          </div>

          {/* Security Card */}
          <div className="dash-card" style={{ animationDelay: '0.1s' }}>
            <div className="card-icon" style={{ background: 'rgba(255,101,132,0.12)' }}>🔐</div>
            <h3>Security</h3>
            <p>Manage your password and keep your account protected.</p>
            <button className="btn-sm" onClick={() => navigate('/change-password')}>
              Change Password →
            </button>
          </div>

          {/* Session Card */}
          <div className="dash-card" style={{ animationDelay: '0.15s' }}>
            <div className="card-icon" style={{ background: 'rgba(255,209,102,0.12)' }}>🔑</div>
            <h3>Session</h3>
            <p>Your session is protected with JWT. Tokens auto-refresh every hour.</p>
            <button className="btn-sm" onClick={handleLogout} style={{ color: 'var(--error)', borderColor: 'rgba(255,107,107,0.3)' }}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}