'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative bg-surface rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-outline-variant/20">
            <h2 className="font-serif text-headline-md text-on-surface">{title}</h2>
            <button onClick={onClose} className="text-outline hover:text-on-surface transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-outline-variant/20">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
