'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DailyReport, Profile } from '@/types/database';
import { eachDayOfInterval, format, startOfMonth, endOfMonth } from 'date-fns';

export interface ReportRow extends DailyReport {
  profile: Profile;
}

// One aggregated data point per day for charts
export interface ComercialDayPoint {
  date: string;        // 'dd/MM'
  faturamento: number;
  vendas: number;
  agendamentos: number;
  capturados: number;
  callsRealizadas: number;
  cashCollect: number;
}

export interface ProdutoDayPoint {
  date: string;
  atendimentos: number;
  resolvidos: number;
  tmr: number;         // hours, avg
  bloqueios: number;
  taxaResolucao: number; // %
}

function buildComercialPoint(reports: ReportRow[], dateLabel: string): ComercialDayPoint {
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
  return { date: dateLabel, faturamento, vendas, agendamentos, capturados, callsRealizadas, cashCollect };
}

function buildProdutoPoint(reports: ReportRow[], dateLabel: string): ProdutoDayPoint {
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
  const tmr = tmrCount > 0 ? Math.round((tmrSum / tmrCount) * 10) / 10 : 0;
  const taxaResolucao = atendimentos > 0 ? Math.round((resolvidos / atendimentos) * 100) : 0;
  return { date: dateLabel, atendimentos, resolvidos, tmr, bloqueios, taxaResolucao };
}

export function useMonthReports(month: string) {
  // month format: 'yyyy-MM'
  const [comercialPoints, setComercialPoints] = useState<ComercialDayPoint[]>([]);
  const [produtoPoints, setProdutoPoints] = useState<ProdutoDayPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const [year, m] = month.split('-').map(Number);
    const start = startOfMonth(new Date(year, m - 1, 1));
    const end = endOfMonth(start);
    const today = new Date();
    const effectiveEnd = end > today ? today : end;

    const startStr = format(start, 'yyyy-MM-dd');
    const endStr = format(effectiveEnd, 'yyyy-MM-dd');

    const [{ data: allProfiles }, { data: allReports }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase
        .from('daily_reports')
        .select('*')
        .gte('report_date', startStr)
        .lte('report_date', endStr)
        .order('report_date'),
    ]);

    const profs = allProfiles ?? [];
    const reports: ReportRow[] = (allReports ?? []).map((r) => ({
      ...r,
      profile: profs.find((p) => p.id === r.user_id) as Profile,
    }));

    // Build per-day points
    const days = eachDayOfInterval({ start, end: effectiveEnd });

    const comercial: ComercialDayPoint[] = days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dateLabel = format(day, 'dd/MM');
      const dayReports = reports.filter((r) => r.report_date === dateStr);
      return buildComercialPoint(dayReports, dateLabel);
    });

    const produto: ProdutoDayPoint[] = days.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dateLabel = format(day, 'dd/MM');
      const dayReports = reports.filter((r) => r.report_date === dateStr);
      return buildProdutoPoint(dayReports, dateLabel);
    });

    setComercialPoints(comercial);
    setProdutoPoints(produto);
    setLoading(false);
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { comercialPoints, produtoPoints, loading };
}
