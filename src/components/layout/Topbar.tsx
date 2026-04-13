'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

const PAGE_LABELS: Record<string, { overline: string; title: string }> = {
  '/dashboard': { overline: 'Visão Geral', title: 'Painel Geral' },
  '/dashboard/produto': { overline: 'Área', title: 'Painel Produto' },
  '/dashboard/comercial': { overline: 'Área', title: 'Painel Comercial' },
  '/dashboard/relatorio': { overline: 'Diário', title: 'Meu Relatório' },
  '/dashboard/gestao': { overline: 'Gestão', title: 'Metas do Mês' },
  '/dashboard/equipe': { overline: 'Gestão', title: 'Equipe' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function getGradient(area: string) {
  if (area === 'produto') return 'from-secondary to-secondary-light';
  return 'from-primary to-primary-container';
}

interface TopbarProps {
  profile: Profile;
}

export function Topbar({ profile }: TopbarProps) {
  const pathname = usePathname();
  const page = PAGE_LABELS[pathname] ?? { overline: 'Dashboard', title: 'HBS Performance' };
  const today = format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR });
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const isGestor = profile.role === 'gestor' || profile.area === 'gestor';
  const [hasPendingReport, setHasPendingReport] = useState(false);
  const [allTeamReported, setAllTeamReported] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const bellWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function checkNotifications() {
      if (isGestor) {
        setHasPendingReport(false);

        const [{ data: teamProfiles, error: profilesError }, { data: reports, error: reportsError }] =
          await Promise.all([
            supabase.from('profiles').select('id').neq('area', 'gestor'),
            supabase.from('daily_reports').select('user_id').eq('report_date', todayKey),
          ]);

        if (profilesError || reportsError) return;

        const expectedMembers = (teamProfiles ?? []).map((member) => member.id);
        if (expectedMembers.length === 0) {
          setAllTeamReported(false);
          return;
        }

        const deliveredSet = new Set((reports ?? []).map((report) => report.user_id));
        const allDelivered = expectedMembers.every((id) => deliveredSet.has(id));
        setAllTeamReported(allDelivered);
        return;
      }

      setAllTeamReported(false);
      const { data, error } = await supabase
        .from('daily_reports')
        .select('id')
        .eq('user_id', profile.id)
        .eq('report_date', todayKey)
        .maybeSingle();

      if (!error) {
        setHasPendingReport(!data);
      }
    }

    checkNotifications();

    const channel = supabase
      .channel(`topbar_report_notice_${profile.id}_${isGestor ? 'gestor' : 'colaborador'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_reports',
        },
        () => {
          checkNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isGestor, profile.id, todayKey]);

  useEffect(() => {
    function onOutsideClick(event: MouseEvent) {
      if (!bellWrapperRef.current) return;
      if (!bellWrapperRef.current.contains(event.target as Node)) {
        setNoticeOpen(false);
      }
    }

    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  return (
    <header className="h-16 bg-background flex items-center justify-between px-6 border-b-2 border-outline-variant/40 shrink-0">
      <div>
        <p className="text-label-sm uppercase text-outline tracking-widest">◆ {page.overline}</p>
        <h1 className="font-serif text-xl font-semibold text-on-surface leading-tight">{page.title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-on-surface-variant hidden md:block">{today}</span>

        <div ref={bellWrapperRef} className="relative">
          <button
            className="relative text-outline hover:text-on-surface transition-colors"
            onClick={() => setNoticeOpen((prev) => !prev)}
            aria-label="Notificações"
          >
            <Bell size={20} />
            {(hasPendingReport || allTeamReported) && (
              <span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: allTeamReported ? '#476647' : '#ba1a1a' }}
              />
            )}
          </button>

          {noticeOpen && (
            <div className="absolute right-0 top-9 w-72 rounded-lg border border-outline-variant bg-surface shadow-lg p-3 z-20">
              {hasPendingReport ? (
                <div className="space-y-2">
                  <p className="text-sm text-on-surface">
                    Você ainda não preencheu seu relatório diário.
                  </p>
                  <Link
                    href="/dashboard/relatorio"
                    onClick={() => setNoticeOpen(false)}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    Preencher agora
                  </Link>
                </div>
              ) : allTeamReported ? (
                <p className="text-sm text-on-surface">
                  Todos os colaboradores responderam o relatório diário.
                </p>
              ) : (
                <p className="text-sm text-on-surface-variant">
                  Nenhuma notificação no momento.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-gradient-to-br overflow-hidden',
              getGradient(profile.area)
            )}
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              getInitials(profile.full_name)
            )}
          </div>
          <Badge type="area" value={profile.area} size="sm" />
        </div>
      </div>
    </header>
  );
}
