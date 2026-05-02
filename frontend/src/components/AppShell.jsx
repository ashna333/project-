import { NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useAuthStore from '../store/authStore'
import { storageSummaryApi } from '../api/fileApi'

const navStyle = ({ isActive }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 14px',
  borderRadius: 999,
  textDecoration: 'none',
  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  background: isActive ? 'var(--accent-soft)' : 'transparent',
  border: isActive ? '1px solid var(--accent-soft-border)' : '1px solid transparent',
  fontWeight: isActive ? 700 : 600,
})

export default function AppShell({ title, subtitle, children }) {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [storage, setStorage] = useState({ used_percent: 0, used_bytes: 0, max_bytes: 1024 * 1024 * 1024 })

  useEffect(() => {
    storageSummaryApi()
      .then(({ data }) => {
        setStorage(data)
      })
      .catch(() => {})
  }, [])

  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'

  const navItems = [
    { to: '/dashboard', label: 'Overview', icon: '⌂' },
    { to: '/files', label: 'My Drive', icon: '▦' },
    { to: '/sharing', label: 'Shared with me', icon: '↗' },
    { to: '/trash', label: 'Trash', icon: '⌫' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <span className="drive-brand-mark">◆</span>
          CloudNest Drive
        </div>
        <div className="nav-actions">
          <button className="user-avatar-btn" title={user?.email || ''}>{initials}</button>
          <button className="btn-sm" onClick={() => { if (window.confirm('Are you sure you want to logout?')) { logout(); navigate('/login') } }}>Sign out</button>
        </div>
      </nav>
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="dashboard-hero-card">
            <h2 style={{ marginBottom: 6 }}>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="sidebar-section-label">Main</div>
          <div style={{ display: 'grid', gap: 8 }}>
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} style={navStyle}>
                <span className="sidebar-nav-icon">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="storage-card" style={{ marginTop: 8 }}>
              <div className="storage-card-title">STORAGE</div>

              <div className="storage-card-topline">
                <strong>
                  {(storage.used_bytes / (1024 * 1024)).toFixed(1)} MB
                </strong>{' '}
                of {(storage.max_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB used
              </div>

              <div className="storage-track-lg">
                <div
                  className="storage-fill-lg"
                  style={{
                    width: `${storage.used_percent > 0 ? Math.max(storage.used_percent, 2) : 0}%`
                  }}
                />
              </div>

                  <div className="storage-card-meta">
                    <span>{(storage.used_percent || 0).toFixed(2)}% used</span>
                    <span>
                      {((storage.remaining_bytes || 0) / (1024 * 1024)).toFixed(1)} MB remaining
                    </span>
                  </div>
        </div>
          <div style={{ marginTop: 'auto', display: 'grid', gap: 8 }}>
            <div className="sidebar-section-label">Account</div>
            <NavLink to="/profile" style={navStyle}>Profile</NavLink>
            <NavLink to="/change-password" style={navStyle}>Change Password</NavLink>
          </div>
        </aside>
        <main className="dashboard-main">{children}</main>
      </div>
    </div>
  )
}
