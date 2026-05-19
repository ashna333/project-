import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function AlertModal({
  open,
  title,
  message,
  buttonLabel = 'OK',
  variant = 'info',
  onClose,
}) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div className="modal-overlaydelete" style={{ zIndex: 10000 }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-subtitle" style={{ whiteSpace: 'pre-wrap' }}>{message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className={variant === 'error' ? 'btn-revoke' : 'save-profile-btn'}
            onClick={onClose}
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
