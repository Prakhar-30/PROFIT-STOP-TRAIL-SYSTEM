import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast from '../components/Toast';
import '../styles/Toast.css';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'error', duration = 5000) => {
    const id = toastId++;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showError = useCallback((message) => {
    addToast(message, 'error', 5000);
  }, [addToast]);

  const showSuccess = useCallback((message) => {
    addToast(message, 'success', 4000);
  }, [addToast]);

  const showWarning = useCallback((message) => {
    addToast(message, 'warning', 4000);
  }, [addToast]);

  const showInfo = useCallback((message) => {
    addToast(message, 'info', 4000);
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        showError,
        showSuccess,
        showWarning,
        showInfo,
      }}
    >
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            id={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={removeToast}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};
