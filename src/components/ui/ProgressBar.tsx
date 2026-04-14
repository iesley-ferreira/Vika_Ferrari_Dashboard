import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  max: number;
  showLabel?: boolean;
  className?: string;
  /** Área define a cor da barra — alinha com o acento superior do card. */
  area?: 'comercial' | 'produto';
}

const AREA_COLORS: Record<NonNullable<ProgressBarProps['area']>, string> = {
  comercial: '#b59744',
  produto: '#334d67',
};

function getColorClass(percent: number) {
  if (percent >= 70) return 'bg-primary-container';
  if (percent >= 40) return 'bg-yellow-500';
  return 'bg-soft-red';
}

export function ProgressBar({ value, max, showLabel = false, className, area }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  const useAreaColor = area != null && percent >= 40;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-surface-high rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            !useAreaColor && getColorClass(percent),
          )}
          style={{
            width: `${percent}%`,
            backgroundColor: useAreaColor ? AREA_COLORS[area!] : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-on-surface-variant tabular-nums w-9 text-right">{percent}%</span>
      )}
    </div>
  );
}
