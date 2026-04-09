-- ============================================================
-- ARQUIVO: supabase/migrations/001_initial_schema.sql
-- ============================================================

-- ==================== PROFILES ====================
CREATE TABLE public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  area        text NOT NULL CHECK (area IN ('produto', 'comercial', 'gestor')),
  role        text NOT NULL,
  avatar_url  text,
  created_at  timestamptz DEFAULT now(),

  CONSTRAINT valid_role CHECK (
    (area = 'produto'   AND role IN ('especialista', 'gestora_produto'))
    OR (area = 'comercial' AND role IN ('sdr', 'seller', 'closer'))
    OR (area = 'gestor'    AND role = 'gestor')
  )
);

-- Index para queries frequentes por area
CREATE INDEX idx_profiles_area ON public.profiles(area);

-- ==================== MONTHLY GOALS ====================
CREATE TABLE public.monthly_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month       text NOT NULL,               -- formato: '2026-04'
  area        text NOT NULL CHECK (area IN ('produto', 'comercial', 'geral')),
  metric      text NOT NULL,
  target      numeric NOT NULL CHECK (target > 0),
  created_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES public.profiles(id),

  UNIQUE(month, area, metric)
);

CREATE INDEX idx_monthly_goals_month ON public.monthly_goals(month);

-- ==================== DAILY REPORTS ====================
CREATE TABLE public.daily_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.profiles(id) NOT NULL,
  report_date   date NOT NULL DEFAULT CURRENT_DATE,
  area          text NOT NULL,
  role          text NOT NULL,
  data          jsonb NOT NULL,
  submitted_at  timestamptz DEFAULT now(),
  edited_at     timestamptz,
  edited_by     uuid REFERENCES public.profiles(id),

  UNIQUE(user_id, report_date)
);

CREATE INDEX idx_daily_reports_date ON public.daily_reports(report_date);
CREATE INDEX idx_daily_reports_user ON public.daily_reports(user_id);
CREATE INDEX idx_daily_reports_area ON public.daily_reports(area);

-- ==================== RANKING WEIGHTS ====================
CREATE TABLE public.ranking_weights (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area        text NOT NULL CHECK (area IN ('produto', 'comercial')),
  weights     jsonb NOT NULL,
  updated_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES public.profiles(id),

  UNIQUE(area)
);

-- ==================== INVESTMENT METRICS ====================
CREATE TABLE public.investment_metrics (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month         text NOT NULL,             -- formato: '2026-04'
  funnel        text NOT NULL,             -- 'aplicacao' | 'isca_gratuita' | 'diagnostico' | 'aula_gratuita'
  data          jsonb NOT NULL,
  updated_at    timestamptz DEFAULT now(),
  updated_by    uuid REFERENCES public.profiles(id),

  UNIQUE(month, funnel)
);
