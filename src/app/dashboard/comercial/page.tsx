'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, ShoppingCart, Calendar, Users, PhoneCall,
} from 'lucide-react';
import { ComercialEvolutionCharts } from '@/components/charts/ComercialCharts';
import { SalesRankingChart } from '@/components/charts/SalesRankingChart';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { type RankingEntry } from '@/components/dashboard/RankingList';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker';
import { useReportsByDateRange, type ReportRow } from '@/hooks/useReportsByDateRange';
import { createClient } from '@/lib/supabase/client';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { calcPeriodTarget, countWorkDays, monthsInRange } from '@/lib/utils';
import { eachDayOfInterval, format, parseISO, startOfMonth } from 'date-fns';
import type { ComercialDayPoint } from '@/hooks/useMonthReports';

const ROLE_TABS = [
  { key: 'all', label: 'Geral' },
  { key: 'sdr', label: 'SDR' },
  { key: 'seller', label: 'Seller' },
  { key: 'closer', label: 'Closer' },
];

// ── Aggregation ──────────────────────────────────────────────
function aggregateComercial(reports: ReportRow[]) {
  let faturamento = 0, vendas = 0, agendamentos = 0, capturados = 0, callsRealizadas = 0, cashCollect = 0;
  for (const r of reports) {
    if (r.area !== 'comercial') continue;
    const d = r.data as Record<string, unknown>;
    if (r.role === 'closer') {
      faturamento += Number(d.faturamento_dia ?? 0);
      cashCollect += Number(d.cash_collect_valor ?? 0);
      const v = (d.vendas as Record<string, number>) ?? {};
      vendas += (v.amht ?? 0) + (v.vtl ?? 0) + (v.flw ?? 0);
      const ag = (d.calls_agendadas as Record<string, number>) ?? {};
      agendamentos += (ag.vtl ?? 0) + (ag.flw ?? 0) + (ag.amht ?? 0) + (ag.individual ?? 0);
      const re = (d.calls_realizadas as Record<string, number>) ?? {};
      callsRealizadas += (re.vtl ?? 0) + (re.flw ?? 0) + (re.amht ?? 0) + (re.individual ?? 0);
    }
    if (r.role === 'sdr' || r.role === 'seller') {
      const ag = (d.calls_agendadas as Record<string, number>) ?? {};
      agendamentos += (ag.vtl ?? 0) + (ag.flw ?? 0) + (ag.outros ?? 0) + (ag.amht ?? 0);
      const cap = (d.contatos_capturados as Record<string, number>) ?? {};
      capturados += cap.total ?? 0;
    }
  }
  return { faturamento, vendas, agendamentos, capturados, callsRealizadas, cashCollect };
}

