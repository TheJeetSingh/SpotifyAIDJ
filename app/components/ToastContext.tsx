'use client';

import React, { createContext, useContext, useState, ReactNode, useRef } from 'react';
import Toast, { ToastType } from './Toast';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  const shownToastsRef = useRef<Set<string>>(new Set());

  const showToast = (message: string, type: ToastType) => {
    const toastKey = `${message}-${type}`;
    
    if (!shownToastsRef.current.has(toastKey)) {
      shownToastsRef.current.add(toastKey);
      
      const id = Date.now().toString();
      
      setToasts(prev => {
        const updatedToasts = [...prev, { id, message, type }];
        return updatedToasts.slice(-3);
      });
    }
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3">
        {toasts.map((toast, index) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
            duration={3000 + index * 500} 
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastContext; 