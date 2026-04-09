import { cn } from '@/lib/utils';
import { forwardRef, useEffect, useRef } from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  maxLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, maxLength, className, id, value, onChange, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    const innerRef = useRef<HTMLTextAreaElement>(null);
    const resolvedRef = (ref as React.RefObject<HTMLTextAreaElement>) ?? innerRef;

    useEffect(() => {
      const el = resolvedRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }, [value, resolvedRef]);

    const len = typeof value === 'string' ? value.length : 0;

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <div className="flex items-center justify-between">
            <label
              htmlFor={inputId}
              className="text-label-sm uppercase tracking-widest text-on-surface-variant"
            >
              {label}
            </label>
            {maxLength && (
              <span className="text-xs text-outline">
                {len}/{maxLength}
              </span>
            )}
          </div>
        )}
        <textarea
          ref={resolvedRef}
          id={inputId}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          rows={3}
          className={cn(
            'w-full bg-transparent border-b border-outline-variant text-on-surface text-sm py-2 outline-none resize-none transition-colors overflow-hidden',
            'focus:border-primary-container placeholder:text-outline',
            error && 'border-error',
            className
          )}
          {...props}
        />
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
