'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign, ShoppingCart, Calendar, Users, PhoneCall,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { ComercialEvolutionCharts } from '@/components/charts/ComercialCharts';
import { SalesRankingChart } from '@/components/charts/SalesRankingChart';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { type RankingEntry } from '@/components/dashboard/RankingList';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card } from '@/components/ui/Card';
import { useReportsByDate, type ReportRow } from '@/hooks/useReportsByDate';
import { createClient } from '@/lib/supabase/client';
import { useMonthReports } from '@/hooks/useMonthReports';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { getMissingPerDay, getCurrentMonth } from '@/lib/utils';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

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
  const filtered = reports.filter((r) => {
    if (r.area !== 'comercial') return false;
    if (roleFilter !== 'all') return r.role === roleFilter;
    return true;
  });
  return filtered
    .map((r) => {
      const d = r.data as Record<string, unknown>;
      let score = 0;
      const metrics: { label: string; value: string }[] = [];
      if (r.role === 'sdr') {
        const ag = (d.calls_agendadas as Record<string, number>) ?? {};
        const agTotal = (ag.vtl ?? 0) + (ag.flw ?? 0) + (ag.outros ?? 0);
        const cap = (d.contatos_capturados as Record<string, number>)?.total ?? 0;
        score = agTotal * 2 + cap;
        metrics.push({ label: 'Capturados', value: String(cap) });
        metrics.push({ label: 'Agendados', value: String(agTotal) });
      } else if (r.role === 'seller') {
        const ag = (d.calls_agendadas as Record<string, number>) ?? {};
        const agTotal = (ag.vtl ?? 0) + (ag.flw ?? 0);
        const cap = (d.contatos_capturados as Record<string, number>)?.total ?? 0;
        score = agTotal * 2 + cap + Number(d.cross ?? 0) * 3;
        metrics.push({ label: 'Capturados', value: String(cap) });
        metrics.push({ label: 'Agendados', value: String(agTotal) });
      } else if (r.role === 'closer') {
        const v = (d.vendas as Record<string, number>) ?? {};
        const vendas = (v.amht ?? 0) + (v.vtl ?? 0) + (v.flw ?? 0);
        const fat = Number(d.faturamento_dia ?? 0);
        score = vendas * 5 + fat / 1000;
        metrics.push({ label: 'Vendas', value: String(vendas) });
        metrics.push({ label: 'Fat.', value: `R$ ${(fat / 1000).toFixed(0)}k` });
      }
      return { profile: r.profile, score, metrics };
    })
    .sort((a, b) => b.score - a.score);
}

// ── Date nav helper ───────────────────────────────────────────
function DateNav({
  date, onChange,
}: { date: string; onChange: (d: string) => void }) {
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
            color: isToday ? '#755b00' : '#1d1c17',
            backgroundColor: isToday ? '#c9a84c15' : 'white',
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

// ── Main Page ─────────────────────────────────────────────────
export default function ComercialPage() {
  const [roleTab, setRoleTab] = useState('all');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const month = getCurrentMonth();

  const { reports, profiles, loading, error, silentRefresh } = useReportsByDate(selectedDate);
  const { goals } = useMonthlyGoals(month);
  const { comercialPoints, loading: chartLoading } = useMonthReports(month);
  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd');

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

  function getGoal(metric: string) {
    return goals.find((g) => g.area === 'comercial' && g.metric === metric)?.target;
  }

  const ranking = buildRanking(comercialReports, roleTab);

  // Chart data — filter out future days with zero data
  const chartData = comercialPoints.filter((p) =>
    p.faturamento > 0 || p.vendas > 0 || p.agendamentos > 0 || p.capturados > 0 || p.callsRealizadas > 0
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
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} variant="card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <KpiCard
              title="Faturamento"
              value={kpi.faturamento}
              format="currency"
              target={getGoal('faturamento')}
              missingPerDay={getGoal('faturamento') ? getMissingPerDay(kpi.faturamento, getGoal('faturamento')!) : undefined}
              area="comercial"
              icon={DollarSign}
            />
            <KpiCard
              title="Cash Collect"
              value={kpi.cashCollect}
              format="currency"
              area="comercial"
              icon={DollarSign}
            />
            <KpiCard
              title="Vendas"
              value={kpi.vendas}
              target={getGoal('vendas')}
              missingPerDay={getGoal('vendas') ? getMissingPerDay(kpi.vendas, getGoal('vendas')!) : undefined}
              area="comercial"
              icon={ShoppingCart}
            />
            <KpiCard
              title="Agendamentos"
              value={kpi.agendamentos}
              target={getGoal('agendamentos')}
              missingPerDay={getGoal('agendamentos') ? getMissingPerDay(kpi.agendamentos, getGoal('agendamentos')!) : undefined}
              area="comercial"
              icon={Calendar}
            />
            <KpiCard
              title="Calls Realizadas"
              value={kpi.callsRealizadas}
              area="comercial"
              icon={PhoneCall}
            />
            <KpiCard
              title="Capturados"
              value={kpi.capturados}
              target={getGoal('capturados')}
              missingPerDay={getGoal('capturados') ? getMissingPerDay(kpi.capturados, getGoal('capturados')!) : undefined}
              area="comercial"
              icon={Users}
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
