import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CloudUpload, Files, Share2, LogOut, Layers, KeyRound, Trash2 } from 'lucide-react';
import '../styles/DashboardPage.css';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  
const rawUser = JSON.parse(localStorage.getItem('auth_user')) || {};
  
  // Helper to remove "Google User" or extra suffixes
  const cleanName = (name) => {
    if (!name) return 'User';
    // Removes "Google User" and trims extra spaces
    return name.replace(/Google User/i, '').trim();
  };

  const firstName = cleanName(rawUser.first_name);
  const lastName = cleanName(rawUser.last_name);
  const userEmail = rawUser.email || '';

  const handleLogout = () => {
    localStorage.removeItem('access_token'); // Or your specific key
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <div className="dashboard-container">
      <header className="main-header">
        <div className="header-content">
          <div className="brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>
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
            <button className={`nav-btn ${isActive('/trash')}`} onClick={() => navigate('/trash')}>
              <Trash2 size={18} /> Trash
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>
                {firstName} {lastName}
              </div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>{userEmail}</div>
            </div>
            <LogOut 
              size={18} 
              color="#71717a" 
              style={{ cursor: 'pointer' }} 
              onClick={handleLogout} 
            />
          </div>
        </div>
      </header>

      {/* This is where FileManagerPage, TrashPage, etc. will appear */}
      <main className="shell-content">
        <Outlet />
      </main>
    </div>
  );
}