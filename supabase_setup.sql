-- ============================================================
-- HBS PERFORMANCE DASHBOARD — SUPABASE SQL SETUP
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- ============================================================
-- 1. TABELAS (caso ainda não existam)
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text NOT NULL,
  area        text NOT NULL CHECK (area IN ('produto', 'comercial', 'gestor')),
  role        text NOT NULL CHECK (role IN ('especialista', 'gestora_produto', 'sdr', 'seller', 'closer', 'gestor')),
  avatar_url  text,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS monthly_goals (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month       text NOT NULL,
  area        text NOT NULL CHECK (area IN ('produto', 'comercial', 'geral')),
  metric      text NOT NULL,
  target      numeric NOT NULL,
  created_at  timestamptz DEFAULT now(),
  updated_by  uuid REFERENCES profiles(id),
  UNIQUE (month, area, metric)
);

CREATE TABLE IF NOT EXISTS daily_reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  report_date   date NOT NULL DEFAULT CURRENT_DATE,
  area          text NOT NULL,
  role          text NOT NULL,
  data          jsonb NOT NULL,
  submitted_at  timestamptz DEFAULT now(),
  edited_at     timestamptz,
  edited_by     uuid REFERENCES profiles(id),
  UNIQUE (user_id, report_date)
);

-- ============================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. RLS POLICIES — profiles
-- ============================================================

-- Remove políticas antigas (se existirem)
DROP POLICY IF EXISTS "profiles_select_all"     ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own"     ON profiles;
DROP POLICY IF EXISTS "profiles_update_own"     ON profiles;
DROP POLICY IF EXISTS "profiles_select_own"     ON profiles;
DROP POLICY IF EXISTS "profiles_select_gestor"  ON profiles;
DROP POLICY IF EXISTS "profiles_update_gestor"  ON profiles;

-- Todos os usuários autenticados leem todos os perfis (dashboard compartilhado)
CREATE POLICY "profiles_select_all" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Usuário insere apenas o próprio perfil
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Usuário atualiza apenas o próprio perfil
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ============================================================
-- 4. RLS POLICIES — daily_reports
-- ============================================================

DROP POLICY IF EXISTS "reports_select_all"     ON daily_reports;
DROP POLICY IF EXISTS "reports_select_own"     ON daily_reports;
DROP POLICY IF EXISTS "reports_insert_own"     ON daily_reports;
DROP POLICY IF EXISTS "reports_update_own"     ON daily_reports;
DROP POLICY IF EXISTS "reports_update_gestor"  ON daily_reports;
DROP POLICY IF EXISTS "reports_delete_gestor"  ON daily_reports;

-- Todos leem todos os relatórios (necessário para o dashboard)
CREATE POLICY "reports_select_all" ON daily_reports
  FOR SELECT TO authenticated
  USING (true);

-- Usuário insere apenas o próprio relatório
CREATE POLICY "reports_insert_own" ON daily_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Apenas gestores editam qualquer relatório
CREATE POLICY "reports_update_gestor" ON daily_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND area = 'gestor'
    )
  );

-- ============================================================
-- 5. RLS POLICIES — monthly_goals
-- ============================================================

DROP POLICY IF EXISTS "goals_select_all"     ON monthly_goals;
DROP POLICY IF EXISTS "goals_insert_gestor"  ON monthly_goals;
DROP POLICY IF EXISTS "goals_update_gestor"  ON monthly_goals;
DROP POLICY IF EXISTS "goals_delete_gestor"  ON monthly_goals;

-- Todos leem metas
CREATE POLICY "goals_select_all" ON monthly_goals
  FOR SELECT TO authenticated
  USING (true);

-- Apenas gestores criam metas
CREATE POLICY "goals_insert_gestor" ON monthly_goals
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND area = 'gestor'
    )
  );

-- Apenas gestores atualizam metas
CREATE POLICY "goals_update_gestor" ON monthly_goals
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND area = 'gestor'
    )
  );

-- Apenas gestores removem metas
CREATE POLICY "goals_delete_gestor" ON monthly_goals
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND area = 'gestor'
    )
  );

-- ============================================================
-- 6. TRIGGER — Auto-criar profile ao cadastrar (opcional)
-- Garante que se o metadata foi preenchido no signUp,
-- o profile é criado automaticamente mesmo sem sessão ativa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Só cria se os campos obrigatórios existirem no metadata
  IF (NEW.raw_user_meta_data->>'full_name') IS NOT NULL
     AND (NEW.raw_user_meta_data->>'area') IS NOT NULL
     AND (NEW.raw_user_meta_data->>'role') IS NOT NULL
  THEN
    INSERT INTO public.profiles (id, full_name, area, role)
    VALUES (
      NEW.id,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'area',
      NEW.raw_user_meta_data->>'role'
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 7. HABILITAR REALTIME nas tabelas necessárias
-- ============================================================

-- Adiciona daily_reports ao Realtime apenas se ainda não estiver incluída
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'daily_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE daily_reports;
  END IF;
END $$;

-- ============================================================
-- 8. VERIFICAÇÃO FINAL
-- ============================================================
-- Para verificar se tudo foi criado corretamente:
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'daily_reports', 'monthly_goals');
