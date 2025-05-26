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
  
  // Use a ref to maintain a history of shown toasts across renders
  const shownToastsRef = useRef<Set<string>>(new Set());

  const showToast = (message: string, type: ToastType) => {
    // Create a unique key for this toast message and type
    const toastKey = `${message}-${type}`;
    
    // Only show toast if it hasn't been shown before
    if (!shownToastsRef.current.has(toastKey)) {
      // Mark this toast as shown
      shownToastsRef.current.add(toastKey);
      
      const id = Date.now().toString();
      
      // Add the new toast and limit to 3 visible at a time
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
            duration={3000 + index * 500} // Stagger durations
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastContext; 