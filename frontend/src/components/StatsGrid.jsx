import React from 'react';
import { Link } from 'react-router-dom';
import { Files, Share2, Inbox, ClockAlert } from 'lucide-react';

function StatCard({ icon: Icon, label, value, href = '#', badge }) {
  return (
    <Link to={href} className="stat-card">
      <div className="stat-header">
        <div className="icon-box">
          <Icon size={20} color="#e11d48" />
        </div>
        {badge
          ? <span className="stat-badge">{badge}</span>
          : <span className="stat-arrow">→</span>
        }
      </div>
      <div style={{ marginTop: '18px' }}>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    </Link>
  );
}

export default function StatsGrid({ totalFiles, totalShares, sharedWithMe, expiringSoon }) {
  const stats = [
    {
      id: 'files',
      icon: Files,
      label: 'Files stored',
      value: totalFiles,
      href: '/files',
    },
    {
      id: 'shares',
      icon: Share2,
      label: 'Active shares',
      value: totalShares,
      href: '/shared',
    },
    {
      id: 'shared-with-me',
      icon: Inbox,
      label: 'Shared with me',
      value: sharedWithMe,
      href: '/shared-with-me',
    },
    {
      id: 'expiring',
      icon: ClockAlert,
      label: 'Expiring soon',
      value: expiringSoon,
      href: '/expiring-soon',
      badge: '24h',
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