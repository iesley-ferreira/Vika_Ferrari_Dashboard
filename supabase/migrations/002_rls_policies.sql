-- ============================================================
-- ARQUIVO: supabase/migrations/002_rls_policies.sql
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_metrics ENABLE ROW LEVEL SECURITY;

-- ---------- PROFILES ----------
-- Qualquer usuario autenticado le todos os profiles
CREATE POLICY "profiles_select_all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Usuario edita apenas o proprio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Insert via trigger on auth.users
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Gestor pode atualizar qualquer perfil
CREATE POLICY "profiles_update_gestor"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND area = 'gestor')
  );

-- ---------- DAILY REPORTS ----------
-- Usuario le o proprio relatorio
CREATE POLICY "reports_select_own"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Gestor le todos os relatorios
CREATE POLICY "reports_select_gestor"
  ON public.daily_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND area = 'gestor')
  );

-- Usuario insere o proprio relatorio
CREATE POLICY "reports_insert_own"
  ON public.daily_reports FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Gestor edita qualquer relatorio
CREATE POLICY "reports_update_gestor"
  ON public.daily_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND area = 'gestor')
  );

-- ---------- MONTHLY GOALS ----------
-- Todos leem
CREATE POLICY "goals_select_all"
  ON public.monthly_goals FOR SELECT
  TO authenticated
  USING (true);

-- Apenas gestor insere/edita
CREATE POLICY "goals_insert_gestor"
  ON public.monthly_goals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND area = 'gestor')
  );

CREATE POLICY "goals_update_gestor"
  ON public.monthly_goals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND area = 'gestor')
  );

-- ---------- RANKING WEIGHTS ----------
CREATE POLICY "weights_select_all"
  ON public.ranking_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "weights_upsert_gestor"
  ON public.ranking_weights FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND area = 'gestor')
  );

-- ---------- INVESTMENT METRICS ----------
CREATE POLICY "investment_select_all"
  ON public.investment_metrics FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "investment_upsert_gestor"
  ON public.investment_metrics FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND area = 'gestor')
  );
