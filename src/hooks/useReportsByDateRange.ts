'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DailyReport, Profile } from '@/types/database';

export interface ReportRow extends DailyReport {
  profile: Profile;
}

export function useReportsByDateRange(startDate: string, endDate: string) {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    const supabase = createClient();

    const [{ data: allProfiles, error: profilesErr }, { data: rangeReports, error: reportsErr }] =
      await Promise.all([
        supabase.from('profiles').select('*'),
        supabase
          .from('daily_reports')
          .select('*')
          .gte('report_date', startDate)
          .lte('report_date', endDate)
          .order('submitted_at', { ascending: false }),
      ]);

    if (profilesErr || reportsErr) {
      setError((profilesErr ?? reportsErr)?.message ?? 'Erro ao carregar dados');
    }

    const profs = allProfiles ?? [];
    setProfiles(profs);

    const rows: ReportRow[] = (rangeReports ?? []).map((r) => ({
      ...r,
      profile: profs.find((p) => p.id === r.user_id) as Profile,
    }));
    setReports(rows);
    setLoading(false);
  }, [startDate, endDate]);

  const silentRefresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { reports, profiles, loading, error, refresh: fetchData, silentRefresh };
}
