import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CloudUpload, HardDrive, Files, Share2, LogOut, Layers, KeyRound, User } from 'lucide-react';
import { fetchFilesApi, fetchSharesApi } from '../store/fileApi';
import StatsGrid from '../components/StatsGrid'; // 1. Import your new component
import '../styles/DashboardPage.css';
import useAuthStore from '../store/authStore'

export default function DashboardOverviewPage() {
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const [storage, setStorage] = useState({ used_percent: 0, used_bytes: 0, max_bytes: 0 });
  const user = JSON.parse(localStorage.getItem('auth_user')) || { first_name: 'User' };
  useEffect(() => {
    fetchFilesApi(1, 6, '').then(({ data }) => {
      setTotalFiles(data.count || 0);
      setStorage(data.results?.storage || { used_percent: 0, used_bytes: 0, max_bytes: 0 });
    });
    fetchSharesApi(1, 6, '').then(({ data }) => {
      setTotalShares(data.count || 0);
    });
  }, []);

  return (
    <div className="dashboard-container">
     

      <main className="dashboard-main fade-in">
       <div className="welcome-section">
  <div className="welcome-label">Welcome back</div>
  {/* Changed User.first_name to user.first_name */}
  <h1 className="welcome-title">
    Hello, <span className="rose-text">{user?.first_name || 'User'}</span>.
  </h1>
  <p style={{ color: '#a1a1aa', marginTop: '10px' }}>
    Your encrypted file vault is ready. Upload, share, and track every link.
  </p>
</div>

        <section className="storage-card">
          <div className="storage-header">
            <div className="storage-info">
              <div className="icon-box"><HardDrive size={20} className="rose-text" /></div>
              <div>
                <div style={{ fontSize: '11px', color: '#71717a', textTransform: 'uppercase' }}>Storage Used</div>
                <div style={{ fontSize: '24px', fontWeight: '700' }}>
                  {(storage.used_bytes / (1024 ** 2)).toFixed(1)} MB / 1.00 GB
                </div>
              </div>
            </div>
         
          <Link to="/upload" className="upload-btn">
            <CloudUpload size={18} />
            Upload files
          </Link>
          </div>
          
          <div className="progress-container">
            <div className="progress-fill" style={{ width: `${storage.used_percent}%` }}></div>
          </div>
          <div style={{ fontSize: '11px', color: '#71717a' }}>
            {storage.used_percent.toFixed(1)}% used · Max 100 MB per file
          </div>
        </section>

        {/* COMPONENT IS CALLED */}
        <StatsGrid 
          totalFiles={totalFiles} 
          totalShares={totalShares} 
        />
      </main>
    </div>
  );
}