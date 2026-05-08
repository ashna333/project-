import React, { useState , useEffect} from 'react';
import { Share2, X, Loader2 } from 'lucide-react';
import { createShareApi } from '../store/fileApi';
import '../styles/ShareModal.css';

export default function ShareModal({ file, isOpen, onClose, onRefresh }) {
  // Matches the state structure from your FileSharingPage
  const [formData, setFormData] = useState({
    recipient_email: '',
    expires_in_hours: 24,
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Backend expects: file_id, recipient_email, expires_in_hours, message
      await createShareApi({
        file_id: file.id,
        recipient_email: formData.recipient_email,
        expires_in_hours: Number(formData.expires_in_hours),
        message: formData.message,
      });

      // Handle successful share
      if (onRefresh) onRefresh(); // Triggers re-fetch in My Files if needed
      onClose(); // Closes the modal
      
      // Optional: Reset form for next time
      setFormData({ recipient_email: '', expires_in_hours: 24, message: '' });
      
    } catch (err) {
      // Catch backend errors (e.g., "invalid email", "file not found")
      const errorMessage = err.response?.data?.error || 'Failed to create share.';
      setError(errorMessage);
    } finally {
       
      setLoading(false);
    }
  };



  const resetForm = () => {
  setFormData({
    recipient_email: '',
    expires_in_hours: 24,
    message: ''
  });
  setError('');
  };


  return (
    <div className="modal-overlay"  onClick={() => {
    resetForm();
    onClose();
  }}>
      <div className="share-modal-card fade-in"  onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <Share2 size={18} className="text-rose" />
            <h3>Share file</h3>
          </div>
          <button className="close-x-btn"  onClick={() => {
                        resetForm();
                        onClose();
                    }} 
            aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        
        <p className="modal-subtitle">{file?.original_name}</p>

        {error && <div className="modal-error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <label>Recipient email</label>
            <input 
              type="email" 
              required
              spellCheck="false"
              className="modal-input accent-border" 
              placeholder="email@example.com"
              value={formData.recipient_email}
              onChange={(e) => setFormData({...formData, recipient_email: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label>Expiration (hours)</label>
            <input 
              type="number" 
              min="1"
              max="720"
              className="modal-input" 
              value={formData.expires_in_hours}
              onChange={(e) => setFormData({...formData, expires_in_hours: e.target.value})}
            />
          </div>

          <div className="input-group">
            <label>Message (optional)</label>
            <textarea 
              className="modal-textarea"
              placeholder="Note included in the email..."
              value={formData.message}
              onChange={(e) => setFormData({...formData, message: e.target.value})}
            ></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="cancel-btn"  onClick={() => {
                resetForm();
                onClose();
            }} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="share-submit-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="spinner" />
                  Sharing...
                </>
              ) : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}