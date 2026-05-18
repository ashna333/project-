import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CloudUpload, Files, Share2, LogOut, Layers, KeyRound } from 'lucide-react';
import '../styles/DashboardPage.css';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user')) || { first_name: 'User', last_name: '', email: '' };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper to check if link is active
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="dashboard-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon"><CloudUpload size={20} color="white" /></div>
            <span>Cloud<span className="rose-text">Share</span></span>
          </div>

          <nav className="nav-links">
            <button className={`nav-btn ${isActive('/dashboard')}`} onClick={() => navigate('/dashboard')}>
              <Layers size={18} /> Dashboard
            </button>
            <button className={`nav-btn ${isActive('/files')}`} onClick={() => navigate('/files')}>
              <Files size={18} /> My Files
            </button>
            <button className={`nav-btn ${isActive('/upload')}`} onClick={() => navigate('/upload')}>
              <CloudUpload size={18} /> Upload
            </button>
            <button className={`nav-btn ${isActive('/shared')}`} onClick={() => navigate('/shared')}>
              <Share2 size={18} /> Shared
            </button>
            <button className={`nav-btn ${isActive('/settings')}`} onClick={() => navigate('/settings')}>
              <KeyRound size={18} /> Password
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>
                {user.first_name} {user.last_name}
              </div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>{user.email}</div>
            </div>
            <LogOut size={18} color="#71717a" cursor="pointer" onClick={handleLogout} />
          </div>
        </div>
      </header>

      {/* This renders the actual page content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}