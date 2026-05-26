import React, { createContext, useContext, useState, useRef } from 'react';
import '../styles/ToastContext.css';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ show: false, message: '', key: 0 });
  const toastTimer = useRef(null);
  const hideTimer = useRef(null);

const showToast = (message) => {
  if (toastTimer.current) clearTimeout(toastTimer.current);
  // Force unmount by hiding first, then remount with new key
  setToast({ show: false, message: '', key: 0 });
  setTimeout(() => {
    setToast({ show: true, message, key: Date.now() });
    toastTimer.current = setTimeout(() => {
      setToast({ show: false, message: '', key: 0 });
    }, 3000);
  }, 50);
};
  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast.show && (
        <div key={toast.key} className="toast-notification">
          <div className="toast-content">
            <div className="toast-icon">
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);