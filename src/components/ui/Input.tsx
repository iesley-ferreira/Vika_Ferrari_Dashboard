import { cn } from '@/lib/utils';
import { type LucideIcon } from 'lucide-react';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon: Icon, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-label-sm uppercase tracking-widest text-on-surface-variant"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {Icon && (
            <Icon
              size={16}
              className="absolute left-0 text-outline pointer-events-none"
            />
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-transparent border-b border-outline-variant text-on-surface text-sm py-2 outline-none transition-colors',
              'focus:border-primary-container placeholder:text-outline',
              Icon && 'pl-6',
              error && 'border-error',
              className
            )}
            {...props}
          />
        </div>
        {error && <span className="text-xs text-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
