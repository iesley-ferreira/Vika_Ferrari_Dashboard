import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { MiniDonutChart, type DonutSlice } from '@/components/charts/MiniDonutChart';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

type Format = 'currency' | 'number' | 'time' | 'percent';

function formatValue(value: number, fmt: Format): string {
  if (fmt === 'currency') return formatCurrency(value);
  if (fmt === 'percent') return `${value.toFixed(1)}%`;
  if (fmt === 'time') {
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  }
  return value.toLocaleString('pt-BR');
}

// Separa "R$" do número para renderização diferenciada
function splitCurrency(value: number): { symbol: string; amount: string } {
  const formatted = formatCurrency(value);
  const amount = formatted.replace(/^R\$\s*/, '').trim();
  return { symbol: 'R$', amount };
}

const SEMAPHORE_COLORS = {
  green: 'bg-tertiary',
  amber: 'bg-yellow-500',
  red: 'bg-soft-red',
};

interface KpiCardProps {
  title: string;
  value: number;
  format?: Format;
  target?: number;
  area: 'comercial' | 'produto';
  icon?: LucideIcon;
  semaphore?: 'green' | 'amber' | 'red';
  suffix?: string;
  missingPerDay?: number;
  donutData?: DonutSlice[];
}

export function KpiCard({
  title,
  value,
  format = 'number',
  target,
  area,
  icon: Icon,
  semaphore,
  suffix,
  missingPerDay,
  donutData,
}: KpiCardProps) {
  const missing = target ? Math.max(0, target - value) : 0;
  const hasDonut = donutData && donutData.length > 1 && value > 0;

  return (
    <Card variant={area}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">{title}</p>
        {Icon && <Icon size={16} className="text-outline mt-0.5" />}
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-end gap-2 min-w-0">
          {format === 'currency' ? (
            <span className="flex items-baseline gap-1 leading-none">
              <span className="font-serif text-lg font-bold text-on-surface-variant">
                {splitCurrency(value).symbol}
              </span>
              <span className="font-serif text-3xl font-bold text-on-surface leading-none">
                {splitCurrency(value).amount}
              </span>
            </span>
          ) : (
            <span className={cn('font-serif text-3xl font-bold text-on-surface leading-none')}>
              {formatValue(value, format)}
            </span>
          )}
          {suffix && <span className="text-sm text-outline mb-0.5">{suffix}</span>}
          {semaphore && (
            <span className={cn('w-2.5 h-2.5 rounded-full mb-1 flex-shrink-0', SEMAPHORE_COLORS[semaphore])} />
          )}
        </div>
        {hasDonut && (
          <MiniDonutChart
            data={donutData!}
            size={64}
            formatValue={(v) => formatValue(v, format)}
          />
        )}
      </div>

      {target !== undefined && (
        <div className="space-y-1.5">
          <ProgressBar value={value} max={target} showLabel />
          <div className="flex justify-between text-xs text-outline">
            <span>Meta: {formatValue(target, format)}</span>
            {missing > 0 && <span>Faltam: {formatValue(missing, format)}</span>}
          </div>
          {missingPerDay !== undefined && missingPerDay > 0 && (
            <p className="text-xs text-on-surface-variant">
              ≈ {formatValue(missingPerDay, format)}/dia
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
