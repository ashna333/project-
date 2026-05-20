import { useEffect, useState } from 'react';
import { Check, Copy, Trash2, Mail,XCircle } from "lucide-react";
import { useToast } from '../components/ToastContext';
import { fetchSharesApi ,deleteShareApi} from '../store/fileApi';
import '../styles/FileSharingPage.css'; 
import Pagination from '../components/Pagination';
import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function FileSharingPage() {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const { showToast } = useToast();

  useBodyScrollLock(!!revokeTarget);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 9; 

  const loadShares = async (page = 1) => {
    setLoading(true);
    try {
      // Pass page and pageSize to the API
      const { data } = await fetchSharesApi(page, pageSize, '');
      
      setShares(data.results?.shares || []);
      
      // Calculate total pages from the total count provided by Django
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
    loadShares(newPage);
  };

  useEffect(() => {
    loadShares();
  }, []);

  
const copyLink = async (url) => {
  try {
    await navigator.clipboard.writeText(url);
    // You can use a toast notification here
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
    
    // Instead of filtering, update the specific share's status
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

      {/* Table Card */}
      <div className="outbox-card">
        {loading ? (
          <div className="outbox-state">Loading shares...</div>
        ) : shares.length === 0 ? (
          <div className="outbox-empty">
            <Mail className="empty-icon" />
            <div className="empty-title">No shares yet</div>
            <p className="empty-text">Share a file from "My Files" to see it listed here.</p>
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
                        {/* Copy: Valid for anything not dead */}
                        {!share.is_revoked && !share.is_expired && (
                          <button 
                            className="icon-btn" 
                            onClick={() => copyLink(share.share_url)}
                            title="Copy Link"
                          >
                            <Copy size={16} />
                          </button>
                        )}

                        {/* Revoke: ONLY for Pending (Not accessed, revoked, or expired) */}
                        {!share.is_revoked && !share.is_expired  && (
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

      {/* Manual Modal (Replacing AlertDialog) */}
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