function buildRanking(reports: ReportRow[], roleFilter: string): RankingEntry[] {
  const grouped = new Map<string, RankingEntry & {
    role: string;
    agendamentos: number;
    capturados: number;
    vendas: number;
    faturamento: number;
    cross: number;
  }>();

  for (const r of reports) {
    if (r.area !== 'comercial') continue;
    if (roleFilter !== 'all' && r.role !== roleFilter) continue;

    let entry = grouped.get(r.user_id);
    if (!entry) {
      entry = {
        profile: r.profile,
        score: 0,
        metrics: [],
        role: r.role,
        agendamentos: 0,
        capturados: 0,
        vendas: 0,
        faturamento: 0,
        cross: 0,
      };
      grouped.set(r.user_id, entry);
    }

    const d = r.data as Record<string, unknown>;
    if (r.role === 'sdr') {
      const ag = (d.calls_agendadas as Record<string, number>) ?? {};
      const agTotal = (ag.vtl ?? 0) + (ag.flw ?? 0) + (ag.outros ?? 0);
      const cap = (d.contatos_capturados as Record<string, number>)?.total ?? 0;
      entry.score += agTotal * 2 + cap;
      entry.agendamentos += agTotal;
      entry.capturados += cap;
    } else if (r.role === 'seller') {
      const ag = (d.calls_agendadas as Record<string, number>) ?? {};
      const agTotal = (ag.vtl ?? 0) + (ag.flw ?? 0);
      const cap = (d.contatos_capturados as Record<string, number>)?.total ?? 0;
      const cross = Number(d.cross ?? 0);
      entry.score += agTotal * 2 + cap + cross * 3;
      entry.agendamentos += agTotal;
      entry.capturados += cap;
      entry.cross += cross;
    } else if (r.role === 'closer') {
      const v = (d.vendas as Record<string, number>) ?? {};
      const vendas = (v.amht ?? 0) + (v.vtl ?? 0) + (v.flw ?? 0);
      const fat = Number(d.faturamento_dia ?? 0);
      entry.score += vendas * 5 + fat / 1000;
      entry.vendas += vendas;
      entry.faturamento += fat;
    }
  }

  return [...grouped.values()]
    .map((entry) => {
      const metrics: { label: string; value: string }[] = [];
      if (entry.role === 'sdr') {
        metrics.push({ label: 'Capturados', value: String(entry.capturados) });
        metrics.push({ label: 'Agendados', value: String(entry.agendamentos) });
      } else if (entry.role === 'seller') {
        metrics.push({ label: 'Capturados', value: String(entry.capturados) });
        metrics.push({ label: 'Agendados', value: String(entry.agendamentos) });
        metrics.push({ label: 'Cross', value: String(entry.cross) });
      } else if (entry.role === 'closer') {
        metrics.push({ label: 'Vendas', value: String(entry.vendas) });
        metrics.push({ label: 'Fat.', value: `R$ ${(entry.faturamento / 1000).toFixed(0)}k` });
      }

      return { profile: entry.profile, score: Math.round(entry.score * 100) / 100, metrics };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Main Page ─────────────────────────────────────────────────
export default function ComercialPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [roleTab, setRoleTab] = useState('all');
  const [range, setRange] = useState<DateRange>({ startDate: monthStart, endDate: today });

  const { reports, loading, error, silentRefresh } = useReportsByDateRange(
    range.startDate,
    range.endDate
  );
  const rangeMonths = monthsInRange(range.startDate, range.endDate);
  const { goals } = useMonthlyGoals(rangeMonths);
  const isToday = range.startDate === today && range.endDate === today;
  const isSingleDay = range.startDate === range.endDate;

  const [sy, sm, sd] = range.startDate.split('-').map(Number);
  const [ey, em, ed] = range.endDate.split('-').map(Number);
  const periodWorkDays = countWorkDays(new Date(sy, sm - 1, sd), new Date(ey, em - 1, ed));

  function monthlyGoal(month: string, metric: string) {
    return goals.find((g) => g.month === month && g.area === 'comercial' && g.metric === metric)?.target;
  }
  function periodTarget(metric: string) {
    return calcPeriodTarget(range.startDate, range.endDate, (m) => monthlyGoal(m, metric));
  }
  const tLabel = periodWorkDays === 1 ? 'Meta diária' : `Meta (${periodWorkDays} dias úteis)`;

  // Realtime: atualiza KPIs sem piscar quando alguém envia/edita relatório
  useEffect(() => {
    if (!isToday) return;
    const supabase = createClient();
    const channel = supabase
      .channel('comercial_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_reports' }, () => silentRefresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'daily_reports' }, () => silentRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isToday, silentRefresh]);

  const comercialReports = reports.filter((r) => r.area === 'comercial');
  const kpi = aggregateComercial(comercialReports);

  const ranking = buildRanking(comercialReports, roleTab);

  const chartData: ComercialDayPoint[] = eachDayOfInterval({
    start: parseISO(range.startDate),
    end: parseISO(range.endDate),
  }).map((day) => {
    const dayKey = format(day, 'yyyy-MM-dd');
    const dayLabel = format(day, 'dd/MM');
    const dayReports = comercialReports.filter((r) => r.report_date === dayKey);
    const dayKpi = aggregateComercial(dayReports);
    return { date: dayLabel, ...dayKpi };
  });

  return (
    <div className="space-y-8">
      {/* Date range */}
      <div className="flex justify-end">
        <DateRangePicker
          startDate={range.startDate}
          endDate={range.endDate}
          onChange={setRange}
          accentColor="#755b00"
          accentBg="#c9a84c15"
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} variant="card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard
              title="Faturamento"
              value={kpi.faturamento}
              format="currency"
              target={periodTarget('faturamento')}
              targetLabel={tLabel}
              area="comercial"
              icon={DollarSign}
            />
            <KpiCard
              title="Cash Collect"
              value={kpi.cashCollect}
              format="currency"
              target={periodTarget('cash_collect')}
              targetLabel={tLabel}
              area="comercial"
              icon={DollarSign}
            />
            <KpiCard
              title="Vendas"
              value={kpi.vendas}
              target={periodTarget('vendas')}
              targetLabel={tLabel}
              area="comercial"
              icon={ShoppingCart}
            />
            <KpiCard
              title="Agendamentos"
              value={kpi.agendamentos}
              target={periodTarget('agendamentos')}
              targetLabel={tLabel}
              area="comercial"
              icon={Calendar}
            />
            <KpiCard
              title="Calls Realizadas"
              value={kpi.callsRealizadas}
              target={periodTarget('calls')}
              targetLabel={tLabel}
              area="comercial"
              icon={PhoneCall}
            />
            <KpiCard
              title="Capturados"
              value={kpi.capturados}
              target={periodTarget('capturados')}
              targetLabel={tLabel}
              area="comercial"
              icon={Users}
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
          <ComercialEvolutionCharts data={chartData} />
        )}
      </section>

      {/* Ranking de Vendas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-label-sm uppercase tracking-widest text-outline">◆ Ranking de Vendas</p>
          <Tabs tabs={ROLE_TABS} active={roleTab} onChange={setRoleTab} />
        </div>
        <Card variant="elevated">
          <div className="p-4">
            {loading
              ? <Skeleton variant="card" />
              : <SalesRankingChart entries={ranking} />}
          </div>
        </Card>
      </section>

    </div>
  );
}
