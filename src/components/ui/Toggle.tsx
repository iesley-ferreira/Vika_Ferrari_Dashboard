import { cn } from '@/lib/utils';

interface ToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  labelOn?: string;
  labelOff?: string;
  className?: string;
}

export function Toggle({
  value,
  onChange,
  labelOn = 'Atualizado',
  labelOff = 'Pendente',
  className,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={cn('flex items-center gap-2', className)}
    >
      <div
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          value ? 'bg-tertiary' : 'bg-outline-variant'
        )}
      >
        <span
          className={cn(
            'absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200',
            value ? 'left-6' : 'left-1'
          )}
        />
      </div>
      <span className={cn('text-sm font-medium', value ? 'text-tertiary' : 'text-outline')}>
        {value ? labelOn : labelOff}
      </span>
    </button>
  );
}
