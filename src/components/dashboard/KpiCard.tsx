import { MiniDonutChart, type DonutSlice } from '@/components/charts/MiniDonutChart';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn, formatCurrency } from '@/lib/utils';
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

/** Formato compacto para tooltip do donut: 30000→30k, 1500→1,5k */
function formatCompact(value: number): string {
  if (value >= 1000) {
    const k = value / 1000;
    if (k === Math.floor(k)) return `${k}k`;
    return `${k.toFixed(1).replace('.', ',')}k`;
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
  /** Valor acumulado no mês — usado na barra de progresso quando diferente de `value` */
  monthValue?: number;
  /** Rótulo da meta (ex: "Meta diária", "Meta mensal"). Padrão: "Meta" */
  targetLabel?: string;
  area: 'comercial' | 'produto';
  icon?: LucideIcon;
  semaphore?: 'green' | 'amber' | 'red';
  suffix?: string;
  missingPerDay?: number;
  donutData?: DonutSlice[];
  /** Texto de meta exibido sem barra de progresso (ex: métricas onde menor é melhor) */
  targetHint?: string;
}

export function KpiCard({
  title,
  value,
  format = 'number',
  target,
  monthValue,
  targetLabel = 'Meta',
  area,
  icon: Icon,
  semaphore,
  suffix,
  missingPerDay,
  donutData,
  targetHint,
}: KpiCardProps) {
  // Para o progresso, usa o acumulado do mês quando disponível
  const progressValue = monthValue ?? value;
  const missing = target ? Math.max(0, Math.round(target - progressValue)) : 0;
  const hasDonut = donutData && donutData.length > 1 && value > 0;

  return (
    <Card variant={area} className="h-full flex flex-col">
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
            formatValue={(v) => format === 'currency' ? formatCompact(v) : formatValue(v, format)}
          />
        )}
      </div>

      {target !== undefined && (
        <div className="space-y-1.5 mt-auto">
          <ProgressBar value={progressValue} max={target} showLabel area={area} />
          <div className="flex justify-between text-xs text-outline">
            <span>{targetLabel}: {formatValue(target, format)}</span>
            {missing > 0 && <span>Faltam: {formatValue(missing, format)}</span>}
          </div>
          {monthValue !== undefined && monthValue !== value && (
            <p className="text-xs text-outline opacity-70">
              Acumulado no mês: {formatValue(monthValue, format)}
            </p>
          )}
        </div>
      )}

      {target === undefined && targetHint && (
        <p className="text-xs text-outline mt-auto">{targetHint}</p>
      )}
    </Card>
  );
}
