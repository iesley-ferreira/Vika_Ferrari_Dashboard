'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Check, X, Target, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { MonthlyGoal } from '@/types/database';

type Area = 'produto' | 'comercial' | 'geral';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const METRIC_DEFS: Record<Area, { value: string; label: string; short: string; format: 'number' | 'currency' }[]> = {
  comercial: [
    { value: 'faturamento',  label: 'Faturamento',        short: 'Faturamento',   format: 'currency' },
    { value: 'cash_collect', label: 'Cash Collect',        short: 'Cash Collect',  format: 'currency' },
    { value: 'vendas',       label: 'Vendas',              short: 'Vendas',        format: 'number'   },
    { value: 'agendamentos', label: 'Agendamentos',        short: 'Agendamentos',  format: 'number'   },
    { value: 'capturados',   label: 'Contatos Capturados', short: 'Capturados',    format: 'number'   },
    { value: 'calls',        label: 'Calls Realizadas',    short: 'Calls',         format: 'number'   },
  ],
  produto: [
    { value: 'atendimentos',   label: 'Atendimentos',         short: 'Atend.',      format: 'number' },
    { value: 'resolvidos',     label: 'Resolvidos',           short: 'Resolvidos',  format: 'number' },
    { value: 'tmr_horas',      label: 'TMR Meta (horas)',     short: 'TMR (h)',     format: 'number' },
    { value: 'taxa_resolucao', label: 'Taxa de Resolução (%)',short: 'Taxa Res.',   format: 'number' },
  ],
  geral: [
    { value: 'vendas_mes',        label: 'Vendas por Mês',     short: 'Vendas/mês',    format: 'number' },
    { value: 'calls_agendadas',   label: 'Calls Agendadas',    short: 'Calls Agend.',  format: 'number' },
    { value: 'calls_realizadas',  label: 'Calls Realizadas',   short: 'Calls Real.',   format: 'number' },
    { value: 'dias_uteis',        label: 'Dias Úteis',         short: 'Dias Úteis',    format: 'number' },
  ],
};

const AREA_LABELS: Record<Area, string> = { comercial: 'Comercial', produto: 'Produto', geral: 'Geral' };
const AREA_COLORS: Record<Area, string> = { comercial: '#755b00', produto: '#406181', geral: '#476647' };

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

