import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { 
  CloudUpload, HardDrive, Files, Share2, LogOut, 
  Layers, KeyRound, Search, File 
} from 'lucide-react';
import { fetchFiles } from '../store/fileThunks';
import { setSearchQuery } from '../store/fileSlice';
import '../styles/DashboardPage.css'; // Reusing your shared dashboard styles

export default function FileManagerPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { files, pagination, loading, searchQuery } = useSelector((s) => s.files);
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Get user from storage for the header
  const user = JSON.parse(localStorage.getItem('user')) || { first_name: 'dd', last_name: 'sssss', email: 'test@example.com' };

  useEffect(() => {
    dispatch(fetchFiles(pagination.currentPage, pagination.pageSize, searchQuery));
  }, [dispatch, pagination.currentPage, pagination.pageSize, searchQuery]);

  // Debounced search logic
  useEffect(() => {
    const t = setTimeout(() => dispatch(setSearchQuery(searchInput.trim())), 300);
    return () => clearTimeout(t);
  }, [dispatch, searchInput]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="dashboard-container">
      {/* --- HEADER SECTION --- */}
      <header className="main-header">
        <div className="header-content">
          <div className="brand" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <div className="brand-icon"><CloudUpload size={20} color="white" /></div>
            <span>Cloud<span className="rose-text">Share</span></span>
          </div>
          
          <nav className="nav-links">
            <button className="nav-btn" onClick={() => navigate('/dashboard')}><Layers size={18} /> Dashboard</button>
            <button className="nav-btn active" onClick={() => navigate('/files')}><Files size={18} /> My Files</button>
            <button className="nav-btn" onClick={() => navigate('/upload')}><CloudUpload size={18} /> Upload</button>
            <button className="nav-btn" onClick={() => navigate('/shared')}><Share2 size={18} /> Shared</button>
            <button className="nav-btn" onClick={() => navigate('/settings')}><KeyRound size={18} /> Password</button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'white' }}>{user.first_name} {user.last_name}</div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>{user.email}</div>
            </div>
            <LogOut size={18} color="#71717a" cursor="pointer" onClick={handleLogout} />
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="dashboard-main fade-in">
        <div className="file-manager-header">
          <div className="welcome-section">
            <div className="welcome-label" style={{ textTransform: 'uppercase', letterSpacing: '2px' }}>Library</div>
            <h1 className="welcome-title" style={{ fontSize: '42px', marginBottom: '5px' }}>My Files</h1>
            <p style={{ color: '#71717a' }}>{pagination.count || 0} files · Managed by you</p>
          </div>

          {/* Search Bar matching the screenshot */}
          <div className="search-container">
            <Search size={18} className="search-icon" color="#71717a" />
            <input 
              type="text" 
              placeholder="Search files..." 
              className="fm-search-input"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {/* --- FILE AREA --- */}
        <section className="file-display-card">
          {loading ? (
            <div className="fm-empty-state">
              <div className="fm-spinner"></div>
              <p>Loading your library...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="fm-empty-state">
              <File size={60} color="#27272a" strokeWidth={1} />
              <h2 style={{ marginTop: '20px', color: 'white' }}>No files yet</h2>
              <p style={{ color: '#71717a' }}>Upload your first file to get started.</p>
            </div>
          ) : (
            <div className="file-grid-layout">
              {/* This is where your existing GridView or ListView logic goes */}
              {/* For now, just rendering a placeholder for your existing map */}
              {files.map(file => (
                <div key={file.id} className="file-item-minimal">
                   {/* Your file item UI */}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Footer Text from Screenshot */}
        <footer className="fm-footer">
            CloudShare - Secure file sharing, built for teams.
        </footer>
      </main>
    </div>
  );
}