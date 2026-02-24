import React, { useEffect } from 'react';
import { CheckCircle, XCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

export interface ToastMessage {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info' | 'warning';
  action?: { label: string; onClick: () => void };
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, toast.action ? 6000 : 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove, toast.action]);

  const icons: Record<string, React.ReactNode> = {
    success: <CheckCircle size={18} />,
    error: <XCircle size={18} />,
    info: <Info size={18} />,
    warning: <AlertTriangle size={18} />,
  };

  return (
    <div className={`toast toast-${toast.type}`} onClick={() => { if (!toast.action) onRemove(toast.id); }}>
      <span className="toast-icon">{icons[toast.type]}</span>
      <span className="toast-text">{toast.text}</span>
      {toast.action && (
        <button
          className="toast-action"
          onClick={(e) => {
            e.stopPropagation();
            toast.action!.onClick();
            onRemove(toast.id);
          }}
        >
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
