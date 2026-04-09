'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DailyReport, Profile } from '@/types/database';

export interface ReportRow extends DailyReport {
  profile: Profile;
}

export function useReportsByDate(date: string) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const supabase = createClient();

    const [{ data: allProfiles, error: profilesErr }, { data: dayReports, error: reportsErr }] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase
        .from('daily_reports')
        .select('*')
        .eq('report_date', date)
        .order('submitted_at', { ascending: false }),
    ]);

    if (profilesErr || reportsErr) {
      setError((profilesErr ?? reportsErr)?.message ?? 'Erro ao carregar dados');
    }

    const profs = allProfiles ?? [];
    setProfiles(profs);

    const rows: ReportRow[] = (dayReports ?? []).map((r) => ({
      ...r,
      profile: profs.find((p) => p.id === r.user_id) as Profile,
    }));
    setReports(rows);
    setLoading(false);
  }, [date]);

  const silentRefresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { reports, profiles, loading, error, refresh: fetchData, silentRefresh };
}
