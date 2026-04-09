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

export function getMissingPerDay(current: number, target: number): number {
  const remaining = getRemainingWorkDays();
  if (remaining <= 0) return 0;
  return Math.max(0, Math.ceil((target - current) / remaining));
}

export function getMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const date = new Date(parseInt(year), parseInt(m) - 1, 1);
  return format(date, 'MMMM yyyy', { locale: ptBR });
}
