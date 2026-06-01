import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CloudUpload, Files, Share2, LogOut, Layers, Trash2, Star, User, Menu, X, Inbox, Shield, Plus, Bell } from 'lucide-react';

import '../styles/AppShell.css';
import { useEffect, useState } from 'react';
import { formatUserDisplayName, userInitials } from '../utils/userDisplay';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import { useInboxBadge } from '../context/InboxBadgeContext';
import { storageSummaryApi } from '../store/fileApi';

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const hasNewShares = useInboxBadge();

  const rawUser = JSON.parse(localStorage.getItem('auth_user')) || {};
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const userEmail = rawUser.email || '';
  const displayName = formatUserDisplayName(rawUser);
  const initials = userInitials(rawUser);

  const [storage, setStorage] = useState({ used_percent: 0, used_bytes: 0, max_bytes: 0 });
  const [unresolvedThreadsCount, setUnresolvedThreadsCount] = useState(0);
  const totalGb = storage?.max_bytes ? (storage.max_bytes / (1024 ** 3)) : 0;
  const notifWrapRef = React.useRef(null);

  useEffect(() => {
    const fetchStorage = async () => {
      try {
        const { data } = await storageSummaryApi();
        setStorage(data);
      } catch {}
    };
    fetchStorage();
  }, []);

  useEffect(() => {
    const fetchUnresolved = async () => {
      try {
        const { data } = await fetchUnresolvedThreadsApi();
        setUnresolvedThreadsCount(data?.threads?.length || 0);
      } catch {}
    };
    fetchUnresolved();
  }, []);

  


  // Close sidebar and dropdown when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setShowProfileDropdown(false);
  }, [location.pathname]);

  // Click outside to close dropdown
  useEffect(() => {
    const closeDropdown = () => setShowProfileDropdown(false);
    document.addEventListener('click', closeDropdown);
    return () => document.removeEventListener('click', closeDropdown);
  }, []);

  useBodyScrollLock(showLogoutConfirm || isMobileMenuOpen);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => location.pathname === path ? 'active' : '';

  const navTo = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="dashboard-container app-layout">

      {/* Mobile overlay backdrop */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`app-sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>

        {/* Mobile close button inside sidebar */}
        <button
          className="sidebar-close-btn"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={20} color="white" />
        </button>

        {/* Brand */}
        <div
          className="sidebar-brand"
          onClick={() => navTo('/dashboard')}
          style={{ cursor: 'pointer', marginBottom: '20px' }}
        >
          <div className="brand-icon"><CloudUpload size={20} color="white" /></div>
          <span>Cloud<span className="rose-text">Share</span></span>
        </div>

        {/* + New Button */}
        <button
          className="sidebar-fab"
          onClick={() => navTo('/upload')}
          title="Upload files"
        >
          <Plus size={20} strokeWidth={2} />
          <span>New</span>
        </button>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          <button className={`nav-btn ${isActive('/dashboard')}`} onClick={() => navTo('/dashboard')}>
            <Layers size={16} /> Dashboard
          </button>
          <button className={`nav-btn ${isActive('/files')}`} onClick={() => navTo('/files')}>
            <Files size={16} /> My Files
          </button>

          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Sharing</div>
          <button className={`nav-btn ${isActive('/shared')}`} onClick={() => navTo('/shared')}>
            <Share2 size={16} /> Public Links
          </button>
          <button className={`nav-btn ${isActive('/private-shares/inbox')}`} onClick={() => navTo('/private-shares/inbox')}>
            <Inbox size={16} />
            Shared With Me
            {hasNewShares && <span className="nav-dot" />}
          </button>
          
          <button className={`nav-btn ${isActive('/private-shares/owned')}`} onClick={() => navTo('/private-shares/owned')}>
            <Shield size={16} /> Shared By Me
          </button>

          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Collections</div>
          <button className={`nav-btn ${isActive('/starred')}`} onClick={() => navTo('/starred')}>
            <Star size={16} /> Starred
          </button>
          <button className={`nav-btn ${isActive('/trash')}`} onClick={() => navTo('/trash')}>
            <Trash2 size={16} /> Trash
          </button>

          <div className="sidebar-divider" style={{ marginTop: 'auto' }} />
          <div className="sidebar-section-label">Account</div>
          <button className={`nav-btn ${isActive('/profile')}`} onClick={() => navTo('/profile')}>
            <User size={16} /> My Profile
          </button>
          <button className="nav-btn" style={{ color: '#fda4af' }} onClick={() => { setShowLogoutConfirm(true); setIsMobileMenuOpen(false); }}>
            <LogOut size={16} /> Logout
          </button>

          {storage && (
            <div className="sidebar-storage">
              <div className="sidebar-storage-top">
                <span className="sidebar-storage-label">Storage</span>
                <span className="sidebar-storage-pct">{storage.used_percent?.toFixed(1)}% full</span>
              </div>
              <div className="sidebar-storage-bar">
                <div
                  className="sidebar-storage-fill"
                  style={{ width: `${Math.min(storage.used_percent, 100)}%` }}
                />
              </div>
              <div className="sidebar-storage-info">
                {(storage.used_bytes / (1024 ** 2)).toFixed(1)} MB of {totalGb.toFixed(0)} GB used
              </div>
              {storage.used_percent >= 40 && (
                <button
                  className="nav-btn"
                  style={{ marginTop: '10px', justifyContent: 'center', fontSize: '13px' }}
                  onClick={() => navTo('/storage-manager')}
                  title="Delete files from Trash to free space"
                >
                  Free up space
                </button>
              )}
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="app-main">
        <header className="app-topbar">
          <div className="mobile-brand-container">
            <button
              className="mobile-menu-btn"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen
                ? <X size={24} color="white" />
                : <Menu size={24} color="white" />}
            </button>
            <div className="brand mobile-brand" onClick={() => navTo('/dashboard')} style={{ cursor: 'pointer' }}>
              <div className="brand-icon"><CloudUpload size={20} color="white" /></div>
              <span>Cloud<span className="rose-text">Share</span></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto' }}>
            

            <div 
              className="user-dropdown-container"
              onClick={(e) => {
                e.stopPropagation();
                setShowProfileDropdown(!showProfileDropdown);
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="user-profile-trigger" style={{ cursor: 'pointer' }}>
                <div style={{ textAlign: 'right' }} className="user-details-text">
                  <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>{displayName}</div>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>{userEmail}</div>
                </div>
              </div>
              <div className="avatar-circle">{initials}</div>

              {showProfileDropdown && (
                <div className="profile-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                  <button className="dropdown-item" onClick={() => { setShowProfileDropdown(false); navigate('/profile'); }}>
                    <User size={14} /> My Profile
                  </button>
                  
                  <div className="dropdown-divider" />
                  <button className="dropdown-item logout-item" onClick={() => { setShowProfileDropdown(false); setShowLogoutConfirm(true); }}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>

      {/* Logout Confirm Modal */}
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