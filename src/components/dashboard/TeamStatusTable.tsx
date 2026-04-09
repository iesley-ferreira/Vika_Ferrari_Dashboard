'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { DailyReport, Profile } from '@/types/database';
import { format } from 'date-fns';
import { CircleCheck, Clock } from 'lucide-react';

export type ReportWithProfile = DailyReport & { profile: Profile };

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

function getAvatarGradient(area: string) {
  if (area === 'produto') return 'from-secondary to-secondary-light';
  return 'from-primary to-primary-container';
}

interface TeamStatusTableProps {
  allProfiles: Profile[];
  reports: ReportWithProfile[];
  filter?: 'all' | 'produto' | 'comercial';
  compact?: boolean;
  isGestor?: boolean;
  onView?: (report: ReportWithProfile) => void;
}

export function TeamStatusTable({
  allProfiles,
  reports,
  filter = 'all',
  compact = false,
  isGestor = false,
  onView,
}: TeamStatusTableProps) {
  const reportMap = new Map(reports.map((r) => [r.user_id, r]));

  const filteredProfiles = allProfiles.filter((p) => {
    if (p.area === 'gestor') return false;
    if (filter === 'all') return true;
    return p.area === filter;
  });

  if (filteredProfiles.length === 0) {
    return <p className="text-sm text-outline py-4 text-center">Nenhum membro encontrado.</p>;
  }

  const submitted = filteredProfiles.filter((p) => reportMap.has(p.id)).length;
  const total = filteredProfiles.length;

  return (
    <div className="rounded-md border border-outline-variant overflow-hidden bg-background">
      {/* Summary header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-outline-variant bg-surface-container/40">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-outline">Colaborador</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-widest text-outline w-20 text-center">
            Status
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-outline w-10 text-center hidden md:block">
            Hora
          </span>
          {onView && <span className="w-[52px]" />}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-outline-variant/25">
        {filteredProfiles.map((profile) => {
          const report = reportMap.get(profile.id);
          const hasReport = !!report;
          const time = hasReport && report.submitted_at
            ? format(new Date(report.submitted_at), 'HH:mm')
            : null;

          return (
            <div
              key={profile.id}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-low/50 transition-colors"
            >
              {/* Left: avatar + name + badges */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white bg-gradient-to-br shrink-0',
                    getAvatarGradient(profile.area)
                  )}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
                    : getInitials(profile.full_name)
                  }
                </div>
                <span className="text-sm min-w-[200px] font-medium text-on-surface truncate">
                  {profile.full_name}
                </span>
                {/* Badges — inline, right after the name */}
                {!compact && (
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <Badge type="area" value={profile.area} size="sm" className="whitespace-nowrap" />
                    <Badge type="role" value={profile.role} size="sm" className="whitespace-nowrap" />
                  </div>
                )}
              </div>

              {/* Right: status + time + button */}
              <div className="flex items-center gap-4 shrink-0">

                {/* Status */}
                <div className="flex items-center justify-center gap-1.5 w-20">
                  {hasReport ? (
                    <>
                      <CircleCheck size={15} className="text-tertiary shrink-0" />
                      <span className="text-xs font-medium text-tertiary">Enviado</span>
                    </>
                  ) : (
                    <>
                      <Clock size={15} className="text-outline shrink-0" />
                      <span className="text-xs font-medium text-outline">Pendente</span>
                    </>
                  )}
                </div>

                {/* Time */}
                <span className="text-xs text-on-surface-variant tabular-nums w-10 text-center hidden md:block">
                  {time ?? '—'}
                </span>

                {/* Action */}
                {onView ? (
                  <div className="w-[52px] flex justify-end">
                    {hasReport && (
                      <Button variant="ghost" size="sm" onClick={() => onView(report!)}>
                        Ver
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-t border-outline-variant/40 bg-surface-container/20">
        <span className="text-xs text-outline">
          {submitted} de {total} enviaram hoje
        </span>
        <div className="flex gap-0.5">
          {filteredProfiles.map((p) => (
            <div
              key={p.id}
              className={cn(
                'w-2 h-2 rounded-full',
                reportMap.has(p.id) ? 'bg-tertiary' : 'bg-outline-variant'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
