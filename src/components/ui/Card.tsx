import { cn } from '@/lib/utils';

interface CardProps {
  variant?: 'default' | 'elevated' | 'comercial' | 'produto' | 'glass';
  padding?: string;
  className?: string;
  children: React.ReactNode;
}

export function Card({ variant = 'default', padding = 'p-5', className, children }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-md bg-background border border-outline-variant',
        {
          'shadow-sm': variant === 'elevated',
          'border-t-[3px] border-t-primary-container': variant === 'comercial',
          'border-t-[3px] border-t-secondary': variant === 'produto',
          'bg-white/70 backdrop-blur-[16px] border-outline-variant/15': variant === 'glass',
        },
        padding,
        className
      )}
    >
      {children}
    </div>
  );
}
