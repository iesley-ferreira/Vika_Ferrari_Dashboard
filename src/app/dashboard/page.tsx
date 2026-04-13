'use client';

import { useEffect, useState } from 'react';
import {
  DollarSign, ShoppingCart, Calendar, Users, PhoneCall,
} from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { TeamStatusTable } from '@/components/dashboard/TeamStatusTable';
import { Tabs } from '@/components/ui/Tabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { ReportViewer } from '@/components/dashboard/ReportViewer';
import { DateRangePicker, type DateRange } from '@/components/ui/DateRangePicker';
import { useReportsByDateRange, type ReportRow } from '@/hooks/useReportsByDateRange';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';
import { getMissingPerDay, getCurrentMonth } from '@/lib/utils';
import type { DonutSlice } from '@/components/charts/MiniDonutChart';
import { format } from 'date-fns';

const FILTER_TABS = [
  { key: 'all', label: 'Todos' },
  { key: 'produto', label: 'Produto' },
  { key: 'comercial', label: 'Comercial' },
];

// ── Aggregations ──────────────────────────────────────────────
function aggregateComercial(reports: ReportRow[]) {
  let faturamento = 0, vendas = 0, agendamentos = 0, capturados = 0, callsRealizadas = 0;
  for (const r of reports) {
    if (r.area !== 'comercial') continue;
    const d = r.data as Record<string, unknown>;
    if (r.role === 'closer') {
      faturamento += Number(d.faturamento_dia ?? 0);
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
  return { faturamento, vendas, agendamentos, capturados, callsRealizadas };
}

function aggregateProduto(reports: ReportRow[]) {
  let atendimentos = 0, resolvidos = 0, tmrSum = 0, tmrCount = 0, bloqueios = 0;
  for (const r of reports) {
    if (r.area !== 'produto') continue;
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
  return { atendimentos, resolvidos, tmrMedio, tmrSemaphore, bloqueios };
}

// ── Participação do usuário no donut — apenas para dia único ──
const DONUT_USER_COLOR = '#dc6788';
const DONUT_COMERCIAL_COLOR = '#eacc48';
const DONUT_PRODUTO_COLOR = '#6794dc';

function makeTwoSlice(
  userName: string,
  userValue: number,
  total: number,
  teamColor: string
): DonutSlice[] {
  const teamValue = Math.max(0, total - userValue);
  if (userValue <= 0 || teamValue <= 0) return [];
  return [
    { name: userName, value: userValue, color: DONUT_USER_COLOR },
    { name: 'Equipe', value: teamValue, color: teamColor },
  ];
}

function getUserComercialValues(reports: ReportRow[], userId: string) {
  const r = reports.find((rep) => rep.user_id === userId && rep.area === 'comercial');
  if (!r) return null;
  const d = r.data as Record<string, unknown>;
  if (r.role === 'closer') {
    const v = (d.vendas as Record<string, number>) ?? {};
    const ag = (d.calls_agendadas as Record<string, number>) ?? {};
    const re = (d.calls_realizadas as Record<string, number>) ?? {};
    return {
      faturamento: Number(d.faturamento_dia ?? 0),
      vendas: (v.amht ?? 0) + (v.vtl ?? 0) + (v.flw ?? 0),
      agendamentos: (ag.vtl ?? 0) + (ag.flw ?? 0) + (ag.amht ?? 0) + (ag.individual ?? 0),
      callsRealizadas: (re.vtl ?? 0) + (re.flw ?? 0) + (re.amht ?? 0) + (re.individual ?? 0),
      capturados: 0,
    };
  }
  if (r.role === 'sdr' || r.role === 'seller') {
    const ag = (d.calls_agendadas as Record<string, number>) ?? {};
    const cap = (d.contatos_capturados as Record<string, number>) ?? {};
    return {
      faturamento: 0, vendas: 0,
      agendamentos: (ag.vtl ?? 0) + (ag.flw ?? 0) + (ag.outros ?? 0) + (ag.amht ?? 0),
      callsRealizadas: 0,
      capturados: (cap.total ?? 0) as number,
    };
  }
  return null;
}

function getUserProdutoValues(reports: ReportRow[], userId: string) {
  const r = reports.find((rep) => rep.user_id === userId && rep.area === 'produto');
  if (!r) return null;
  const d = r.data as Record<string, unknown>;
  return {
    atendimentos: Number(d.atendimentos_total ?? 0),
    resolvidos: Number(d.resolvidos_total ?? 0),
    bloqueios: Number(d.nao_sei_o_que_fazer ?? 0) + Number(d.falta_clareza_qtd ?? 0),
  };
}

// ── Main ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [filterTab, setFilterTab] = useState('all');
  const [viewReport, setViewReport] = useState<ReportRow | null>(null);
  const [range, setRange] = useState<DateRange>({ startDate: today, endDate: today });
  const { profile, isGestor } = useProfile();

  const { reports, profiles, loading, error, silentRefresh } = useReportsByDateRange(
    range.startDate,
    range.endDate
  );
  const { goals } = useMonthlyGoals(getCurrentMonth());

  const isSingleDay = range.startDate === range.endDate;
  const isToday = range.endDate === today && range.startDate === today;

  // Realtime: only when viewing today
  useEffect(() => {
    if (!isToday) return;
    const supabase = createClient();
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'daily_reports' }, () => silentRefresh())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'daily_reports' }, () => silentRefresh())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isToday, silentRefresh]);

  const comercial = aggregateComercial(reports);
  const produto = aggregateProduto(reports);

  const userArea = profile?.area;
  const userName = profile?.full_name?.split(' ')[0] ?? 'Você';

  // Donuts only make sense for a single day
  const noDonut = {
    faturamento: undefined as DonutSlice[] | undefined,
    vendas: undefined as DonutSlice[] | undefined,
    agendamentos: undefined as DonutSlice[] | undefined,
    calls: undefined as DonutSlice[] | undefined,
    capturados: undefined as DonutSlice[] | undefined,
  };
  const comercialDonuts = (() => {
    if (!isSingleDay || userArea !== 'comercial' || !profile) return noDonut;
    const uv = getUserComercialValues(reports, profile.id);
    if (!uv) return noDonut;
    return {
      faturamento: makeTwoSlice(userName, uv.faturamento, comercial.faturamento, DONUT_COMERCIAL_COLOR),
      vendas: makeTwoSlice(userName, uv.vendas, comercial.vendas, DONUT_COMERCIAL_COLOR),
      agendamentos: makeTwoSlice(userName, uv.agendamentos, comercial.agendamentos, DONUT_COMERCIAL_COLOR),
      calls: makeTwoSlice(userName, uv.callsRealizadas, comercial.callsRealizadas, DONUT_COMERCIAL_COLOR),
      capturados: makeTwoSlice(userName, uv.capturados, comercial.capturados, DONUT_COMERCIAL_COLOR),
    };
  })();

  const noProdutoDonut = {
    atendimentos: undefined as DonutSlice[] | undefined,
    resolvidos: undefined as DonutSlice[] | undefined,
    bloqueios: undefined as DonutSlice[] | undefined,
  };
  const produtoDonuts = (() => {
    if (!isSingleDay || userArea !== 'produto' || !profile) return noProdutoDonut;
    const uv = getUserProdutoValues(reports, profile.id);
    if (!uv) return noProdutoDonut;
    return {
      atendimentos: makeTwoSlice(userName, uv.atendimentos, produto.atendimentos, DONUT_PRODUTO_COLOR),
      resolvidos: makeTwoSlice(userName, uv.resolvidos, produto.resolvidos, DONUT_PRODUTO_COLOR),
      bloqueios: makeTwoSlice(userName, uv.bloqueios, produto.bloqueios, DONUT_PRODUTO_COLOR),
    };
  })();

  function getGoal(area: string, metric: string) {
    return goals.find((g) => g.area === area && g.metric === metric)?.target;
  }

  return (
    <div className="space-y-8">
      {/* Date range picker */}
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

      {/* KPIs Comercial */}
      <section>
        <p className="text-label-sm uppercase tracking-widest text-outline mb-3">
          ◆ Performance Comercial
        </p>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} variant="card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard
              title="Faturamento"
              value={comercial.faturamento}
              format="currency"
              target={isSingleDay ? getGoal('comercial', 'faturamento') : undefined}
              missingPerDay={isSingleDay && getGoal('comercial', 'faturamento')
                ? getMissingPerDay(comercial.faturamento, getGoal('comercial', 'faturamento')!)
                : undefined}
              area="comercial"
              icon={DollarSign}
              donutData={comercialDonuts.faturamento}
            />
            <KpiCard
              title="Vendas"
              value={comercial.vendas}
              target={isSingleDay ? getGoal('comercial', 'vendas') : undefined}
              missingPerDay={isSingleDay && getGoal('comercial', 'vendas')
                ? getMissingPerDay(comercial.vendas, getGoal('comercial', 'vendas')!)
                : undefined}
              area="comercial"
              icon={ShoppingCart}
              donutData={comercialDonuts.vendas}
            />
            <KpiCard
              title="Agendamentos"
              value={comercial.agendamentos}
              target={isSingleDay ? getGoal('comercial', 'agendamentos') : undefined}
              missingPerDay={isSingleDay && getGoal('comercial', 'agendamentos')
                ? getMissingPerDay(comercial.agendamentos, getGoal('comercial', 'agendamentos')!)
                : undefined}
              area="comercial"
              icon={Calendar}
              donutData={comercialDonuts.agendamentos}
            />
            <KpiCard
              title="Calls Realizadas"
              value={comercial.callsRealizadas}
              area="comercial"
              icon={PhoneCall}
              donutData={comercialDonuts.calls}
            />
            <KpiCard
              title="Capturados"
              value={comercial.capturados}
              target={isSingleDay ? getGoal('comercial', 'capturados') : undefined}
              missingPerDay={isSingleDay && getGoal('comercial', 'capturados')
                ? getMissingPerDay(comercial.capturados, getGoal('comercial', 'capturados')!)
                : undefined}
              area="comercial"
              icon={Users}
              donutData={comercialDonuts.capturados}
            />
          </div>
        )}
      </section>

      {/* KPIs Produto */}
      <section>
        <p className="text-label-sm uppercase tracking-widest text-outline mb-3">
          ◆ Performance Produto
        </p>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} variant="card" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard title="Atendimentos" value={produto.atendimentos} area="produto" donutData={produtoDonuts.atendimentos} />
            <KpiCard title="Resolvidos" value={produto.resolvidos} area="produto" donutData={produtoDonuts.resolvidos} />
            <KpiCard
              title="TMR Médio"
              value={produto.tmrMedio}
              format="time"
              area="produto"
              semaphore={produto.tmrSemaphore}
            />
            <KpiCard title="Bloqueios" value={produto.bloqueios} area="produto" donutData={produtoDonuts.bloqueios} />
          </div>
        )}
      </section>

      {/* Status da Equipe */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="text-label-sm uppercase tracking-widest text-outline">◆ Status da Equipe</p>
          <Tabs tabs={FILTER_TABS} active={filterTab} onChange={setFilterTab} />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <Skeleton key={i} variant="text" height="48px" className="rounded-md" />)}
          </div>
        ) : (
          <TeamStatusTable
            allProfiles={profiles}
            reports={reports}
            filter={filterTab as 'all' | 'produto' | 'comercial'}
            isGestor={isGestor}
            onView={setViewReport}
          />
        )}
      </section>

      {/* Report View Modal */}
      <Modal
        open={!!viewReport}
        onClose={() => setViewReport(null)}
        title={`Relatório — ${viewReport?.profile?.full_name ?? ''}`}
      >
        {viewReport && (
          <ReportViewer role={viewReport.role} data={viewReport.data as Record<string, unknown>} />
        )}
      </Modal>
    </div>
  );
}
