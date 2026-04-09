'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  FileText,
  Target,
  Users,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  gestorOnly?: boolean;
  hideForGestor?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: 'Painel Geral', href: '/dashboard' },
  { icon: Package, label: 'Produto', href: '/dashboard/produto' },
  { icon: TrendingUp, label: 'Comercial', href: '/dashboard/comercial' },
  { icon: FileText, label: 'Meu Relatório', href: '/dashboard/relatorio', hideForGestor: true },
];

const GESTOR_ITEMS: NavItem[] = [
  { icon: Target, label: 'Metas', href: '/dashboard/gestao', gestorOnly: true },
  { icon: Users, label: 'Equipe', href: '/dashboard/equipe', gestorOnly: true },
];

function getGradient(area: string) {
  if (area === 'produto') return 'from-secondary to-secondary-light';
  return 'from-primary to-primary-container';
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isGestor = profile.area === 'gestor';

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  }

  const visibleItems = NAV_ITEMS.filter((item) => !(item.hideForGestor && isGestor));

  return (
    <aside className="w-64 bg-charcoal h-screen fixed left-0 top-0 flex flex-col z-30">
      {/* Logo */}
      <div className="px-6 py-6">
        <span className="font-serif text-xl font-bold text-primary-light tracking-wide">
          HBS
        </span>
        <span className="text-outline-variant text-xs ml-2 uppercase tracking-widest">Performance</span>
      </div>

      {/* Area gradient line */}
      <div className={cn('h-0.5 mx-6 rounded-full bg-gradient-to-r', getGradient(profile.area))} />

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 mt-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = item.href === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
                isActive
                  ? 'bg-white/10 text-primary-light font-medium'
                  : 'text-outline-variant hover:bg-white/5 hover:text-on-primary'
              )}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          );
        })}

        {isGestor && (
          <>
            <div className="my-2 h-px bg-white/10 mx-3" />
            {GESTOR_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
                    isActive
                      ? 'bg-white/10 text-primary-light font-medium'
                      : 'text-outline-variant hover:bg-white/5 hover:text-on-primary'
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Configurações + sign out */}
      <div className="px-3 pb-2 space-y-0.5">
        <Link
          href="/dashboard/configuracoes"
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all',
            pathname.startsWith('/dashboard/configuracoes')
              ? 'bg-white/10 text-primary-light font-medium'
              : 'text-outline-variant hover:bg-white/5 hover:text-on-primary'
          )}
        >
          <Settings size={20} />
          Configurações
        </Link>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-outline-variant hover:bg-white/5 hover:text-soft-red transition-all"
        >
          <LogOut size={20} />
          Sair
        </button>
      </div>

      {/* Profile */}
      <Link
        href="/dashboard/configuracoes"
        className="px-4 py-4 border-t border-white/10 flex items-center gap-3 hover:bg-white/5 transition-colors group"
        title="Abrir configurações"
      >
        <div className={cn(
          'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold text-white bg-gradient-to-br flex-shrink-0 relative overflow-hidden',
          getGradient(profile.area)
        )}>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover rounded-full" alt="" />
          ) : (
            getInitials(profile.full_name)
          )}
          <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
            <Settings size={12} color="#fff" />
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-on-primary font-medium truncate">{profile.full_name}</p>
          <div className="flex gap-1 mt-0.5">
            <Badge type="area" value={profile.area} size="sm" />
          </div>
        </div>
      </Link>
    </aside>
  );
}
