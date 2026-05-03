import React, { useEffect, useState } from 'react';
import { CloudUpload, HardDrive, Files, Share2, LogOut, Layers, KeyRound } from 'lucide-react';
import { fetchFilesApi, fetchSharesApi } from '../api/fileApi';
import StatsGrid from '../components/StatsGrid'; // 1. Import your new component
import '../styles/DashboardPage.css';

export default function DashboardOverviewPage() {
  const [totalFiles, setTotalFiles] = useState(0);
  const [totalShares, setTotalShares] = useState(0);
  const [storage, setStorage] = useState({ used_percent: 0, used_bytes: 0, max_bytes: 0 });

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
      <header className="main-header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon"><CloudUpload size={20} color="white" /></div>
            <span>Cloud<span className="rose-text">Share</span></span>
          </div>
          
          <nav className="nav-links">
            <button className="nav-btn"><Layers size={18} /> Dashboard</button>
            <a className="nav-btn"><Files size={18} /> My Files</a>
            <button className="nav-btn"><CloudUpload size={18} /> Upload</button>
            <button className="nav-btn"><Share2 size={18} /> Shared</button>
            <button className="nav-btn"><KeyRound size={18} /> Password</button>
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>aa aa</div>
              <div style={{ fontSize: '11px', color: '#71717a' }}>aaa@gmail.com</div>
            </div>
            <LogOut size={18} color="#71717a" cursor="pointer" />
          </div>
        </div>
      </header>

      <main className="dashboard-main fade-in">
        <div className="welcome-section">
          <div className="welcome-label">Welcome back</div>
          <h1 className="welcome-title">Hello, <span className="rose-text">aa</span>.</h1>
          <p style={{ color: '#a1a1aa', marginTop: '10px' }}>Your encrypted file vault is ready. Upload, share, and track every link.</p>
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
            <button className="upload-btn"><CloudUpload size={18} /> Upload files</button>
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