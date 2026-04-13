'use client';

import { ReportViewer } from '@/components/dashboard/ReportViewer';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';
import { formatDate } from '@/lib/utils';
import type { DailyReport, Profile } from '@/types/database';
import { format } from 'date-fns';
import {
  CheckCircle2, Clock,
  RefreshCw, Search,
  Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type MemberWithReport = Profile & {
  lastReport: DailyReport | null;
  todayReport: DailyReport | null;
};

const AREA_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'produto', label: 'Produto' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'gestor', label: 'Gestores' },
];

const ROLE_OPTIONS: Record<string, { value: string; label: string }[]> = {
  produto: [
    { value: 'especialista', label: 'Especialista de Produto' },
    { value: 'gestora_produto', label: 'Gestora de Produto' },
  ],
  comercial: [
    { value: 'sdr', label: 'SDR' },
    { value: 'seller', label: 'Seller' },
    { value: 'closer', label: 'Closer' },
  ],
};

export default function EquipePage() {
  const router = useRouter();
  const { profile, loading: profileLoading, isGestor } = useProfile();
  const { toast } = useToast();

  const [members, setMembers] = useState<MemberWithReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [areaFilter, setAreaFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Promote modal
  const [promoteTarget, setPromoteTarget] = useState<MemberWithReport | null>(null);
  const [promoting, setPromoting] = useState(false);

  // Change role modal
  const [roleTarget, setRoleTarget] = useState<MemberWithReport | null>(null);
  const [newRole, setNewRole] = useState('');
  const [changingRole, setChangingRole] = useState(false);

  // View report modal
  const [viewReport, setViewReport] = useState<DailyReport | null>(null);
  const [viewMember, setViewMember] = useState<MemberWithReport | null>(null);

  useEffect(() => {
    if (!profileLoading && !isGestor) router.replace('/dashboard');
  }, [profileLoading, isGestor, router]);

  async function loadMembers() {
    setLoading(true);
    const supabase = createClient();
    const today = format(new Date(), 'yyyy-MM-dd');

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('full_name');

    if (!profiles) { setLoading(false); return; }

    // Get today's reports
    const { data: todayReports } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('report_date', today);

    // Get most recent report per user
    const { data: allReports } = await supabase
      .from('daily_reports')
      .select('*')
      .order('report_date', { ascending: false });

    const membersWithReports: MemberWithReport[] = profiles.map((p) => {
      const todayReport = todayReports?.find((r) => r.user_id === p.id) ?? null;
      const lastReport = allReports?.find((r) => r.user_id === p.id) ?? null;
      return { ...p, todayReport, lastReport };
    });

    setMembers(membersWithReports);
    setLoading(false);
  }

  useEffect(() => { loadMembers(); }, []);

  async function handlePromote() {
    if (!promoteTarget) return;
    setPromoting(true);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: promoteTarget.id,
        area: 'gestor',
        role: 'gestor',
      }),
    });

    if (!res.ok) {
      toast('Erro ao promover membro.', 'error');
    } else {
      toast(`${promoteTarget.full_name} promovido(a) a Gestor!`, 'success');
      setPromoteTarget(null);
      loadMembers();
    }
    setPromoting(false);
  }

  async function handleChangeRole() {
    if (!roleTarget || !newRole) return;
    setChangingRole(true);

    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: roleTarget.id,
        role: newRole,
      }),
    });

    if (!res.ok) {
      toast('Erro ao alterar função.', 'error');
    } else {
      toast('Função atualizada!', 'success');
      setRoleTarget(null);
      setNewRole('');
      loadMembers();
    }
    setChangingRole(false);
  }

  const filtered = members.filter((m) => {
    const matchArea = areaFilter === 'all' || m.area === areaFilter;
    const matchSearch = !search || m.full_name.toLowerCase().includes(search.toLowerCase());
    return matchArea && matchSearch;
  });

  if (profileLoading || loading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton variant="text" width="200px" className="h-6" />
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} variant="text" height="52px" className="rounded-lg" />
        ))}
      </div>
    );
  }

  if (!isGestor) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-label-sm uppercase tracking-widest text-outline">◆ Gestão</p>
        <h1 className="text-headline-md text-on-surface font-serif mt-0.5">Equipe</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          {members.length} {members.length === 1 ? 'membro' : 'membros'} cadastrados
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar membro..."
            className="border border-outline-variant rounded-md pl-9 pr-3 py-2 text-sm bg-white text-on-surface w-52"
          />
        </div>
        <div className="flex gap-1">
          {AREA_FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAreaFilter(opt.value)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
              style={{
                backgroundColor: areaFilter === opt.value ? '#755b00' : 'transparent',
                color: areaFilter === opt.value ? '#ffffff' : '#7e7665',
                border: `1px solid ${areaFilter === opt.value ? '#755b00' : '#d0c5b2'}`,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <button
          onClick={loadMembers}
          className="ml-auto p-2 rounded-lg hover:bg-surface-container transition text-outline"
          title="Atualizar"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-md border border-outline-variant overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-low">
              <th className="text-left px-5 py-3 text-xs font-medium text-outline">Membro</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-outline">Área / Função</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-outline">Hoje</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-outline">Último relatório</th>
              <th className="text-right px-5 py-3 text-xs font-medium text-outline">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-sm text-on-surface-variant">
                  Nenhum membro encontrado.
                </td>
              </tr>
            ) : (
              filtered.map((member) => (
                <tr
                  key={member.id}
                  className="border-b border-outline-variant last:border-0 hover:bg-surface-low transition"
                >
                  {/* Name */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{
                          background: member.area === 'produto'
                            ? 'linear-gradient(135deg, #406181, #a8caee)'
                            : member.area === 'gestor'
                            ? 'linear-gradient(135deg, #476647, #92b490)'
                            : 'linear-gradient(135deg, #755b00, #c9a84c)',
                        }}
                      >
                        {member.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-on-surface">{member.full_name}</span>
                    </div>
                  </td>

                  {/* Area + Role */}
                  <td className="px-4 py-4">
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge type="area" value={member.area} size="sm" />
                      <Badge type="role" value={member.role} size="sm" />
                    </div>
                  </td>

                  {/* Today status */}
                  <td className="px-4 py-4">
                    {member.area === 'gestor' ? (
                      <span className="text-xs text-outline">—</span>
                    ) : member.todayReport ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} style={{ color: '#476647' }} />
                        <span className="text-xs text-on-surface-variant">
                          {format(new Date(member.todayReport.submitted_at), 'HH:mm')}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} style={{ color: '#c9a84c' }} />
                        <span className="text-xs text-outline">Pendente</span>
                      </div>
                    )}
                  </td>

                  {/* Last report */}
                  <td className="px-4 py-4">
                    {member.lastReport ? (
                      <button
                        onClick={() => {
                          setViewReport(member.lastReport);
                          setViewMember(member);
                        }}
                        className="text-xs hover:underline"
                        style={{ color: '#755b00' }}
                      >
                        {formatDate(member.lastReport.report_date)}
                      </button>
                    ) : (
                      <span className="text-xs text-outline">Nenhum</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2 justify-end">
                      {member.area !== 'gestor' && (
                        <>
                          <button
                            onClick={() => {
                              setRoleTarget(member);
                              setNewRole(member.role);
                            }}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-outline-variant hover:bg-surface-container transition text-on-surface-variant"
                          >
                            <RefreshCw size={12} />
                            Função
                          </button>
                          <button
                            onClick={() => setPromoteTarget(member)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border border-outline-variant hover:bg-surface-container transition"
                            style={{ color: '#476647' }}
                          >
                            <Shield size={12} />
                            Gestor
                          </button>
                        </>
                      )}
                      {member.todayReport && (
                        <button
                          onClick={() => {
                            setViewReport(member.todayReport);
                            setViewMember(member);
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs border border-outline-variant hover:bg-surface-container transition text-on-surface-variant"
                        >
                          Ver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Promote modal */}
      <Modal
        open={!!promoteTarget}
        onClose={() => setPromoteTarget(null)}
        title="Promover a Gestor"
      >
        {promoteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Tem certeza que deseja promover <strong className="text-on-surface">{promoteTarget.full_name}</strong> a{' '}
              <strong className="text-on-surface">Gestor</strong>?
            </p>
            <p className="text-xs text-outline bg-surface-container rounded-lg p-3">
              ⚠️ Esta ação altera a área e função do usuário para "gestor". O acesso ao formulário diário será removido
              e o usuário passará a ter acesso às páginas de gestão.
            </p>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setPromoteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container transition"
              >
                Cancelar
              </button>
              <button
                onClick={handlePromote}
                disabled={promoting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: '#476647' }}
              >
                {promoting ? 'Promovendo...' : 'Confirmar promoção'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Change role modal */}
      <Modal
        open={!!roleTarget}
        onClose={() => { setRoleTarget(null); setNewRole(''); }}
        title="Alterar Função"
      >
        {roleTarget && (
          <div className="space-y-4">
            <p className="text-sm text-on-surface-variant">
              Alterar função de <strong className="text-on-surface">{roleTarget.full_name}</strong>:
            </p>
            <div className="space-y-2">
              {(ROLE_OPTIONS[roleTarget.area] ?? []).map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: newRole === opt.value
                      ? (roleTarget.area === 'produto' ? '#406181' : '#755b00')
                      : '#d0c5b2',
                    backgroundColor: newRole === opt.value
                      ? (roleTarget.area === 'produto' ? '#40618115' : '#755b0015')
                      : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.value}
                    checked={newRole === opt.value}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-on-surface">{opt.label}</span>
                  {roleTarget.role === opt.value && (
                    <span className="ml-auto text-xs text-outline">(atual)</span>
                  )}
                </label>
              ))}
            </div>
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => { setRoleTarget(null); setNewRole(''); }}
                className="px-4 py-2 rounded-lg text-sm text-on-surface-variant hover:bg-surface-container transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeRole}
                disabled={changingRole || newRole === roleTarget.role}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: roleTarget.area === 'produto' ? '#406181' : '#755b00' }}
              >
                {changingRole ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* View report modal */}
      <Modal
        open={!!viewReport}
        onClose={() => { setViewReport(null); setViewMember(null); }}
        title={`Relatório — ${viewMember?.full_name ?? ''}`}
      >
        {viewReport && (
          <div className="space-y-4">
            <div className="text-xs text-outline flex gap-4">
              <span>Enviado: {format(new Date(viewReport.submitted_at), 'dd/MM/yyyy HH:mm')}</span>
              {viewReport.edited_at && (
                <span>Editado: {format(new Date(viewReport.edited_at), 'dd/MM/yyyy HH:mm')}</span>
              )}
            </div>
            <ReportViewer role={viewReport.role} data={viewReport.data as Record<string, unknown>} />
          </div>
        )}
      </Modal>
    </div>
  );
}
