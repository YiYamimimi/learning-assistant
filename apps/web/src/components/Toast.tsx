'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'info' | 'success' | 'error' | 'warning';
type ToastPosition = 'center' | 'top-right';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  position: ToastPosition;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, position?: ToastPosition) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, string> = {
  info: 'ℹ️',
  success: '✅',
  error: '❌',
  warning: '⚠️',
};

const BG: Record<ToastType, string> = {
  info: 'bg-blue-50 border-blue-200 text-blue-800',
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-orange-50 border-orange-200 text-orange-800',
};

const CONTAINER_CLASS: Record<ToastPosition, string> = {
  center: 'fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] flex flex-col gap-2 pointer-events-none',
  'top-right': 'fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: ToastType = 'info', position: ToastPosition = 'center') => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, message, type, position }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const centerToasts = toasts.filter((t) => t.position === 'center');
  const topRightToasts = toasts.filter((t) => t.position === 'top-right');

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={CONTAINER_CLASS.center}>
        {centerToasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-lg border shadow-lg text-xl animate-slide-in ${BG[toast.type]}`}
            onClick={() => removeToast(toast.id)}
          >
            <span>{ICONS[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
      <div className={CONTAINER_CLASS['top-right']}>
        {topRightToasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center gap-3 px-6 py-4 rounded-lg border shadow-lg text-base animate-slide-in ${BG[toast.type]}`}
            onClick={() => removeToast(toast.id)}
          >
            <span>{ICONS[toast.type]}</span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
