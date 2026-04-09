'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, Calendar,
} from 'lucide-react';
import { ProdutoEvolutionCharts } from '@/components/charts/ProdutoCharts';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { RankingList, type RankingEntry } from '@/components/dashboard/RankingList';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useReportsByDate, type ReportRow } from '@/hooks/useReportsByDate';
import { createClient } from '@/lib/supabase/client';
import { useMonthReports } from '@/hooks/useMonthReports';
import { calcProdutoScore, calcResolutionRate } from '@/lib/calculations';
import { getCurrentMonth } from '@/lib/utils';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

const PERIOD_TABS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mês' },
];

function buildRanking(reports: ReportRow[]): RankingEntry[] {
  return reports
    .filter((r) => r.area === 'produto')
    .map((r) => {
      const d = r.data as Record<string, unknown>;
      const resolvidos = Number(d.resolvidos_total ?? 0);
      const tmrH = Number(d.tempo_medio_resposta_horas ?? 0);
      const tmrM = Number(d.tempo_medio_resposta_minutos ?? 0);
      const bloqueios = Number(d.nao_sei_o_que_fazer ?? 0) + Number(d.falta_clareza_qtd ?? 0);
      const taxa = calcResolutionRate(Number(d.atendimentos_total ?? 0), resolvidos);
      const score = calcProdutoScore(resolvidos, tmrH, tmrM, bloqueios);
      return {
        profile: r.profile,
        score,
        metrics: [
          { label: 'Resolvidos', value: String(resolvidos) },
          { label: 'Taxa', value: `${taxa}%` },
          { label: 'TMR', value: `${tmrH}h${tmrM > 0 ? ` ${tmrM}min` : ''}` },
        ],
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ── DateNav ───────────────────────────────────────────────────
function DateNav({ date, onChange }: { date: string; onChange: (d: string) => void }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const parsed = new Date(date + 'T12:00:00');
  const label = format(parsed, "EEE, dd 'de' MMM", { locale: ptBR });
  const isToday = date === today;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(format(subDays(parsed, 1), 'yyyy-MM-dd'))}
        className="p-1.5 rounded-lg hover:bg-surface-container transition"
        style={{ color: '#7e7665' }}
      >
        <ChevronLeft size={16} />
      </button>
      <div className="relative">
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="opacity-0 absolute inset-0 w-full cursor-pointer"
        />
        <span
          className="text-sm font-medium px-3 py-1.5 rounded-lg border flex items-center gap-1.5 cursor-pointer"
          style={{
            borderColor: '#d0c5b2',
            color: isToday ? '#406181' : '#1d1c17',
            backgroundColor: isToday ? '#40618115' : 'white',
          }}
        >
          <Calendar size={14} />
          {isToday ? 'Hoje' : label}
        </span>
      </div>
      <button
        onClick={() => { if (!isToday) onChange(format(addDays(parsed, 1), 'yyyy-MM-dd')); }}
        disabled={isToday}
        className="p-1.5 rounded-lg hover:bg-surface-container transition disabled:opacity-30"
        style={{ color: '#7e7665' }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ProdutoPage() {
  const [period, setPeriod] = useState('today');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const month = getCurrentMonth();

  const { reports, profiles, loading, error, silentRefresh } = useReportsByDate(selectedDate);
  const { produtoPoints, loading: chartLoading } = useMonthReports(month);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

  // Realtime: atualiza KPIs sem piscar quando alguém envia/edita relatório
  useEffect(() => {
    if (!isToday) return;
    const supabase = createClient();
    const channel = supabase
      .channel('produto_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_reports' }, () => silentRefresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'daily_reports' }, () => silentRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isToday, silentRefresh]);

  const produtoReports = reports.filter((r) => r.area === 'produto');

  let atendimentos = 0, resolvidos = 0, tmrSum = 0, tmrCount = 0, bloqueios = 0;
  for (const r of produtoReports) {
    const d = r.data as Record<string, unknown>;
    atendimentos += Number(d.atendimentos_total ?? 0);
    resolvidos += Number(d.resolvidos_total ?? 0);
    const h = Number(d.tempo_medio_resposta_horas ?? 0);
    const m = Number(d.tempo_medio_resposta_minutos ?? 0);
    if (h > 0 || m > 0) { tmrSum += h + m / 60; tmrCount++; }
    bloqueios += Number(d.nao_sei_o_que_fazer ?? 0) + Number(d.falta_clareza_qtd ?? 0);
  }
  const tmrMedio = tmrCount > 0 ? tmrSum / tmrCount : 0;
  const tmrSemaphore: 'green' | 'amber' | 'red' =
    tmrMedio === 0 ? 'green' : tmrMedio < 2 ? 'green' : tmrMedio <= 4 ? 'amber' : 'red';
  const taxaResolucao = calcResolutionRate(atendimentos, resolvidos);
  const ranking = buildRanking(produtoReports);

  // Filter chart data to days with actual data
  const chartData = produtoPoints.filter((p) =>
    p.atendimentos > 0 || p.resolvidos > 0
  );

  return (
    <div className="space-y-8">
      {/* Date nav */}
      <div className="flex justify-end">
        <DateNav date={selectedDate} onChange={setSelectedDate} />
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: '#ffeded', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <section>
        <p className="text-label-sm uppercase tracking-widest text-outline mb-3">◆ KPIs do Dia</p>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} variant="card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Atendimentos" value={atendimentos} area="produto" />
            <KpiCard title="Resolvidos" value={resolvidos} area="produto" />
            <KpiCard
              title="TMR Médio"
              value={tmrMedio}
              format="time"
              area="produto"
              semaphore={tmrSemaphore}
            />
            <KpiCard
              title="Taxa Resolução"
              value={taxaResolucao}
              format="percent"
              area="produto"
            />
          </div>
        )}
      </section>

      {/* Monthly Charts */}
      <section className="space-y-4">
        <p className="text-label-sm uppercase tracking-widest text-outline">◆ Evolução do Mês</p>
        {chartLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} variant="card" className="h-52" />)}
          </div>
        ) : (
          <ProdutoEvolutionCharts data={chartData} />
        )}
      </section>

      {/* Ranking */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-label-sm uppercase tracking-widest text-outline">◆ Ranking Equipe Produto</p>
          <Tabs tabs={PERIOD_TABS} active={period} onChange={setPeriod} />
        </div>
        <Card variant="elevated">
          {loading
            ? <Skeleton variant="card" />
            : <RankingList entries={ranking} area="produto" />}
        </Card>
      </section>

    </div>
  );
}
