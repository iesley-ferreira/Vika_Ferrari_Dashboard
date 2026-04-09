import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={cn('flex gap-1 bg-surface-container rounded-md p-1', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={cn(
            'px-4 py-2 rounded-md text-sm transition-all',
            active === tab.key
              ? 'bg-surface text-on-surface font-medium shadow-sm'
              : 'text-outline hover:text-on-surface-variant'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
