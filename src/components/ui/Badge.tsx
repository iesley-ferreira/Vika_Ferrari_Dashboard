import { cn } from '@/lib/utils';

const AREA_STYLES: Record<string, string> = {
  comercial: 'bg-primary-container/15 text-primary',
  produto: 'bg-secondary/15 text-secondary',
  gestor: 'bg-primary/10 text-primary',
};

const ROLE_STYLES: Record<string, string> = {
  sdr: 'bg-sdr/15 text-primary',
  seller: 'bg-seller/20 text-primary',
  closer: 'bg-closer/10 text-closer',
  especialista: 'bg-secondary/15 text-secondary',
  gestora_produto: 'bg-secondary-light/20 text-secondary',
  gestor: 'bg-primary/10 text-primary',
};

const ROLE_LABELS: Record<string, string> = {
  sdr: 'SDR',
  seller: 'Seller',
  closer: 'Closer',
  especialista: 'Especialista',
  gestora_produto: 'Gestora Produto',
  gestor: 'Gestor',
};

const AREA_LABELS: Record<string, string> = {
  comercial: 'Comercial',
  produto: 'Produto',
  gestor: 'Gestor',
};

interface BadgeProps {
  type: 'area' | 'role';
  value: string;
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ type, value, size = 'sm', className }: BadgeProps) {
  const styles = type === 'area' ? AREA_STYLES : ROLE_STYLES;
  const labels = type === 'area' ? AREA_LABELS : ROLE_LABELS;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1',
        styles[value] ?? 'bg-surface-high text-on-surface-variant',
        className
      )}
    >
      {labels[value] ?? value}
    </span>
  );
}
