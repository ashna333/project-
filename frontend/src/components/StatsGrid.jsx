import React from 'react';
import { Link } from 'react-router-dom';
import { Files, Share2, CloudUpload } from 'lucide-react';

/* Reusable Card Component */
function StatCard({ icon: Icon, label, value, href = '#', isPrimary = false }) {
  return (
    <Link to={href} className="stat-card">
      <div className="stat-header">
        <div className={isPrimary ? 'brand-icon' : 'icon-box'}>
          <Icon size={20} color={isPrimary ? '#ffffff' : '#e11d48'} />
        </div>
        <span className="stat-arrow">→</span>
      </div>
      <div style={{ marginTop: '20px' }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </Link>
  );
}

/* Main Grid Component */
export default function StatsGrid({ totalFiles, totalShares }) {
  const stats = [
    {
      id: 'files',
      icon: Files,
      label: 'Files Stored',
      value: totalFiles,
      href: '/files',
    },
    {
      id: 'shares',
      icon: Share2,
      label: 'Active Shares',
      value: totalShares,
      href: '/shares',
    },
    {
      id: 'upload',
      icon: CloudUpload,
      label: 'Upload Something',
      value: 'Start',
      href: '/upload',
      isPrimary: true,
    },
  ];

  return (
    <section className="stats-grid">
      {stats.map((item) => (
        <StatCard key={item.id} {...item} />
      ))}
    </section>
  );
}