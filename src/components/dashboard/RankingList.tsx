import { Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types/database';

const MEDAL_COLORS = ['text-primary-container', 'text-outline', 'text-primary'];

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export interface RankingEntry {
  profile: Profile;
  score: number;
  metrics: { label: string; value: string }[];
}

interface RankingListProps {
  entries: RankingEntry[];
  area: 'produto' | 'comercial';
}

export function RankingList({ entries, area }: RankingListProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-outline py-6 text-center">Sem dados de ranking para hoje.</p>;
  }

  return (
    <div className="rounded-md overflow-hidden">
      {entries.map((entry, idx) => (
        <div
          key={entry.profile.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3',
            idx % 2 === 0 ? 'bg-surface' : 'bg-surface-low'
          )}
        >
          {/* Position */}
          <div className="w-6 flex items-center justify-center shrink-0">
            {idx < 3 ? (
              <Trophy size={15} className={MEDAL_COLORS[idx]} />
            ) : (
              <span className="text-sm text-outline font-medium">{idx + 1}</span>
            )}
          </div>

          {/* Avatar */}
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 overflow-hidden',
              area === 'produto' ? 'bg-secondary' : 'bg-primary-container'
            )}
          >
            {entry.profile.avatar_url ? (
              <img src={entry.profile.avatar_url} className="w-full h-full object-cover" alt="" />
            ) : (
              getInitials(entry.profile.full_name)
            )}
          </div>

          {/* Name + badge */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">{entry.profile.full_name}</p>
            <Badge type="role" value={entry.profile.role} size="sm" />
          </div>

          {/* Metrics — each in a fixed-width column */}
          <div className="hidden md:flex items-center divide-x divide-outline-variant/30">
            {entry.metrics.map((m) => (
              <div key={m.label} className="text-center px-4">
                <p className="text-xs text-outline leading-tight">{m.label}</p>
                <p className="text-sm font-semibold text-on-surface">{m.value}</p>
              </div>
            ))}
          </div>

          {/* Score */}
          <div className="text-center shrink-0 pl-3 border-l border-outline-variant/30">
            <p className="text-xs text-outline leading-tight">Score</p>
            <p className="text-sm font-bold text-primary">{entry.score.toFixed(1)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
