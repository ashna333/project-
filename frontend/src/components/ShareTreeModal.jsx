import React, { useEffect, useState } from 'react';
import { X, Network, Trash2, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchPrivateShareTreeApi, revokePrivateShareApi } from '../store/fileApi';
import '../styles/ShareModal.css';

export default function ShareTreeModal({ shareId, isOpen, onClose, onRefresh }) {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTree = async () => {
    try {
      setLoading(true);
      const { data } = await fetchPrivateShareTreeApi(shareId);
      setTreeData(data);
    } catch (err) {
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

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this share and all its descendants?')) return;
    try {
      await revokePrivateShareApi(id);
      loadTree();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Failed to revoke share.');
    }
  };

  if (!isOpen) return null;

  const renderNode = (node, depth = 0) => {
    const isRevoked = node.is_revoked;
    const recipients = node.recipients.map(r => r.recipient_name || r.recipient_email).join(', ');
    
    return (
      <div key={node.id} style={{ marginLeft: `${depth * 24}px`, borderLeft: depth > 0 ? '2px solid #3f3f46' : 'none', paddingLeft: depth > 0 ? '16px' : '0', marginBottom: '12px' }}>
        <div className="tree-node-card" style={{ background: '#18181b', padding: '16px', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <strong style={{ color: '#fff' }}>{node.owner_name || node.owner_email}</strong>
              <span style={{ fontSize: '13px', color: '#71717a' }}>shared with</span>
              <strong style={{ color: '#fbbf24' }}>{recipients}</strong>
            </div>
            <div style={{ fontSize: '13px', color: '#71717a', marginTop: '8px', display: 'flex', gap: '16px', alignItems: 'center' }}>
              {isRevoked ? (
                <span className="text-rose" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14}/> Revoked</span>
              ) : (
                <span style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><ShieldCheck size={14}/> Active</span>
              )}
              {node.expires_at && <span>Expires: {new Date(node.expires_at).toLocaleDateString()}</span>}
            </div>
          </div>
          {!isRevoked && (
            <button onClick={() => handleRevoke(node.id)} className="icon-action-btn hover-rose" title="Revoke this chain">
              <Trash2 size={18} />
            </button>
          )}
        </div>
        {node.child_shares && node.child_shares.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            {node.child_shares.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-modal-card" style={{ maxWidth: '800px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Network size={20} className="text-rose" />
            <h3 style={{ margin: 0 }}>Share Tree</h3>
          </div>
          <button type="button" className="close-x-btn" onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="ps-modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Loader2 className="spinner" size={32} /></div>
          ) : error ? (
            <div className="modal-error-alert">{error}</div>
          ) : treeData ? (
            <div className="tree-container">
              {renderNode(treeData)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
