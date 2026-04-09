'use client';

import { usePathname } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
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

  return (
    <header className="h-16 bg-background flex items-center justify-between px-6 border-b-2 border-outline-variant/40 shrink-0">
      <div>
        <p className="text-label-sm uppercase text-outline tracking-widest">◆ {page.overline}</p>
        <h1 className="font-serif text-xl font-semibold text-on-surface leading-tight">{page.title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm text-on-surface-variant hidden md:block">{today}</span>

        <button className="relative text-outline hover:text-on-surface transition-colors">
          <Bell size={20} />
        </button>

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
