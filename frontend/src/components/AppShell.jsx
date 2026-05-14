import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CloudUpload, Files, Share2, LogOut, Layers, KeyRound, Trash2 ,Star,User, Settings, ChevronDown} from 'lucide-react';
import '../styles/DashboardPage.css';
import { useEffect, useRef, useState } from 'react';

// ... imports stay the same

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  
  const rawUser = JSON.parse(localStorage.getItem('auth_user')) || {};
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const cleanName = (name) => {
    if (!name) return 'User';
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

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setIsMenuOpen(false);
    }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
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
            <button className={`nav-btn ${isActive('/starred')}`} onClick={() => navigate('/starred')}>
              <Star size={18} /> Starred
            </button>
            <button className={`nav-btn ${isActive('/trash')}`} onClick={() => navigate('/trash')}>
              <Trash2 size={18} /> Trash
            </button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            
            <div className="user-dropdown-container" ref={menuRef}>
                {/* Trigger */}
                <div 
                  className="user-profile-trigger" 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                  
                  <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>
                {firstName} {lastName}
              </div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>{userEmail}</div>
            </div>
            
                  <ChevronDown size={14} className={`chevron ${isMenuOpen ? 'rotate' : ''}`} />
                </div>
                <div className="avatar-circle">
                    {firstName[0]}{lastName[0]}
                  </div>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div className="profile-dropdown-menu fade-in">
                    <div className="dropdown-header">Account</div>
                    
                    <button className="dropdown-item" onClick={() => { navigate('/profile'); setIsMenuOpen(false); }}>
                      <User size={16} /> My Profile
                    </button>
                    
                    <div className="dropdown-divider"></div>

                    <button className="dropdown-item logout-item" onClick={() => { setShowLogoutConfirm(true); setIsMenuOpen(false); }}>
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
            </div>
          </div>
        </div>
      </header>

      <main className="shell-content">
        <Outlet />
      </main>
      {showLogoutConfirm && (
        <div className="modal-overlaydelete" style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
          <div className="modal-content">
            <h3 className="modal-title">Confirm Logout</h3>
            <p className="modal-subtitle">Are you sure you want to end your session?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowLogoutConfirm(false)}>Stay Logged In</button>
              <button className="btn-revoke" onClick={handleLogout}>Logout</button>
            </div>
          </div>
        </div>
      )}
    
  
    </div>
  );
}