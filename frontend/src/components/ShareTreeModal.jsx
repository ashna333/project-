import React, { useEffect, useState } from 'react';
import { X, Network, Trash2, Loader2, AlertTriangle, ChevronRight } from 'lucide-react';
import { fetchPrivateShareTreeApi, revokePrivateShareApi } from '../store/fileApi';
import { useToast } from './ToastContext';
import ConfirmModal from './ConfirmModal';
import AlertModal from './AlertModal';
import useBodyScrollLock from '../hooks/useBodyScrollLock';
import '../styles/ShareModal.css';

export default function ShareTreeModal({ shareId, isOpen, onClose, onRefresh }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const { showToast } = useToast();

  useBodyScrollLock(isOpen);

  const loadTree = async () => {
    try {
      setLoading(true);
      const { data } = await fetchPrivateShareTreeApi(shareId);
      setTreeData(data);
    } catch {
      setError('Failed to load share tree.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && shareId) loadTree();
  }, [isOpen, shareId]);

  const confirmRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await revokePrivateShareApi(revokeTarget);
      showToast('Share revoked');
      loadTree();
      if (onRefresh) onRefresh();
    } catch (err) {
      setAlertModal({
        title: 'Revoke failed',
        message: err.response?.data?.error || 'Failed to revoke share.',
        variant: 'error',
      });
    } finally {
      setRevokeTarget(null);
    }
  };

  if (!isOpen) return null;

  const renderNode = (node, depth = 0, parentExpired = false, parentRevoked = false) => {
    const isExpired = parentExpired || node.is_expired ||
      (node.expires_at && new Date(node.expires_at) < new Date());
    const isRevoked = parentRevoked || node.is_revoked;
    const recipients = node.recipients.map((r) => r.recipient_name || r.recipient_email).join(', ');
    const isRoot = depth === 0;

    return (
      <div key={node.id} style={{ marginBottom: '8px' }}>
        {/* Connector line */}
        {depth > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: `${(depth - 1) * 28}px`, marginBottom: '4px' }}>
            <div style={{ width: '20px', height: '1px', background: '#3f3f46' }} />
            <ChevronRight size={12} color="#3f3f46" />
          </div>
        )}

        <div style={{ marginLeft: `${depth * 28}px` }}>
          <div style={{
            background: isRevoked ? 'rgba(127,29,29,0.15)' : isExpired ? 'rgba(120,53,15,0.15)' : '#18181b',
            border: `1px solid ${isRevoked ? '#7f1d1d' : isExpired ? '#78350f' : isRoot ? '#3f3f46' : '#27272a'}`,
            borderRadius: '8px',
            padding: '14px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                {/* Avatar circle */}
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: isRoot ? '#e11d48' : '#27272a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0,
                }}>
                  {(node.owner_name || node.owner_email || '?')[0].toUpperCase()}
                </div>
                <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>
                  {node.owner_name || node.owner_email}
                </span>
                {isRevoked && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 6px',
                    borderRadius: '4px', background: 'rgba(239,68,68,0.15)',
                    color: '#fca5a5', border: '1px solid #7f1d1d',
                  }}>Revoked</span>
                )}
                {isExpired && !isRevoked && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, padding: '2px 6px',
                    borderRadius: '4px', background: 'rgba(245,158,11,0.15)',
                    color: '#fcd34d', border: '1px solid #78350f',
                  }}>Expired</span>
                )}
              </div>
              <div style={{ fontSize: '12px', color: '#71717a', paddingLeft: '36px' }}>
                → {recipients || 'No recipients'}
              </div>
            </div>

            {!isRevoked && !isExpired && (
              <button
                type="button"
                onClick={() => setRevokeTarget(node.id)}
                title="Revoke this branch"
                style={{
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid #7f1d1d',
                  color: '#fca5a5',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={13} /> Revoke
              </button>
            )}
          </div>
        </div>

        {node.child_shares?.map((child) => renderNode(child, depth + 1, isExpired, isRevoked))}
      </div>
    );
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="share-modal-card"
          style={{ maxWidth: '580px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="modal-header" style={{ flexShrink: 0 }}>
            <div className="modal-title-row">
              <Network size={18} className="text-rose" />
              <div>
                <h3 style={{ margin: 0 }}>Share tree</h3>
                {treeData && (
                  <p style={{ margin: 0, fontSize: '12px', color: '#71717a' }}>
                    {countNodes(treeData)} node{countNodes(treeData) !== 1 ? 's' : ''} in tree
                  </p>
                )}
              </div>
            </div>
            <button type="button" className="close-x-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{
            overflowY: 'auto', padding: '16px 24px 24px',
            scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent',
          }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Loader2 className="spinner" size={24} color="#e11d48" />
              </div>
            ) : error ? (
              <div className="modal-error-alert" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={16} /> {error}
              </div>
            ) : treeData ? (
              renderNode(treeData)
            ) : null}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={!!revokeTarget}
        title="Revoke this share?"
        message="This will revoke this share and all downstream re-shares."
        confirmLabel="Revoke"
        onConfirm={confirmRevoke}
        onCancel={() => setRevokeTarget(null)}
      />

      <AlertModal
        open={!!alertModal}
        title={alertModal?.title}
        message={alertModal?.message}
        variant={alertModal?.variant}
        onClose={() => setAlertModal(null)}
      />
    </>
  );
}

// Helper to count total nodes
function countNodes(node) {
  if (!node) return 0;
  return 1 + (node.child_shares?.reduce((sum, child) => sum + countNodes(child), 0) || 0);
}