import { cn } from '@/lib/utils';

interface SkeletonProps {
  variant?: 'text' | 'card' | 'circle';
  width?: string;
  height?: string;
  className?: string;
}

export function Skeleton({ variant = 'text', width, height, className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-surface-high',
        {
          'h-4 rounded': variant === 'text',
          'h-32 rounded-md': variant === 'card',
          'rounded-full': variant === 'circle',
        },
        className
      )}
      style={{ width, height }}
    />
  );
}
