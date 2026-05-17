import React, { useEffect, useState } from 'react';
import { Shield, Ban, BarChart2, Users } from 'lucide-react';
import {
  fetchPrivateSharesOwnedApi,
  revokePrivateShareApi,
  fetchPrivateShareAuditApi,
} from '../store/fileApi';
import '../styles/PrivateSharePages.css';

export default function PrivateSharesByMePage() {
  const [shares, setShares] = useState([]);
  const [filter, setFilter] = useState('active');
  const [loading, setLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await fetchPrivateSharesOwnedApi(1, filter);
      const list = data.results?.shares ?? data.shares ?? (Array.isArray(data.results) ? data.results : []);
      setShares(list);
    } catch {
      setShares([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const revoke = async (id) => {
    if (!window.confirm('Revoke this private share for all recipients?')) return;
    await revokePrivateShareApi(id);
    load();
  };

  const viewAudit = async (id) => {
    const { data } = await fetchPrivateShareAuditApi(id);
    setAuditLogs({ id, logs: data });
  };

  return (
    <div className="private-share-page fade-in">
      <div className="ps-header">
        <Shield size={28} className="rose-text" />
        <div>
          <h1>Shared By Me</h1>
          <p>Private shares you created — analytics & revocation</p>
        </div>
      </div>

      <div className="ps-filters">
        {['active', 'expired', 'revoked'].map((f) => (
          <button key={f} type="button" className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="ps-muted">Loading...</p>
      ) : shares.length === 0 ? (
        <div className="ps-empty">No {filter} private shares.</div>
      ) : (
        <div className="ps-cards">
          {shares.map((s) => (
            <div key={s.id} className="ps-card">
              <div className="ps-card-top">
                <h3>{s.file_name}</h3>
                <span className={`status-pill ${s.is_revoked ? 'inactive' : s.is_expired ? 'inactive' : 'active'}`}>
                  {s.is_revoked ? 'Revoked' : s.is_expired ? 'Expired' : 'Active'}
                </span>
              </div>
              {s.analytics && (
                <div className="ps-analytics">
                  <span><Users size={14} /> {s.analytics.unique_viewers} viewers</span>
                  <span><BarChart2 size={14} /> {s.analytics.total_downloads} downloads</span>
                  {s.analytics.last_accessed && <span>Last: {new Date(s.analytics.last_accessed).toLocaleString()}</span>}
                </div>
              )}
              <div className="recipients-list">
                {s.recipients?.map((r) => (
                  <span key={r.id} className="recipient-chip">{r.recipient_email}</span>
                ))}
              </div>
              <div className="ps-card-actions">
                <button type="button" className="ps-btn-text" onClick={() => viewAudit(s.id)}>Audit log</button>
                {!s.is_revoked && (
                  <button type="button" className="ps-btn-revoke" onClick={() => revoke(s.id)}>
                    <Ban size={14} /> Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {auditLogs && (
        <div className="modal-overlay" onClick={() => setAuditLogs(null)}>
          <div className="ps-audit-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Audit log (permanent)</h3>
            <div className="audit-list">
              {auditLogs.logs.map((log) => (
                <div key={log.id} className="audit-row">
                  <span className="audit-action">{log.action}</span>
                  <span>{log.actor_email || '—'}</span>
                  <span className="ps-muted">{new Date(log.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
