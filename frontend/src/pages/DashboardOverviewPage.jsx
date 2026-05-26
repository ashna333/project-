import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CloudUpload, HardDrive, FileText,
  Share2, ChevronRight, Clock, ExternalLink, Inbox, ClockAlert,
} from 'lucide-react';
import { fetchFilesApi, fetchSharesApi, fetchExpiringSoonApi, fetchPrivateSharesInboxApi } from '../store/fileApi';
import StatsGrid from '../components/StatsGrid';  // ✅ import instead
import '../styles/DashboardPage.css';

export default function DashboardOverviewPage() {
  const [totalFiles, setTotalFiles]     = useState(0);
  const [totalShares, setTotalShares]   = useState(0);
  const [sharedWithMe, setSharedWithMe] = useState(0);
  const [expiringSoon, setExpiringSoon] = useState(0);
  const [recentFiles, setRecentFiles]   = useState([]);
  const [recentShares, setRecentShares] = useState([]);
  const [storage, setStorage]           = useState({ used_percent: 0, used_bytes: 0, max_bytes: 0 });

  const user = JSON.parse(localStorage.getItem('auth_user')) || { first_name: 'User' };

  useEffect(() => {
    fetchFilesApi(1, 5, '').then(({ data }) => {
      setTotalFiles(data.count || 0);
      setRecentFiles(data.results?.files || []);
      setStorage(data.results?.storage || { used_percent: 0, used_bytes: 0, max_bytes: 0 });
    });

    fetchSharesApi(1, 5, '').then(({ data }) => {
      setTotalShares(data.count || 0);
      setRecentShares(data.results?.shares || []);
    });

    fetchExpiringSoonApi().then(({ data }) => {
      setExpiringSoon(data.count || 0);
    });

    fetchPrivateSharesInboxApi(1, 9).then(({ data }) => {
      setSharedWithMe(data.count || 0);
    });
  }, []);

  return (
    <main className="dashboard-main fade-in">
      <div className="welcome-section">
        <div className="welcome-label">Welcome back</div>
        <h1 className="welcome-title">
          Hello, <span className="rose-text">{user?.first_name || 'User'}</span>.
        </h1>
        <p style={{ color: '#a1a1aa', marginTop: '10px' }}>
          Upload, share, and track every link.
        </p>
      </div>

      <section className="storage-card">
        <div className="storage-header">
          <div className="storage-info">
            <div className="icon-box">
              <HardDrive size={20} className="rose-text" />
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>
                Storage Used
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>
                {(storage.used_bytes / 1024 ** 2).toFixed(1)} MB / 1.00 GB
              </div>
            </div>
          </div>
          <Link to="/upload" className="upload-btn">
            <CloudUpload size={18} /> Upload files
          </Link>
        </div>
        <div className="progress-container">
          <div className="progress-fill" style={{ width: `${storage.used_percent}%` }} />
        </div>
        <div style={{ fontSize: '11px', color: '#71717a' }}>
          {storage.used_percent.toFixed(1)}% used · Max 100 MB per file
        </div>
      </section>

      {/* ✅ uses the imported StatsGrid — no local duplicate */}
      <StatsGrid
        totalFiles={totalFiles}
        totalShares={totalShares}
        sharedWithMe={sharedWithMe}
        expiringSoon={expiringSoon}
      />

      <div className="recent-grid">
        <div className="recent-card">
          <div className="recent-header">
            <h3 className="recent-title">
              <FileText size={18} className="rose-text" /> Recent Files
            </h3>
            <Link to="/files" className="view-all">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="recent-list">
            {recentFiles.length > 0 ? (
              recentFiles.map((file) => (
                <div key={file.id} className="recent-item">
                  <div className="item-info">
                    <span className="item-name">{file.original_name}</span>
                    <span className="item-meta">{file.file_size_display}</span>
                  </div>
                  <Clock size={14} color="#3f3f46" />
                </div>
              ))
            ) : (
              <div className="empty-recent">No files uploaded yet.</div>
            )}
          </div>
        </div>

        <div className="recent-card">
          <div className="recent-header">
            <h3 className="recent-title">
              <Share2 size={18} className="rose-text" /> Recent Shares
            </h3>
            <Link to="/shared" className="view-all">
              View All <ChevronRight size={14} />
            </Link>
          </div>
          <div className="recent-list">
            {recentShares.length > 0 ? (
              recentShares.map((share) => (
                <div key={share.id} className="recent-item">
                  <div className="item-info">
                    <span className="item-name">{share.file_name || 'Shared Link'}</span>
                    <span className="item-meta">{share.clicks} clicks</span>
                  </div>
                  <ExternalLink size={14} color="#3f3f46" />
                </div>
              ))
            ) : (
              <div className="empty-recent">No active shares found.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}