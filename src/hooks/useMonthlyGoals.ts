'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { MonthlyGoal } from '@/types/database';
import { getCurrentMonth } from '@/lib/utils';

export function useMonthlyGoals(month?: string | string[]) {
  const [goals, setGoals] = useState<MonthlyGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const months = Array.isArray(month) ? month : [month ?? getCurrentMonth()];
  const monthsKey = months.join(',');

  const fetchGoals = useCallback(async () => {
    const supabase = createClient();
    const list = monthsKey.split(',').filter(Boolean);
    const query = supabase.from('monthly_goals').select('*');
    const { data } = list.length === 1
      ? await query.eq('month', list[0])
      : await query.in('month', list);
    setGoals(data ?? []);
    setLoading(false);
  }, [monthsKey]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  async function upsertGoal(goal: Omit<MonthlyGoal, 'id' | 'created_at'>) {
    const supabase = createClient();
    const { error } = await supabase
      .from('monthly_goals')
      .upsert(goal, { onConflict: 'month,area,metric' });
    if (!error) await fetchGoals();
    return { error };
  }

  async function deleteGoal(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from('monthly_goals').delete().eq('id', id);
    if (!error) setGoals((prev) => prev.filter((g) => g.id !== id));
    return { error };
  }

  return { goals, loading, upsertGoal, deleteGoal, refresh: fetchGoals };
}
