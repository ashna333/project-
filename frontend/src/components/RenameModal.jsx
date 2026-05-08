import React, { useState, useEffect } from 'react';
import { Edit3, X, Loader2 } from 'lucide-react';
import { renameFileApi } from '../store/fileApi';
import '../styles/ShareModal.css';

export default function RenameModal({ file, isOpen, onClose, onRefresh }) {
  const [baseName, setBaseName] = useState(''); // Just the name
  const [extension, setExtension] = useState(''); // Just the .ext
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (file && isOpen) {
      const fullName = file.original_name || '';
      // Find the last dot to separate extension
      const lastDotIndex = fullName.lastIndexOf('.');
      
      if (lastDotIndex !== -1) {
        setBaseName(fullName.substring(0, lastDotIndex));
        setExtension(fullName.substring(lastDotIndex)); // e.g., ".pdf"
      } else {
        setBaseName(fullName);
        setExtension('');
      }
      setError('');
    }
  }, [file, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Combine baseName + extension
    const finalName = baseName.trim() + extension;

    if (!baseName.trim() || finalName === file.original_name) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      await renameFileApi(file.id, finalName);
      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to rename file.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    // Change: Use onMouseDown instead of onClick for overlay to prevent selection-drags from closing it
    <div className="modal-overlay" onMouseDown={onClose}>
      <div 
        className="share-modal-card fade-in" 
        onMouseDown={(e) => e.stopPropagation()} // Stop propagation here
      >
        <div className="modal-header">
          <div className="modal-title-row">
            <Edit3 size={18} className="text-rose" />
            <h3>Rename File</h3>
          </div>
          <button className="close-x-btn" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </div>

        {error && <div className="modal-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <label>New Name</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type="text" 
                required
                className="modal-input accent-border" 
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                autoFocus
                style={{ paddingRight: `${extension.length * 9 + 15}px` }} // Dynamic padding for extension hint
              />
              {extension && (
                <span style={{ 
                  position: 'absolute', 
                  right: '12px', 
                  color: '#71717a', 
                  pointerEvents: 'none',
                  fontSize: '0.9em' 
                }}>
                  {extension}
                </span>
              )}
            </div>
            
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="share-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Updating...
                </>
              ) : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}