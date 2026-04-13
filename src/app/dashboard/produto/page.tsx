'use client';

import { useState, useEffect } from 'react';
import { ProdutoEvolutionCharts } from '@/components/charts/ProdutoCharts';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { RankingList, type RankingEntry } from '@/components/dashboard/RankingList';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker';
import { useReportsByDateRange, type ReportRow } from '@/hooks/useReportsByDateRange';
import { createClient } from '@/lib/supabase/client';
import { calcProdutoScore, calcResolutionRate } from '@/lib/calculations';
import { eachDayOfInterval, format, parseISO, startOfMonth } from 'date-fns';
import type { ProdutoDayPoint } from '@/hooks/useMonthReports';

function buildRanking(reports: ReportRow[]): RankingEntry[] {
  const grouped = new Map<string, RankingEntry & {
    atendimentos: number;
    resolvidos: number;
    bloqueios: number;
    tmrHoursSum: number;
    tmrCount: number;
  }>();

  for (const r of reports) {
    if (r.area !== 'produto') continue;

    let entry = grouped.get(r.user_id);
    if (!entry) {
      entry = {
        profile: r.profile,
        score: 0,
        metrics: [],
        atendimentos: 0,
        resolvidos: 0,
        bloqueios: 0,
        tmrHoursSum: 0,
        tmrCount: 0,
      };
      grouped.set(r.user_id, entry);
    }

    const d = r.data as Record<string, unknown>;
    const atendimentos = Number(d.atendimentos_total ?? 0);
    const resolvidos = Number(d.resolvidos_total ?? 0);
    const tmrH = Number(d.tempo_medio_resposta_horas ?? 0);
    const tmrM = Number(d.tempo_medio_resposta_minutos ?? 0);
    const bloqueios = Number(d.nao_sei_o_que_fazer ?? 0) + Number(d.falta_clareza_qtd ?? 0);
    const score = calcProdutoScore(resolvidos, tmrH, tmrM, bloqueios);

    entry.score += score;
    entry.atendimentos += atendimentos;
    entry.resolvidos += resolvidos;
    entry.bloqueios += bloqueios;
    if (tmrH > 0 || tmrM > 0) {
      entry.tmrHoursSum += tmrH + tmrM / 60;
      entry.tmrCount += 1;
    }
  }

  return [...grouped.values()]
    .map((entry) => {
      const taxa = calcResolutionRate(entry.atendimentos, entry.resolvidos);
      const tmrMedio = entry.tmrCount > 0 ? entry.tmrHoursSum / entry.tmrCount : 0;
      const tmrLabel = `${Math.floor(tmrMedio)}h ${Math.round((tmrMedio % 1) * 60)}min`;
      return {
        profile: entry.profile,
        score: Math.round(entry.score * 100) / 100,
        metrics: [
          { label: 'Resolvidos', value: String(entry.resolvidos) },
          { label: 'Taxa', value: `${taxa}%` },
          { label: 'TMR', value: tmrMedio > 0 ? tmrLabel : '0h 0min' },
        ],
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Main ──────────────────────────────────────────────────────
export default function ProdutoPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [range, setRange] = useState<DateRange>({ startDate: monthStart, endDate: today });

  const { reports, loading, error, silentRefresh } = useReportsByDateRange(
    range.startDate,
    range.endDate
  );
  const isToday = range.startDate === today && range.endDate === today;
  const isSingleDay = range.startDate === range.endDate;

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

  const chartData: ProdutoDayPoint[] = eachDayOfInterval({
    start: parseISO(range.startDate),
    end: parseISO(range.endDate),
  }).map((day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayReports = produtoReports.filter((r) => r.report_date === dayKey);
    let dayAtendimentos = 0;
    let dayResolvidos = 0;
    let dayTmrSum = 0;
    let dayTmrCount = 0;
    let dayBloqueios = 0;

    for (const report of dayReports) {
      const data = report.data as Record<string, unknown>;
      dayAtendimentos += Number(data.atendimentos_total ?? 0);
      dayResolvidos += Number(data.resolvidos_total ?? 0);
      const h = Number(data.tempo_medio_resposta_horas ?? 0);
      const m = Number(data.tempo_medio_resposta_minutos ?? 0);
      if (h > 0 || m > 0) {
        dayTmrSum += h + m / 60;
        dayTmrCount++;
      }
      dayBloqueios += Number(data.nao_sei_o_que_fazer ?? 0) + Number(data.falta_clareza_qtd ?? 0);
    }

    const dayTmr = dayTmrCount > 0 ? Math.round((dayTmrSum / dayTmrCount) * 10) / 10 : 0;
    const dayTaxaResolucao = dayAtendimentos > 0 ? Math.round((dayResolvidos / dayAtendimentos) * 100) : 0;

    return {
      date: format(day, 'dd/MM'),
      atendimentos: dayAtendimentos,
      resolvidos: dayResolvidos,
      tmr: dayTmr,
      bloqueios: dayBloqueios,
      taxaResolucao: dayTaxaResolucao,
    };
  });

  return (
    <div className="space-y-8">
      {/* Date range */}
      <div className="flex justify-end">
        <DateRangePicker
          startDate={range.startDate}
          endDate={range.endDate}
          onChange={setRange}
          accentColor="#406181"
          accentBg="#40618115"
        />
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2 text-sm" style={{ backgroundColor: '#ffeded', color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <section>
        <p className="text-label-sm uppercase tracking-widest text-outline mb-3">
          ◆ KPIs {isSingleDay ? 'do Dia' : 'do Período'}
        </p>
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

      {/* Period Charts */}
      <section className="space-y-4">
        <p className="text-label-sm uppercase tracking-widest text-outline">◆ Evolução do Período</p>
        {loading ? (
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
