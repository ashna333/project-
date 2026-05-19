import React, { useEffect, useState } from 'react';
import { X, Network, Trash2, Loader2, AlertTriangle } from 'lucide-react';
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
    if (isOpen && shareId) {
      loadTree();
    }
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

  const renderNode = (node, depth = 0) => {
    const recipients = node.recipients.map((r) => r.recipient_name || r.recipient_email).join(', ');

    return (
      <div
        key={node.id}
        style={{
          marginLeft: `${depth * 24}px`,
          borderLeft: depth > 0 ? '2px solid #3f3f46' : 'none',
          paddingLeft: depth > 0 ? '16px' : '0',
          marginBottom: '12px',
        }}
      >
        <div
          className="tree-node-card"
          style={{
            background: '#18181b',
            padding: '16px',
            borderRadius: '8px',
            border: '1px solid #27272a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 600, color: '#fff' }}>
              {node.owner_name || node.owner_email}
            </div>
            <div style={{ fontSize: '12px', color: '#71717a', marginTop: '4px' }}>
              To: {recipients || 'No recipients'}
            </div>
            {node.is_revoked && (
              <span style={{ fontSize: '11px', color: '#f87171' }}>Revoked</span>
            )}
          </div>
          {!node.is_revoked && (
            <button
              type="button"
              className="icon-btn btn-danger"
              onClick={() => setRevokeTarget(node.id)}
              title="Revoke branch"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        {node.child_shares?.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="share-modal-card" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title-row">
              <Network size={18} className="text-rose" />
              <h3>Share tree</h3>
            </div>
            <button type="button" className="close-x-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <div className="ps-modal-body">
            {loading ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Loader2 className="spinner" size={24} />
              </div>
            ) : error ? (
              <div className="modal-error-alert">
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
