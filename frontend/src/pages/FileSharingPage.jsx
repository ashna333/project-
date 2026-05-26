import { useEffect, useState } from 'react';
import { Check, Copy, Trash2, Mail, XCircle } from "lucide-react";
import { useToast } from '../components/ToastContext';
import { fetchSharesApi, deleteShareApi } from '../store/fileApi';
import '../styles/FileSharingPage.css';
import Pagination from '../components/Pagination';
import useBodyScrollLock from '../hooks/useBodyScrollLock';


export default function FileSharingPage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [filter, setFilter] = useState('');
  const { showToast } = useToast();

  useBodyScrollLock(!!revokeTarget);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 9;

  const loadShares = async (page = 1, currentFilter) => {
      const activeFilter = currentFilter ?? filter;
     console.log('Loading with filter:', activeFilter, 'page:', page);
    setLoading(true);
    try {
      const { data } = await fetchSharesApi(page, pageSize, currentFilter ?? filter);

      setShares(data.results?.shares || []);

      const totalCount = data.count || 0;
      setTotalPages(Math.ceil(totalCount / pageSize) || 1);
      setCurrentPage(page);

    } catch (e) {
      showToast("Failed to load shares");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    loadShares(newPage, filter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reload from page 1 whenever filter changes
  useEffect(() => {
    setCurrentPage(1);
    loadShares(1, filter);
  }, [filter]);

  const copyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      showToast("Link copied");
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;

    try {
      await deleteShareApi(revokeTarget.id);
      showToast("Share revoked");

      setShares((prevShares) =>
        prevShares.map((share) =>
          share.id === revokeTarget.id
            ? { ...share, is_revoked: true }
            : share
        )
      );

      setRevokeTarget(null);
    } catch (e) {
      showToast("Failed to revoke share");
    }
  };

  return (
    <div className="outbox-container">
      {/* Header */}
      <header className="outbox-header">
        <div className="outbox-overline">Shared files</div>
        <h1 className="outbox-title">Outbox</h1>
        <p className="outbox-subtitle">All files you've shared, with real-time access tracking.</p>
      </header>

      {/* Filter Buttons */}
      <div className="outbox-filters">
        {['active', 'revoked', 'expired'].map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter((prevFilter) => (prevFilter === f ? '' : f))}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Table Card */}
      <div className="outbox-card">
        {loading ? (
          <div className="outbox-state">Loading shares...</div>
        ) : shares.length === 0 ? (
          <div className="outbox-empty">
            <Mail className="empty-icon" />
            <div className="empty-title">No {filter ? `${filter} ` : ''}shares</div>
            <p className="empty-text">
              {filter === 'active'
                ? 'Share a file from "My Files" to see it listed here.'
                : filter
                ? `You have no ${filter} shares.`
                : 'You have no shared files.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="outbox-table">
              <thead>
                <tr>
                  <th>File</th>
                  <th>Recipient</th>
                  <th>Shared on</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((share) => (
                  <tr key={share.id}>
                    <td className="font-medium">{share.file_name}</td>
                    <td className="text-muted">{share.recipient_email}</td>
                    <td className="text-muted text-sm">
                      {new Date(share.share_date).toLocaleString()}
                    </td>
                    <td>
                      {share.is_revoked ? (
                        <span className="badge badge-revoked">
                          <XCircle size={12} /> Revoked
                        </span>
                      ) : share.is_expired ? (
                        <span className="badge badge-expired">Expired</span>
                      ) : share.is_accessed ? (
                        <span className="badge badge-accessed">
                          <Check size={12} /> Accessed
                        </span>
                      ) : (
                        <span className="badge badge-pending">Pending</span>
                      )}
                    </td>
                    <td className="text-right">
                      <div className="action-group">
                        {/* Copy: only for non-dead shares */}
                        {!share.is_revoked && !share.is_expired && (
                          <button
                            className="icon-btn"
                            onClick={() => copyLink(share.share_url)}
                            title="Copy Link"
                          >
                            <Copy size={16} />
                          </button>
                        )}

                        {/* Revoke: only for active shares */}
                        {!share.is_revoked && !share.is_expired && (
                          <button
                            className="icon-btn btn-danger"
                            onClick={() => setRevokeTarget(share)}
                            title="Revoke access"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        loading={loading}
      />

      {/* Revoke Confirmation Modal */}
      {revokeTarget && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Revoke share?</h3>
            <p>The link will stop working immediately. This can't be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setRevokeTarget(null)}>Cancel</button>
              <button className="btn-danger-filled" onClick={handleRevoke}>Revoke</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}