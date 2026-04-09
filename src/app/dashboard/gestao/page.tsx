'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Edit2, Check, X, Target } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useMonthlyGoals } from '@/hooks/useMonthlyGoals';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { getCurrentMonth, getMonthLabel, formatCurrency } from '@/lib/utils';

type Area = 'produto' | 'comercial' | 'geral';

interface GoalForm {
  area: Area;
  metric: string;
  target: string;
}

const METRIC_OPTIONS: Record<Area, { value: string; label: string; format: 'number' | 'currency' }[]> = {
  comercial: [
    { value: 'faturamento', label: 'Faturamento', format: 'currency' },
    { value: 'vendas', label: 'Vendas', format: 'number' },
    { value: 'agendamentos', label: 'Agendamentos', format: 'number' },
    { value: 'capturados', label: 'Contatos Capturados', format: 'number' },
    { value: 'cash_collect', label: 'Cash Collect', format: 'currency' },
  ],
  produto: [
    { value: 'atendimentos', label: 'Atendimentos', format: 'number' },
    { value: 'resolvidos', label: 'Resolvidos', format: 'number' },
    { value: 'tmr_horas', label: 'TMR Meta (horas)', format: 'number' },
    { value: 'taxa_resolucao', label: 'Taxa de Resolução (%)', format: 'number' },
  ],
  geral: [
    { value: 'dias_uteis', label: 'Dias Úteis no Mês', format: 'number' },
  ],
};

const AREA_LABELS: Record<Area, string> = {
  comercial: 'Comercial',
  produto: 'Produto',
  geral: 'Geral',
};

const AREA_COLORS: Record<Area, string> = {
  comercial: '#755b00',
  produto: '#406181',
  geral: '#476647',
};

const emptyForm: GoalForm = { area: 'comercial', metric: '', target: '' };

