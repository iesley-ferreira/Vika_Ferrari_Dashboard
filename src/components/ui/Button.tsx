import { cn } from '@/lib/utils';
import { Loader2, type LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: LucideIcon;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all rounded-md',
        {
          'bg-gradient-to-br from-primary to-primary-container text-white hover:opacity-90': variant === 'primary',
          'bg-transparent border border-outline-variant/15 text-primary hover:bg-surface-low': variant === 'secondary',
          'text-on-surface-variant hover:text-on-surface': variant === 'ghost',
          'bg-soft-red text-white hover:opacity-90': variant === 'danger',
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-sm': size === 'md',
          'h-12 px-6 text-base': size === 'lg',
          'opacity-50 cursor-not-allowed': disabled || loading,
        },
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : Icon ? (
        <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} />
      ) : null}
      {children}
    </button>
  );
}
