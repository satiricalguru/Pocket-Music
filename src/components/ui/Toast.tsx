import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

// Simple imperative singleton — Toast component reads from here.
let toastListeners: Array<(t: ToastItem) => void> = [];
let counter = 0;

export function showToast(message: string, type: ToastType = 'info') {
  const item: ToastItem = { id: `t-${counter++}`, message, type };
  toastListeners.forEach((l) => l(item));
}

export const Toast: React.FC = () => {
  const [items, setItems] = useState<ToastItem[]>([]);

  const handleShow = useCallback((item: ToastItem) => {
    setItems((prev) => [...prev, item]);
    setTimeout(() => {
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    }, 3500);
  }, []);

  React.useEffect(() => {
    toastListeners.push(handleShow);
    return () => {
      toastListeners = toastListeners.filter((l) => l !== handleShow);
    };
  }, [handleShow]);

  const icons = {
    success: <CheckCircle2 size={18} className="text-green" />,
    error: <AlertCircle size={18} className="text-red-500" />,
    info: <Info size={18} className="text-text2" />,
  };

  return createPortal(
    <div className="fixed bottom-[calc(var(--playerbar-h)+16px)] right-6 z-[200] space-y-2 pointer-events-none">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center gap-3 bg-elevated border border-border rounded-lg shadow-2xl px-4 py-3 fade-in pointer-events-auto"
          style={{ minWidth: 280, maxWidth: 400 }}
        >
          {icons[item.type]}
          <span className="text-sm text-text1 flex-1">{item.message}</span>
          <button
            onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
            className="text-text3 hover:text-text1"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
};
