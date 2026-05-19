import useBodyScrollLock from '../hooks/useBodyScrollLock';

export default function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
  loading = false,
}) {
  useBodyScrollLock(open);

  if (!open) return null;

  return (
    <div className="modal-overlaydelete" style={{ zIndex: 10000 }} onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="modal-title">{title}</h3>
        <p className="modal-subtitle">{message}</p>
        <div className="modal-actions">
          <button type="button" className="btn-cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={variant === 'danger' ? 'btn-revoke' : 'save-profile-btn'}
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
