import React, { createContext, useContext, useState } from 'react';
import '../styles/ToastContext.css';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = (message) => {
    setToast({ show: true, message });
    // Auto-hide after 3 seconds
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* The Actual UI (Rendered globally) */}
      {toast.show && (
        <div className="toast-notification">
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