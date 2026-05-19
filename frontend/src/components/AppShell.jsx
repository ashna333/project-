import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CloudUpload, Files, Share2, LogOut, Layers, Trash2, Star, User, ChevronDown, Menu, X, Inbox, Shield } from 'lucide-react';
import '../styles/DashboardPage.css';
import { useEffect, useRef, useState } from 'react';
import { formatUserDisplayName, userInitials } from '../utils/userDisplay';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

// ... imports stay the same

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  
  const rawUser = JSON.parse(localStorage.getItem('auth_user')) || {};
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);
  const userEmail = rawUser.email || '';
  const displayName = formatUserDisplayName(rawUser);
  const initials = userInitials(rawUser);

  useBodyScrollLock(showLogoutConfirm);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('token');
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
    <div className="dashboard-container app-layout">
      {/* Sidebar Navigation */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', marginBottom: '32px' }}>
          <div className="brand-icon"><CloudUpload size={20} color="white" /></div>
          <span>Cloud<span className="rose-text">Share</span></span>
        </div>

        <nav className="sidebar-nav">
          {/* Main */}
          <div className="sidebar-section-label">Main</div>
          <button className={`nav-btn ${isActive('/dashboard')}`} onClick={() => { navigate('/dashboard'); setIsMobileMenuOpen(false); }}>
            <Layers size={16} /> Dashboard
          </button>
          <button className={`nav-btn ${isActive('/files')}`} onClick={() => { navigate('/files'); setIsMobileMenuOpen(false); }}>
            <Files size={16} /> My Files
          </button>
          <button className={`nav-btn ${isActive('/upload')}`} onClick={() => { navigate('/upload'); setIsMobileMenuOpen(false); }}>
            <CloudUpload size={16} /> Upload
          </button>

          {/* Sharing */}
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Sharing</div>
          <button className={`nav-btn ${isActive('/shared')}`} onClick={() => { navigate('/shared'); setIsMobileMenuOpen(false); }}>
            <Share2 size={16} /> Public Links
          </button>
          <button className={`nav-btn ${isActive('/private-shares/inbox')}`} onClick={() => { navigate('/private-shares/inbox'); setIsMobileMenuOpen(false); }}>
            <Inbox size={16} /> Shared With Me
          </button>
          <button className={`nav-btn ${isActive('/private-shares/owned')}`} onClick={() => { navigate('/private-shares/owned'); setIsMobileMenuOpen(false); }}>
            <Shield size={16} /> Shared By Me
          </button>

          {/* Collections */}
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Collections</div>
          <button className={`nav-btn ${isActive('/starred')}`} onClick={() => { navigate('/starred'); setIsMobileMenuOpen(false); }}>
            <Star size={16} /> Starred
          </button>
          <button className={`nav-btn ${isActive('/trash')}`} onClick={() => { navigate('/trash'); setIsMobileMenuOpen(false); }}>
            <Trash2 size={16} /> Trash
          </button>

          <div className="sidebar-divider" style={{ marginTop: 'auto' }} />
          <div className="sidebar-section-label">Account</div>
          <button className={`nav-btn ${isActive('/profile')}`} onClick={() => { navigate('/profile'); setIsMobileMenuOpen(false); }}>
            <User size={16} /> My Profile
          </button>
          <button className="nav-btn" style={{ color: '#fda4af' }} onClick={() => { setShowLogoutConfirm(true); setIsMobileMenuOpen(false); }}>
            <LogOut size={16} /> Logout
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="mobile-brand-container">
            <button 
              className="mobile-menu-btn" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={24} color="white" /> : <Menu size={24} color="white" />}
            </button>
            <div className="brand mobile-brand" onClick={() => navigate('/dashboard')}>
              <div className="brand-icon"><CloudUpload size={20} color="white" /></div>
              <span>Cloud<span className="rose-text">Share</span></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto' }}>
            <div className="user-dropdown-container">
                <div className="user-profile-trigger" style={{ cursor: 'default' }}>
                  <div style={{ textAlign: 'right' }} className="user-details-text">
                    <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>
                      {displayName}
                    </div>
                    <div style={{ fontSize: '11px', color: '#71717a' }}>{userEmail}</div>
                  </div>
                </div>
                <div className="avatar-circle">
                    {initials}
                </div>
            </div>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>

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