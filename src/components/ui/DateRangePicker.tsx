'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import {
  format, subDays, startOfMonth, endOfMonth, subMonths, startOfWeek, parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { cn } from '@/lib/utils';

export interface DateRange {
  startDate: string; // 'yyyy-MM-dd'
  endDate: string;   // 'yyyy-MM-dd'
}

interface Preset {
  label: string;
  start: string;
  end: string;
}

interface DateRangePickerProps extends DateRange {
  onChange: (range: DateRange) => void;
  accentColor?: string;
  accentBg?: string;
}

function buildPresets(): Preset[] {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(now, 1), 'yyyy-MM-dd');
  const last7Str = format(subDays(now, 6), 'yyyy-MM-dd');
  const weekStartStr = format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(now), 'yyyy-MM-dd');
  const lastMonth = subMonths(now, 1);
  const lastMonthStartStr = format(startOfMonth(lastMonth), 'yyyy-MM-dd');
  const lastMonthEndStr = format(endOfMonth(lastMonth), 'yyyy-MM-dd');

  return [
    { label: 'Hoje', start: todayStr, end: todayStr },
    { label: 'Ontem', start: yesterdayStr, end: yesterdayStr },
    { label: 'Últimos 7 dias', start: last7Str, end: todayStr },
    { label: 'Esta semana', start: weekStartStr, end: todayStr },
    { label: 'Este mês', start: monthStartStr, end: todayStr },
    { label: 'Mês passado', start: lastMonthStartStr, end: lastMonthEndStr },
  ];
}

function getRangeLabel(startDate: string, endDate: string, presets: Preset[]): string {
  const preset = presets.find((p) => p.start === startDate && p.end === endDate);
  if (preset) return preset.label;

  const start = parseISO(startDate);
  const end = parseISO(endDate);

  if (startDate === endDate) {
    return format(start, "dd 'de' MMM", { locale: ptBR });
  }
  return `${format(start, 'dd/MM')} – ${format(end, 'dd/MM')}`;
}

export function DateRangePicker({
  startDate,
  endDate,
  onChange,
  accentColor = '#755b00',
  accentBg = '#c9a84c15',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);
  const ref = useRef<HTMLDivElement>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const presets = buildPresets();
  const label = getRangeLabel(startDate, endDate, presets);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Sync custom inputs when external value changes
  useEffect(() => {
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [startDate, endDate]);

  function selectPreset(preset: Preset) {
    onChange({ startDate: preset.start, endDate: preset.end });
    setOpen(false);
  }

  function applyCustom() {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ startDate: customStart, endDate: customEnd });
      setOpen(false);
    }
  }

  const canApply = Boolean(customStart && customEnd && customStart <= customEnd);

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors"
        style={{
          borderColor: open ? accentColor : '#d0c5b2',
          color: accentColor,
          backgroundColor: accentBg,
        }}
      >
        <Calendar size={14} />
        <span>{label}</span>
        <ChevronDown size={14} className={cn('transition-transform duration-150', open && 'rotate-180')} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-outline-variant p-3 w-52">
          {/* Presets */}
          <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-1.5 px-1">
            Período
          </p>
          <div className="flex flex-col gap-0.5 mb-3">
            {presets.map((preset) => {
              const isActive = preset.start === startDate && preset.end === endDate;
              return (
                <button
                  key={preset.label}
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    'text-left text-sm px-3 py-1.5 rounded-lg transition-colors w-full',
                    isActive
                      ? 'font-medium'
                      : 'text-on-surface-variant hover:bg-surface-container'
                  )}
                  style={isActive ? { color: accentColor, backgroundColor: accentBg } : {}}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-outline-variant/40 mb-3" />

          {/* Custom range */}
          <p className="text-xs font-semibold text-outline uppercase tracking-wider mb-2 px-1">
            Personalizado
          </p>
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-outline px-1">De</label>
              <input
                type="date"
                value={customStart}
                max={today}
                onChange={(e) => setCustomStart(e.target.value)}
                className="text-sm border border-outline-variant rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:border-on-surface-variant"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-outline px-1">Até</label>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                max={today}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="text-sm border border-outline-variant rounded-lg px-2.5 py-1.5 w-full focus:outline-none focus:border-on-surface-variant"
              />
            </div>
            <button
              onClick={applyCustom}
              disabled={!canApply}
              className="text-sm font-medium py-1.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-white mt-0.5"
              style={{ backgroundColor: accentColor }}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