export default function GestaoPage() {
  const router = useRouter();
  const { profile, loading: profileLoading, isGestor } = useProfile();
  const { toast } = useToast();
  const month = getCurrentMonth();
  const { goals, loading: goalsLoading, upsertGoal, deleteGoal } = useMonthlyGoals(month);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<GoalForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');

  useEffect(() => {
    if (!profileLoading && !isGestor) router.replace('/dashboard');
  }, [profileLoading, isGestor, router]);

  if (profileLoading || goalsLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton variant="text" width="200px" className="h-6" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!isGestor) return null;

  function getMetricInfo(area: Area, metric: string) {
    return METRIC_OPTIONS[area]?.find((m) => m.value === metric);
  }

  function formatTarget(area: Area, metric: string, target: number) {
    const info = getMetricInfo(area, metric);
    if (info?.format === 'currency') return formatCurrency(target);
    return target.toLocaleString('pt-BR');
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!form.metric || !form.target) return;

    const target = parseFloat(form.target.replace(',', '.'));
    if (isNaN(target) || target <= 0) {
      toast('Valor da meta inválido.', 'error');
      return;
    }

    setSaving(true);
    const { error } = await upsertGoal({
      month,
      area: form.area,
      metric: form.metric,
      target,
      updated_by: profile!.id,
    });

    if (error) {
      toast('Erro ao salvar meta.', 'error');
    } else {
      toast('Meta salva!', 'success');
      setForm(emptyForm);
      setShowForm(false);
    }
    setSaving(false);
  }

  async function handleInlineEdit(goalId: string) {
    const target = parseFloat(editTarget.replace(',', '.'));
    if (isNaN(target) || target <= 0) {
      toast('Valor inválido.', 'error');
      return;
    }

    const goal = goals.find((g) => g.id === goalId);
    if (!goal) return;

    setSaving(true);
    const { error } = await upsertGoal({
      month,
      area: goal.area,
      metric: goal.metric,
      target,
      updated_by: profile!.id,
    });

    if (error) {
      toast('Erro ao atualizar meta.', 'error');
    } else {
      toast('Meta atualizada!', 'success');
      setEditingId(null);
    }
    setSaving(false);
  }

  async function handleDelete(goalId: string) {
    if (!confirm('Remover esta meta?')) return;
    const { error } = await deleteGoal(goalId);
    if (error) {
      toast('Erro ao remover meta.', 'error');
    } else {
      toast('Meta removida.', 'info');
    }
  }

  // Group goals by area
  const goalsByArea = (['comercial', 'produto', 'geral'] as Area[]).map((area) => ({
    area,
    goals: goals.filter((g) => g.area === area),
  })).filter((g) => g.goals.length > 0);

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-label-sm uppercase tracking-widest text-outline">◆ Gestão</p>
          <h1 className="text-headline-md text-on-surface font-serif mt-0.5">Metas do Mês</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">{getMonthLabel(month)}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(emptyForm); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition"
          style={{ backgroundColor: '#755b00', color: '#ffffff' }}
        >
          <Plus size={16} />
          Nova meta
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-surface rounded-xl border border-outline-variant p-5 space-y-4">
          <p className="text-sm font-semibold text-on-surface">Nova Meta</p>
          <form onSubmit={handleAddGoal} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Área</label>
                <select
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value as Area, metric: '' })}
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white text-on-surface"
                >
                  {(['comercial', 'produto', 'geral'] as Area[]).map((a) => (
                    <option key={a} value={a}>{AREA_LABELS[a]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Métrica</label>
                <select
                  value={form.metric}
                  onChange={(e) => setForm({ ...form, metric: e.target.value })}
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white text-on-surface"
                  required
                >
                  <option value="">Selecione...</option>
                  {METRIC_OPTIONS[form.area].map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1">Meta</label>
                <input
                  type="text"
                  value={form.target}
                  onChange={(e) => setForm({ ...form, target: e.target.value })}
                  className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm text-on-surface"
                  placeholder="Ex: 50000"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#755b00' }}
              >
                {saving ? 'Salvando...' : 'Salvar meta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Goals by area */}
      {goalsByArea.length === 0 ? (
        <div className="text-center py-16 text-on-surface-variant">
          <Target size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhuma meta definida para {getMonthLabel(month)}.</p>
          <p className="text-xs text-outline mt-1">Clique em "Nova meta" para começar.</p>
        </div>
      ) : (
        goalsByArea.map(({ area, goals: areaGoals }) => (
          <div key={area} className="bg-surface rounded-xl border border-outline-variant overflow-hidden">
            {/* Area header */}
            <div
              className="px-5 py-3 flex items-center gap-2"
              style={{ borderLeft: `3px solid ${AREA_COLORS[area]}`, backgroundColor: `${AREA_COLORS[area]}0a` }}
            >
              <p className="text-sm font-semibold" style={{ color: AREA_COLORS[area] }}>
                {AREA_LABELS[area]}
              </p>
              <span className="text-xs text-outline">({areaGoals.length} {areaGoals.length === 1 ? 'meta' : 'metas'})</span>
            </div>

            {/* Goals table */}
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-outline">Métrica</th>
                  <th className="text-right px-5 py-2.5 text-xs font-medium text-outline">Meta</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {areaGoals.map((goal, i) => {
                  const metricInfo = getMetricInfo(goal.area as Area, goal.metric);
                  const isEditing = editingId === goal.id;
                  return (
                    <tr
                      key={goal.id}
                      className="border-b border-outline-variant last:border-0 hover:bg-surface-low transition"
                    >
                      <td className="px-5 py-3 text-sm text-on-surface">
                        {metricInfo?.label ?? goal.metric}
                      </td>
                      <td className="px-5 py-3 text-right">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editTarget}
                            onChange={(e) => setEditTarget(e.target.value)}
                            className="border border-outline-variant rounded px-2 py-1 text-sm text-right w-32 text-on-surface"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleInlineEdit(goal.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                        ) : (
                          <span className="text-sm font-semibold text-on-surface">
                            {formatTarget(goal.area as Area, goal.metric, goal.target)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {isEditing ? (
                            <>
                              <button
                                onClick={() => handleInlineEdit(goal.id)}
                                disabled={saving}
                                className="p-1 rounded hover:bg-surface-container transition"
                                title="Salvar"
                              >
                                <Check size={15} style={{ color: '#476647' }} />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1 rounded hover:bg-surface-container transition"
                                title="Cancelar"
                              >
                                <X size={15} style={{ color: '#7e7665' }} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => {
                                  setEditingId(goal.id);
                                  setEditTarget(String(goal.target));
                                }}
                                className="p-1 rounded hover:bg-surface-container transition"
                                title="Editar"
                              >
                                <Edit2 size={15} style={{ color: '#7e7665' }} />
                              </button>
                              <button
                                onClick={() => handleDelete(goal.id)}
                                className="p-1 rounded hover:bg-error-container transition"
                                title="Remover"
                              >
                                <Trash2 size={15} style={{ color: '#ba1a1a' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
