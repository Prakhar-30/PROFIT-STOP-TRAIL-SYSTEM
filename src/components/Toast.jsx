import React, { useEffect } from 'react';
import '../styles/Toast.css';

const Toast = ({ id, message, type = 'error', duration = 5000, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'warning':
        return '⚠';
      case 'info':
        return 'ℹ';
      default:
        return '✕';
    }
  };

  return (
    <div className={`toast toast-${type} fade-in`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={() => onClose(id)}>
        ×
      </button>
    </div>
  );
};

export default Toast;
