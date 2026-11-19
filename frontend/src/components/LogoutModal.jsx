import { useEffect, useRef } from 'react';
import '../css/LogoutModal.css';

function LogoutModal({ isOpen, onConfirm, onCancel, loading = false }) {
  const cancelBtnRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button on open for easy keyboard accessibility
    cancelBtnRef.current?.focus();

    // Prevent body background scrolling when modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key to cancel
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onCancel, loading]);

  if (!isOpen) return null;

  return (
    <div
      className="logout-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
      role="presentation"
    >
      <div
        className="logout-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-modal-title"
        aria-describedby="logout-modal-desc"
      >
        <div className="logout-modal-body">
          <h2 id="logout-modal-title" className="logout-modal-title">
            Sign Out
          </h2>
          <p id="logout-modal-desc" className="logout-modal-desc">
            Are you sure you want to sign out of your account?
          </p>
        </div>

        <div className="logout-modal-actions">
          <button
            ref={cancelBtnRef}
            type="button"
            className="logout-modal-btn logout-modal-btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="logout-modal-btn logout-modal-btn-confirm"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutModal;
