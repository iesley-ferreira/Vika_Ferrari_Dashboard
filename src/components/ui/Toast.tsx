'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { CircleCheck, TriangleAlert, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const remove = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-md shadow-md text-sm font-medium min-w-64 max-w-xs animate-slide-in',
              {
                'bg-tertiary-container text-on-surface': t.type === 'success',
                'bg-error-container text-on-surface': t.type === 'error',
                'bg-secondary-container text-on-surface': t.type === 'info',
              }
            )}
          >
            {t.type === 'success' && <CircleCheck size={16} className="text-tertiary shrink-0" />}
            {t.type === 'error' && <TriangleAlert size={16} className="text-error shrink-0" />}
            {t.type === 'info' && <Info size={16} className="text-secondary shrink-0" />}
            <span className="flex-1">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-on-surface-variant hover:text-on-surface">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
