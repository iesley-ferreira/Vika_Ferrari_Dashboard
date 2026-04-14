import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: Date | string, pattern = 'dd/MM/yyyy'): string {
  return format(new Date(date), pattern, { locale: ptBR });
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getTmrSemaphore(hours: number, minutes: number): 'green' | 'amber' | 'red' {
  const total = hours + minutes / 60;
  if (total === 0) return 'green';
  if (total < 2) return 'green';
  if (total <= 4) return 'amber';
  return 'red';
}

export function getRemainingWorkDays(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let count = 0;
  for (let d = new Date(now); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Total de dias úteis no mês atual (1º ao último dia) */
export function getTotalWorkDaysInMonth(): number {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let count = 0;
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

export function getMissingPerDay(current: number, target: number): number {
  const remaining = getRemainingWorkDays();
  if (remaining <= 0) return 0;
  return Math.max(0, Math.ceil((target - current) / remaining));
}

/** Dias úteis (seg–sex) dentro do intervalo inclusivo [start, end]. */
export function countWorkDays(start: Date, end: Date): number {
  if (end < start) return 0;
  let count = 0;
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  for (; d <= last; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/** Total de dias úteis em um mês específico (formato 'YYYY-MM'). */
export function getWorkDaysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return countWorkDays(first, last);
}

/** Lista de chaves 'YYYY-MM' que a faixa [start, end] atravessa. */
export function monthsInRange(startDate: string, endDate: string): string[] {
  const [sy, sm] = startDate.split('-').map(Number);
  const [ey, em] = endDate.split('-').map(Number);
  const out: string[] = [];
  let y = sy, m = sm;
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

/**
 * Calcula a meta para um período, proporcional aos dias úteis cobertos.
 * Para cada mês tocado: (dias úteis do período dentro do mês / dias úteis totais do mês) × meta mensal.
 * Soma as contribuições — então "mês completo" retorna a meta cheia, e "1 dia útil" retorna a meta diária.
 */
export function calcPeriodTarget(
  startDate: string,
  endDate: string,
  monthlyTarget: (month: string) => number | undefined,
): number | undefined {
  const months = monthsInRange(startDate, endDate);
  const [sy, sm, sd] = startDate.split('-').map(Number);
  const [ey, em, ed] = endDate.split('-').map(Number);
  const rangeStart = new Date(sy, sm - 1, sd);
  const rangeEnd = new Date(ey, em - 1, ed);
  let total = 0;
  let anyGoal = false;
  for (const mk of months) {
    const goal = monthlyTarget(mk);
    if (goal == null) continue;
    anyGoal = true;
    const [y, m] = mk.split('-').map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0);
    const overlapStart = rangeStart > monthStart ? rangeStart : monthStart;
    const overlapEnd = rangeEnd < monthEnd ? rangeEnd : monthEnd;
    const overlapWd = countWorkDays(overlapStart, overlapEnd);
    const monthWd = countWorkDays(monthStart, monthEnd);
    if (monthWd === 0) continue;
    total += (goal * overlapWd) / monthWd;
  }
  return anyGoal ? Math.round(total) : undefined;
}

export function getMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  return format(date, 'MMMM yyyy', { locale: ptBR });
}
