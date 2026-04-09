'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DailyReport, Profile } from '@/types/database';
import { format } from 'date-fns';

export interface TeamReportRow extends DailyReport {
  profile: Profile;
}

export function useTeamReports(onNewReport?: (name: string) => void) {
  const [reports, setReports] = useState<TeamReportRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  // Use ref so the realtime effect doesn't re-run when the callback changes
  const onNewReportRef = useRef(onNewReport);
  useEffect(() => { onNewReportRef.current = onNewReport; }, [onNewReport]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchProfiles = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from('profiles').select('*');
    return data ?? [];
  }, []);

  const fetchReports = useCallback(async (allProfiles: Profile[]) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('report_date', today)
      .order('submitted_at', { ascending: false });

    const rows: TeamReportRow[] = (data ?? []).map((r) => ({
      ...r,
      profile: allProfiles.find((p) => p.id === r.user_id) as Profile,
    }));

    setReports(rows);
    setLoading(false);
    return rows;
  }, [today]);

  const refresh = useCallback(async () => {
    const allProfiles = await fetchProfiles();
    setProfiles(allProfiles);
    await fetchReports(allProfiles);
  }, [fetchProfiles, fetchReports]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime — stable effect, uses ref for callback
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('team_reports_today')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'daily_reports', filter: `report_date=eq.${today}` },
        async (payload) => {
          const newReport = payload.new as DailyReport;
          const allProfiles = await fetchProfiles();
          const profile = allProfiles.find((p) => p.id === newReport.user_id);
          if (profile) {
            setReports((prev) => [{ ...newReport, profile }, ...prev]);
            onNewReportRef.current?.(profile.full_name);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [today, fetchProfiles]); // onNewReport removed — uses ref instead

  return { reports, profiles, loading, refresh };
}