function getMonthKey(year: number, monthIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`;
}

function formatVal(format: 'number' | 'currency', v: number): string {
  return format === 'currency' ? formatCurrency(v) : v.toLocaleString('pt-BR');
}

interface AddForm {
  monthIdx: number;
  area: Area;
  metric: string;
  target: string;
}

export default function GestaoPage() {
  const router = useRouter();
  const { profile, loading: profileLoading, isGestor } = useProfile();
  const { toast } = useToast();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth();

  const [year, setYear] = useState(currentYear);
  const [activeArea, setActiveArea] = useState<Area>('comercial');
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Inline cell editing: cellKey = `${monthKey}:${metric}`
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Add goal modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState<AddForm>({
    monthIdx: currentMonthIdx,
    area: 'comercial',
    metric: '',
    target: '',
  });

  useEffect(() => {
    if (!profileLoading && !isGestor) router.replace('/dashboard');
  }, [profileLoading, isGestor, router]);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('monthly_goals')
      .select('*')
      .gte('month', `${year}-01`)
      .lte('month', `${year}-12`);
    setGoals(data ?? []);
    setLoading(false);
  }, [year]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function upsertGoal(monthKey: string, area: Area, metric: string, target: number) {
    const supabase = createClient();
    const { error } = await supabase
      .from('monthly_goals')
      .upsert(
        { month: monthKey, area, metric, target, updated_by: profile!.id },
        { onConflict: 'month,area,metric' },
      );
    if (!error) await fetchGoals();
    return error;
  }

  async function handleCellSave(monthKey: string, metric: string, area: Area) {
    const v = parseFloat(editValue.replace(',', '.'));
    if (isNaN(v) || v < 0) { toast('Valor inválido.', 'error'); return; }
    setSaving(true);
    const error = await upsertGoal(monthKey, area, metric, v);
    if (error) toast('Erro ao salvar.', 'error');
    else toast('Meta salva!', 'success');
    setEditingCell(null);
    setSaving(false);
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(addForm.target.replace(',', '.'));
    if (!addForm.metric || isNaN(v) || v <= 0) {
      toast('Preencha todos os campos corretamente.', 'error');
      return;
    }
    setSaving(true);
    const monthKey = getMonthKey(year, addForm.monthIdx);
    const error = await upsertGoal(monthKey, addForm.area, addForm.metric, v);
    if (error) toast('Erro ao salvar.', 'error');
    else { toast('Meta salva!', 'success'); setShowAddModal(false); }
    setSaving(false);
  }

  function openAddModal(monthIdx: number, prefillMetric = '') {
    setAddForm({ monthIdx, area: activeArea, metric: prefillMetric, target: '' });
    setShowAddModal(true);
  }

  if (profileLoading || loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton variant="text" width="200px" className="h-6" />
        <Skeleton variant="card" className="h-96" />
      </div>
    );
  }

  if (!isGestor) return null;

  const metrics = METRIC_DEFS[activeArea];

  // Build goal lookup: `${monthKey}:${area}:${metric}` → goal
  const goalMap = new Map<string, MonthlyGoal>();
  goals.forEach((g) => goalMap.set(`${g.month}:${g.area}:${g.metric}`, g));

  // Quarter column totals (sum for area's metrics)
  function quarterTotal(qi: number, metricValue: string, format: 'number' | 'currency'): string | null {
    const months = [0, 1, 2].map((mi) => qi * 3 + mi);
    let sum = 0;
    let hasAny = false;
    months.forEach((monthIdx) => {
      const goal = goalMap.get(`${getMonthKey(year, monthIdx)}:${activeArea}:${metricValue}`);
      if (goal) { sum += goal.target; hasAny = true; }
    });
    if (!hasAny) return null;
    return formatVal(format, sum);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-widest text-outline">◆ Gestão</p>
          <h1 className="text-headline-md text-on-surface font-serif mt-0.5">Planejamento de Metas</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Gerencie as metas mensais por área para todo o ano
          </p>
        </div>
        <button
          onClick={() => openAddModal(currentMonthIdx)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: AREA_COLORS[activeArea], color: '#ffffff' }}
        >
          <Plus size={16} />
          Nova meta
        </button>
      </div>

      {/* Year nav + Area tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Year navigation */}
        <div className="flex items-center gap-1 bg-surface-container rounded-lg px-1 py-1">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1.5 rounded hover:bg-surface transition"
          >
            <ChevronLeft size={16} className="text-on-surface-variant" />
          </button>
          <span className="text-sm font-bold text-on-surface w-12 text-center">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            className="p-1.5 rounded hover:bg-surface transition"
          >
            <ChevronRight size={16} className="text-on-surface-variant" />
          </button>
        </div>

        {/* Area tabs */}
        <div className="flex gap-1 bg-surface-container rounded-lg p-1">
          {(['comercial', 'produto', 'geral'] as Area[]).map((a) => (
            <button
              key={a}
              onClick={() => setActiveArea(a)}
              className="px-4 py-1.5 rounded text-sm font-medium transition"
              style={
                activeArea === a
                  ? { backgroundColor: AREA_COLORS[a], color: '#fff' }
                  : { color: '#7e7665' }
              }
            >
              {AREA_LABELS[a]}
            </button>
          ))}
        </div>
      </div>

      {/* Annual goals table */}
      <div className="bg-surface rounded-xl border border-outline-variant overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container/40">
              <th className="text-left px-4 py-3 text-xs font-semibold text-outline w-12">Tri.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-outline w-32">Mês</th>
              {metrics.map((m) => (
                <th key={m.value} className="text-right px-4 py-3 text-xs font-semibold text-outline whitespace-nowrap">
                  {m.short}
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {QUARTERS.flatMap((q, qi) => {
              const rows = [0, 1, 2].map((mi) => {
                const monthIdx = qi * 3 + mi;
                const monthKey = getMonthKey(year, monthIdx);
                const isCurrentMonth = year === currentYear && monthIdx === currentMonthIdx;
                const isPast = year < currentYear || (year === currentYear && monthIdx < currentMonthIdx);

                return (
                  <tr
                    key={monthKey}
                    className={`border-b border-outline-variant transition ${
                      isCurrentMonth
                        ? 'bg-amber-50/60'
                        : isPast
                        ? 'opacity-70 hover:opacity-100 hover:bg-surface-low'
                        : 'hover:bg-surface-low'
                    }`}
                  >
                    {/* Quarter label — only first row */}
                    <td className="px-4 py-3 text-xs font-bold text-outline align-middle whitespace-nowrap">
                      {mi === 0 ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded text-xs font-bold"
                          style={{ backgroundColor: `${AREA_COLORS[activeArea]}18`, color: AREA_COLORS[activeArea] }}
                        >
                          {q}
                        </span>
                      ) : null}
                    </td>

                    {/* Month name */}
                    <td className="px-4 py-3 text-sm text-on-surface whitespace-nowrap">
                      <span className={isCurrentMonth ? 'font-bold' : ''}>
                        {MONTH_NAMES[monthIdx]}
                      </span>
                      {isCurrentMonth && (
                        <span className="ml-2 text-xs px-1.5 py-0.5 rounded-full" style={{ backgroundColor: `${AREA_COLORS[activeArea]}22`, color: AREA_COLORS[activeArea] }}>
                          atual
                        </span>
                      )}
                    </td>

                    {/* Metric cells */}
                    {metrics.map((m) => {
                      const goal = goalMap.get(`${monthKey}:${activeArea}:${m.value}`);
                      const cellKey = `${monthKey}:${m.value}`;
                      const isEditing = editingCell === cellKey;

                      return (
                        <td key={m.value} className="px-4 py-3 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="border border-outline-variant rounded px-2 py-1 text-sm text-right w-28 text-on-surface bg-white"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleCellSave(monthKey, m.value, activeArea);
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                              />
                              <button
                                onClick={() => handleCellSave(monthKey, m.value, activeArea)}
                                disabled={saving}
                                className="p-1 rounded hover:bg-surface-container transition"
                                title="Salvar"
                              >
                                <Check size={14} style={{ color: '#476647' }} />
                              </button>
                              <button
                                onClick={() => setEditingCell(null)}
                                className="p-1 rounded hover:bg-surface-container transition"
                                title="Cancelar"
                              >
                                <X size={14} style={{ color: '#7e7665' }} />
                              </button>
                            </div>
                          ) : goal ? (
                            <button
                              onClick={() => { setEditingCell(cellKey); setEditValue(String(goal.target)); }}
                              className="text-sm font-semibold text-on-surface hover:underline transition cursor-pointer"
                              title="Clique para editar"
                            >
                              {formatVal(m.format, goal.target)}
                            </button>
                          ) : (
                            <button
                              onClick={() => openAddModal(monthIdx, m.value)}
                              className="text-sm text-outline hover:text-on-surface transition opacity-30 hover:opacity-70"
                              title="Clique para adicionar"
                            >
                              —
                            </button>
                          )}
                        </td>
                      );
                    })}

                    {/* Row add button */}
                    <td className="px-2 py-3">
                      <button
                        onClick={() => openAddModal(monthIdx)}
                        className="p-1 rounded hover:bg-surface-container transition opacity-0 group-hover:opacity-100"
                        title={`Adicionar meta para ${MONTH_NAMES[monthIdx]}`}
                      >
                        <Plus size={13} style={{ color: '#7e7665' }} />
                      </button>
                    </td>
                  </tr>
                );
              });

              // Quarter subtotal row
              const subtotalRow = (
                <tr key={`${q}-total`} className="border-b-2 border-outline-variant bg-surface-container/30">
                  <td className="px-4 py-2 text-xs font-semibold text-outline">Total {q}</td>
                  <td className="px-4 py-2" />
                  {metrics.map((m) => {
                    const total = quarterTotal(qi, m.value, m.format);
                    return (
                      <td key={m.value} className="px-4 py-2 text-right text-xs font-semibold text-on-surface-variant">
                        {total ?? <span className="opacity-30">—</span>}
                      </td>
                    );
                  })}
                  <td />
                </tr>
              );

              return [...rows, subtotalRow];
            })}

            {/* Annual total row */}
            <tr className="bg-surface-container/60">
              <td className="px-4 py-3 text-xs font-bold text-on-surface" colSpan={2}>
                Total {year}
              </td>
              {metrics.map((m) => {
                let sum = 0;
                let hasAny = false;
                for (let i = 0; i < 12; i++) {
                  const g = goalMap.get(`${getMonthKey(year, i)}:${activeArea}:${m.value}`);
                  if (g) { sum += g.target; hasAny = true; }
                }
                return (
                  <td key={m.value} className="px-4 py-3 text-right text-sm font-bold text-on-surface">
                    {hasAny ? formatVal(m.format, sum) : <span className="opacity-30 font-normal text-xs">—</span>}
                  </td>
                );
              })}
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Empty state */}
      {goals.filter((g) => g.area === activeArea).length === 0 && (
        <div className="text-center py-8 text-on-surface-variant">
          <Target size={32} className="mx-auto mb-2 opacity-25" />
          <p className="text-sm">Nenhuma meta de {AREA_LABELS[activeArea]} definida para {year}.</p>
          <p className="text-xs text-outline mt-1">Clique em "—" em qualquer célula ou em "Nova meta" para começar.</p>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-surface rounded-2xl border border-outline-variant p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <p className="text-base font-semibold text-on-surface">Nova Meta</p>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded hover:bg-surface-container transition">
                <X size={16} className="text-on-surface-variant" />
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Month */}
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Mês</label>
                  <select
                    value={addForm.monthIdx}
                    onChange={(e) => setAddForm({ ...addForm, monthIdx: Number(e.target.value) })}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white text-on-surface"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx}>{name} {year}</option>
                    ))}
                  </select>
                </div>

                {/* Area */}
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Área</label>
                  <select
                    value={addForm.area}
                    onChange={(e) => setAddForm({ ...addForm, area: e.target.value as Area, metric: '' })}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white text-on-surface"
                  >
                    {(['comercial', 'produto', 'geral'] as Area[]).map((a) => (
                      <option key={a} value={a}>{AREA_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Metric */}
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Métrica</label>
                  <select
                    value={addForm.metric}
                    onChange={(e) => setAddForm({ ...addForm, metric: e.target.value })}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white text-on-surface"
                    required
                  >
                    <option value="">Selecione...</option>
                    {METRIC_DEFS[addForm.area].map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Value */}
                <div>
                  <label className="block text-xs font-medium text-on-surface-variant mb-1">Valor da Meta</label>
                  <input
                    type="text"
                    value={addForm.target}
                    onChange={(e) => setAddForm({ ...addForm, target: e.target.value })}
                    className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface"
                    placeholder="Ex: 50000"
                    required
                  />
                </div>
              </div>

              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-on-surface-variant"
                style={{ backgroundColor: `${AREA_COLORS[addForm.area]}10` }}
              >
                <span style={{ color: AREA_COLORS[addForm.area] }}>●</span>
                <span>
                  {AREA_LABELS[addForm.area]} · {MONTH_NAMES[addForm.monthIdx]} {year}
                  {addForm.metric && ` · ${METRIC_DEFS[addForm.area].find((m) => m.value === addForm.metric)?.label}`}
                </span>
              </div>

              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                  style={{ backgroundColor: AREA_COLORS[addForm.area] }}
                >
                  {saving ? 'Salvando...' : 'Salvar meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
