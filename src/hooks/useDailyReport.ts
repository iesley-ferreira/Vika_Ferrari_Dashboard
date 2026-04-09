'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { DailyReport } from '@/types/database';
import { format } from 'date-fns';

export function useDailyReport(userId: string | undefined) {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchTodayReport = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('daily_reports')
      .select('*')
      .eq('user_id', userId)
      .eq('report_date', today)
      .single();
    setReport(data ?? null);
    setLoading(false);
  }, [userId, today]);

  useEffect(() => { fetchTodayReport(); }, [fetchTodayReport]);

  async function submitReport(
    data: Record<string, unknown>,
    area: string,
    role: string
  ) {
    if (!userId || report) return;
    setSubmitting(true);
    const supabase = createClient();
    const { data: inserted, error } = await supabase
      .from('daily_reports')
      .insert({ user_id: userId, area, role, data, report_date: today })
      .select()
      .single();
    if (!error && inserted) setReport(inserted);
    setSubmitting(false);
    return { error };
  }

  async function updateReport(
    reportId: string,
    data: Record<string, unknown>,
    editorId: string
  ) {
    setSubmitting(true);
    const supabase = createClient();
    const { data: updated, error } = await supabase
      .from('daily_reports')
      .update({ data, edited_at: new Date().toISOString(), edited_by: editorId })
      .eq('id', reportId)
      .select()
      .single();
    if (!error && updated) setReport(updated);
    setSubmitting(false);
    return { error };
  }

  return { report, loading, submitting, submitReport, updateReport, fetchTodayReport };
}
