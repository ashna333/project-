import React, { useState } from 'react';
import { Share2, X, Loader2, UserPlus, Shield, Link } from 'lucide-react';
import { createShareApi } from '../store/fileApi';
import PrivateShareModal from './PrivateShareModal';
import '../styles/ShareModal.css';

export default function ShareModal({ file, isOpen, onClose, onRefresh }) {
  const [mode, setMode] = useState('public'); // public | private
  const [emails, setEmails] = useState([]); // Array of chips
  const [inputValue, setInputValue] = useState(''); // Current typing text
  const [formData, setFormData] = useState({
    expires_in_hours: 24,
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  if (mode === 'private') {
    return (
      <PrivateShareModal
        file={file}
        isOpen={isOpen}
        onClose={() => { setMode('public'); onClose(); }}
        onSuccess={onRefresh}
      />
    );
  }

  // --- Chip Logic ---
  const handleKeyDown = (e) => {
    if (['Enter', 'Tab', ','].includes(e.key)) {
      e.preventDefault();
      addEmail(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails.length - 1);
    }
  };

  const addEmail = (val) => {
    const email = val.trim().replace(/,$/, ''); // Remove trailing comma
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { // Basic regex check
      if (!emails.includes(email)) {
        setEmails([...emails, email]);
      }
      setInputValue('');
      setError('');
    } else if (email) {
      setError('Invalid email format');
    }
  };

  const removeEmail = (index) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Add any remaining text as an email before submitting
    if (inputValue) addEmail(inputValue);

    if (emails.length === 0) {
      setError("Please add at least one recipient.");
      return;
    }

    setLoading(true);
    try {
      const sharePromises = emails.map(email => 
        createShareApi({
          file_id: file.id,
          recipient_email: email,
          expires_in_hours: Number(formData.expires_in_hours),
          message: formData.message,
        })
      );

      await Promise.all(sharePromises);
      if (onRefresh) onRefresh();
      handleClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to share.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmails([]);
    setInputValue('');
    setFormData({ expires_in_hours: 24, message: '' });
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="share-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <UserPlus size={18} className="text-rose" />
            <h3>Share with people</h3>
          </div>
          <button className="close-x-btn" onClick={handleClose}><X size={20} /></button>
        </div>
        
        <div className="share-mode-tabs">
          <button type="button" className="share-mode-tab active" disabled>
            <Link size={14} /> Public link
          </button>
          <button type="button" className="share-mode-tab" onClick={() => setMode('private')}>
            <Shield size={14} /> Private share
          </button>
        </div>
        <p className="modal-subtitle">Sharing: <strong>{file?.original_name}</strong></p>

        {error && <div className="modal-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <label>Recipients</label>
            {/* --- Gmail Style Chip Container --- */}
            <div className="email-chips-container">
              {emails.map((email, index) => (
                <div key={index} className="email-chip">
                  <span>{email}</span>
                  <X size={14} onClick={() => removeEmail(index)} className="remove-chip-icon" />
                </div>
              ))}
              <input 
                autoFocus
                className="chip-input"
                placeholder={emails.length === 0 ? "Add email..." : ""}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => addEmail(inputValue)}
              />
            </div>
          </div>

          <div className="input-row" style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Expires in (hours)</label>
              <input 
                type="number" 
                className="modal-input" 
                value={formData.expires_in_hours}
                onChange={(e) => setFormData({...formData, expires_in_hours: e.target.value})}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '15px' }}>
            <label>Message</label>
            <textarea 
              className="modal-textarea"
              placeholder="Add a message..."
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
            ></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={handleClose}>Cancel</button>
            <button type="submit" className="share-submit-btn" disabled={loading}>
              {loading ? <><Loader2 size={16} className="spinner" /> Sending...</> : `Share (${emails.length})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}