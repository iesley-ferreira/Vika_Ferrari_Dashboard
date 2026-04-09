# SPEC.md — Dashboard HBS Performance (Especificacao Tecnica Completa)

> Documento tecnico de referencia para implementacao do Dashboard HBS.
> Todas as decisoes de UI/UX sao baseadas nos mockups do Stitch (projeto `6681416137461907737`).

---

## 1. STACK & DEPENDENCIAS

### 1.1 Core

| Tecnologia       | Versao / Detalhes                          |
| ---------------- | ------------------------------------------ |
| Next.js          | 14.x (App Router)                          |
| TypeScript       | 5.x (strict mode)                          |
| React            | 18.x                                       |
| Tailwind CSS     | 3.x + CSS custom properties                |
| Supabase         | @supabase/supabase-js 2.x + @supabase/ssr |
| Recharts         | 2.x                                        |
| Lucide React     | latest                                     |
| Google Fonts     | Playfair Display + Inter                    |

### 1.2 package.json — dependencias

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@supabase/supabase-js": "^2.45.0",
    "@supabase/ssr": "^0.5.0",
    "recharts": "^2.12.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.3.0",
    "date-fns": "^3.6.0",
    "react-hook-form": "^7.52.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.6.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.14.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0"
  }
}
```

---

## 2. BANCO DE DADOS — PostgreSQL (Supabase)

### 2.1 Schema SQL completo

```sql
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
```

### 2.2 Row Level Security (RLS)

```sql
-- ============================================================
-- ARQUIVO: supabase/migrations/002_rls_policies.sql
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_metrics ENABLE ROW LEVEL SECURITY;

-- ---------- PROFILES ----------
-- Qualquer usuario autenticado le todos os profiles (necessario para rankings/tabelas)
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

-- Insert via trigger on auth.users (ver secao 2.3)
CREATE POLICY "profiles_insert_own"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Gestor pode atualizar qualquer perfil (promocao, alteracao de funcao)
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
```

### 2.3 Trigger — criar profile ao signup

```sql
-- ============================================================
-- ARQUIVO: supabase/migrations/003_auth_trigger.sql
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, area, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'area',
    NEW.raw_user_meta_data ->> 'role'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 2.4 Realtime — habilitar

```sql
-- ============================================================
-- ARQUIVO: supabase/migrations/004_realtime.sql
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;
```

### 2.5 Estrutura `data` JSONB por role

**SDR** (`area: 'comercial'`, `role: 'sdr'`):
```typescript
interface SdrData {
  abordagens_total: number;
  abordagens_tipos: string[];           // ["FDO", "HBS Talks", "Outros"]
  abordagens_descricao: string;         // opcional
  calls_agendadas: { vtl: number; flw: number; outros: number };
  contatos_capturados: { total: number; amht: number; vtl: number; flw: number; outros: number };
  crm_status: 'atualizado' | 'pendente';
  deu_certo: string;
  a_melhorar: string;
  atividades_amanha: string;
}
```

**Seller** (`area: 'comercial'`, `role: 'seller'`):
```typescript
interface SellerData {
  abordagens: { follow_up: number; conducoes: number; outros: number };
  cross: number;
  calls_agendadas: { vtl: number; flw: number };
  contatos_capturados: { total: number; amht: number; vtl: number; flw: number; outros: number };
  crm_status: 'atualizado' | 'pendente';
  deu_certo: string;
  a_melhorar: string;
  atividades_amanha: string;
}
```

**Closer** (`area: 'comercial'`, `role: 'closer'`):
```typescript
interface CloserData {
  calls_agendadas: { vtl: number; flw: number; amht: number; individual: number };
  calls_realizadas: { vtl: number; flw: number; amht: number; individual: number };
  vendas: { amht: number; vtl: number; flw: number };
  cash_collect_valor: number;
  cash_collect_descricao: string;
  faturamento_dia: number;
  crm_status: 'atualizado' | 'pendente';
  deu_certo: string;
  a_melhorar: string;
}
```

**Especialista / Gestora de Produto** (`area: 'produto'`):
```typescript
interface ProdutoData {
  atendimentos: { flw: number; vtl_amht_outros: number; sprint: number };
  atendimentos_total: number;
  resolvidos: { flw: number; vtl_amht_outros: number; sprint: number };
  resolvidos_total: number;
  nao_sei_o_que_fazer: number;
  falta_clareza_qtd: number;
  falta_clareza_descricao: string;
  tempo_medio_resposta_horas: number;
  tempo_medio_resposta_minutos: number;
  deu_certo: string;
  a_melhorar: string;
  atividades_amanha: string;
}
```

---

## 3. ESTRUTURA DE PASTAS COMPLETA

```
src/
|-- app/
|   |-- layout.tsx                          --> RootLayout: fontes, providers, metadata
|   |-- globals.css                         --> Variaveis CSS + Tailwind directives
|   |-- auth/
|   |   |-- login/
|   |   |   |-- page.tsx                    --> Pagina de login (email + senha)
|   |   |-- register/
|   |       |-- page.tsx                    --> Cadastro 2 etapas (area -> funcao)
|   |-- dashboard/
|       |-- layout.tsx                      --> DashboardLayout: Sidebar + Topbar + guard auth
|       |-- page.tsx                        --> Aba 1: Painel Geral
|       |-- produto/
|       |   |-- page.tsx                    --> Aba 2: Painel Produto
|       |-- comercial/
|       |   |-- page.tsx                    --> Aba 3: Painel Comercial
|       |-- relatorio/
|       |   |-- page.tsx                    --> Aba 4: Meu Relatorio
|       |-- gestao/
|       |   |-- page.tsx                    --> Metas do Mes (gestor only)
|       |-- equipe/
|           |-- page.tsx                    --> Gestao da Equipe (gestor only)
|-- components/
|   |-- layout/
|   |   |-- Sidebar.tsx                     --> Navegacao lateral (charcoal bg)
|   |   |-- Topbar.tsx                      --> Barra superior com data/notif/avatar
|   |-- dashboard/
|   |   |-- KpiCard.tsx                     --> Card de KPI com barra de progresso
|   |   |-- FunnelChart.tsx                 --> Funil de conversao (Recharts horizontal bars)
|   |   |-- RankingList.tsx                 --> Tabela de ranking com medalhas
|   |   |-- TeamStatusTable.tsx             --> Tabela de status diario da equipe
|   |   |-- FunnelTabs.tsx                  --> Tabs de metricas por funil comercial
|   |   |-- AttendanceBarChart.tsx          --> BarChart agrupado atendimentos vs resolvidos
|   |   |-- TmrLineChart.tsx               --> LineChart TMR ao longo do mes
|   |   |-- ReportViewModal.tsx             --> Modal para ver relatorio completo
|   |   |-- InvestmentMetrics.tsx           --> Cards CPL/CPA/ROAS/Investimento
|   |   |-- GoalsForm.tsx                   --> Form de metas mensais (gestor)
|   |   |-- TeamManagement.tsx              --> Tabela gestao de equipe (gestor)
|   |-- forms/
|   |   |-- SdrForm.tsx                     --> Formulario SDR
|   |   |-- SellerForm.tsx                  --> Formulario Seller
|   |   |-- CloserForm.tsx                  --> Formulario Closer
|   |   |-- ProdutoForm.tsx                 --> Formulario Produto (especialista + gestora)
|   |   |-- ConfirmSubmitModal.tsx          --> Modal de confirmacao com resumo
|   |-- ui/
|       |-- Button.tsx                      --> Botao (primary, secondary, ghost, danger)
|       |-- Input.tsx                       --> Input text com label e bottom-border style
|       |-- Textarea.tsx                    --> Textarea com label
|       |-- Select.tsx                      --> Select dropdown
|       |-- Badge.tsx                       --> Badge de area + role (cores semanticas)
|       |-- Card.tsx                        --> Container card com variantes
|       |-- ProgressBar.tsx                 --> Barra de progresso com cor condicional
|       |-- Toast.tsx                       --> Notificacao toast (sucesso/erro/info)
|       |-- Skeleton.tsx                    --> Loading skeleton placeholder
|       |-- AreaStepSelector.tsx            --> Seletor area/funcao no cadastro
|       |-- Toggle.tsx                      --> Toggle switch (CRM status)
|       |-- ChipSelect.tsx                  --> Multi-select com chips (tipos abordagem)
|       |-- MoneyInput.tsx                  --> Input monetario com mascara R$
|       |-- TimeInput.tsx                   --> Input de tempo (horas + minutos)
|       |-- Modal.tsx                       --> Modal base (overlay + glassmorphism)
|       |-- Tabs.tsx                        --> Tabs reutilizavel
|-- hooks/
|   |-- useProfile.ts                       --> Retorna profile do usuario logado
|   |-- useDailyReport.ts                   --> CRUD do relatorio diario
|   |-- useTeamReports.ts                   --> Lista relatorios da equipe + realtime
|   |-- useMonthlyGoals.ts                  --> CRUD metas mensais
|   |-- useRankingWeights.ts                --> CRUD pesos do ranking
|   |-- useInvestmentMetrics.ts             --> CRUD metricas de investimento
|   |-- useSupabaseAuth.ts                  --> Login/register/logout
|   |-- useRealtime.ts                      --> Subscription realtime generico
|-- lib/
|   |-- supabase/
|   |   |-- client.ts                       --> createBrowserClient (client-side)
|   |   |-- server.ts                       --> createServerClient (server-side)
|   |   |-- middleware.ts                    --> updateSession helper
|   |-- utils.ts                            --> cn(), formatCurrency(), formatDate(), etc.
|   |-- constants.ts                        --> Labels, opcoes de funil, area labels
|   |-- calculations.ts                     --> Score de ranking, taxa resolucao, semaforo TMR
|-- types/
|   |-- database.ts                         --> Tipos das tabelas + Database type
|   |-- forms.ts                            --> Schemas Zod para cada formulario
|-- middleware.ts                            --> Next.js middleware (auth guard)
```

---

## 4. CONFIGURACAO — ARQUIVOS NA RAIZ

### 4.1 `middleware.ts` (raiz do projeto)

```
src/middleware.ts
```

**O que criar:**
- Importar `createServerClient` de `@supabase/ssr`
- Interceptar todas as requests
- Verificar sessao do usuario via `supabase.auth.getUser()`
- Rotas protegidas: `/dashboard/*` — redirecionar para `/auth/login` se nao autenticado
- Rotas publicas: `/auth/*` — redirecionar para `/dashboard` se ja autenticado
- Atualizar cookies de sessao em cada request
- Matcher: `/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`

### 4.2 `tailwind.config.ts`

```
tailwind.config.ts
```

**O que criar:**
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Surfaces (do Design System Stitch)
        background:         '#fef9f1',
        surface:            '#ffffff',
        'surface-container': '#f2ede5',
        'surface-high':     '#ece8e0',
        'surface-low':      '#f8f3eb',
        'surface-dim':      '#ded9d2',
        // Primary (Gold)
        primary:            '#755b00',
        'primary-container':'#c9a84c',
        'primary-light':    '#e6c364',
        'primary-fixed':    '#ffe08f',
        // Secondary (Blue-Grey — Produto)
        secondary:          '#406181',
        'secondary-container':'#b9daff',
        'secondary-light':  '#a8caee',
        // Tertiary (Sage Green — Success)
        tertiary:           '#476647',
        'tertiary-container':'#92b490',
        'tertiary-light':   '#add0aa',
        // Neutrals
        charcoal:           '#2D2D25',
        'on-surface':       '#1d1c17',
        'on-surface-variant':'#4d4637',
        outline:            '#7e7665',
        'outline-variant':  '#d0c5b2',
        // Semantic
        'on-primary':       '#ffffff',
        error:              '#ba1a1a',
        'error-container':  '#ffdad6',
        'soft-red':         '#A85050',
        'olive-green':      '#5A7A5A',
        // Areas (mapeamento semantico)
        comercial:          '#c9a84c',   // gold
        produto:            '#406181',   // blue
        // Funcoes
        sdr:                '#c9a84c',
        seller:             '#e6c364',
        closer:             '#755b00',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans:  ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm:  '0.25rem',   // 4px
        md:  '0.75rem',   // 12px
        lg:  '1rem',      // 16px
        xl:  '1.5rem',    // 24px
      },
      boxShadow: {
        sm:   '0px 4px 8px -2px rgba(45, 45, 37, 0.04)',
        md:   '0px 12px 24px -6px rgba(45, 45, 37, 0.06)',
        lg:   '0px 24px 48px -12px rgba(45, 45, 37, 0.06)',
        gold: '0px 4px 16px -4px rgba(201, 168, 76, 0.3)',
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        'headline-md': ['1.75rem', { lineHeight: '1.3', fontWeight: '600' }],
        'title-lg':   ['1.375rem', { lineHeight: '1.4', fontWeight: '500' }],
        'body-md':    ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
        'label-sm':   ['0.6875rem', { lineHeight: '1.4', fontWeight: '700', letterSpacing: '0.1em' }],
      },
    },
  },
  plugins: [],
};

export default config;
```

### 4.3 `src/app/globals.css`

```
src/app/globals.css
```

**O que criar:**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  /* ===== SURFACES ===== */
  --color-background:         #fef9f1;
  --color-surface:            #ffffff;
  --color-surface-container:  #f2ede5;
  --color-surface-high:       #ece8e0;
  --color-surface-low:        #f8f3eb;
  --color-surface-dim:        #ded9d2;
  --color-charcoal:           #2D2D25;

  /* ===== PRIMARY (GOLD) ===== */
  --color-primary:            #755b00;
  --color-primary-container:  #c9a84c;
  --color-primary-light:      #e6c364;
  --color-primary-fixed:      #ffe08f;
  --color-on-primary:         #ffffff;

  /* ===== SECONDARY (BLUE — PRODUTO) ===== */
  --color-secondary:          #406181;
  --color-secondary-container:#b9daff;
  --color-secondary-light:    #a8caee;

  /* ===== TERTIARY (GREEN) ===== */
  --color-tertiary:           #476647;
  --color-tertiary-container: #92b490;

  /* ===== TEXT ===== */
  --color-on-surface:         #1d1c17;
  --color-on-surface-variant: #4d4637;
  --color-outline:            #7e7665;
  --color-outline-variant:    #d0c5b2;

  /* ===== SEMANTIC ===== */
  --color-error:              #ba1a1a;
  --color-error-container:    #ffdad6;
  --color-soft-red:           #A85050;
  --color-olive-green:        #5A7A5A;

  /* ===== AREAS ===== */
  --color-comercial:          #c9a84c;
  --color-produto:            #406181;
  --color-sdr:                #c9a84c;
  --color-seller:             #e6c364;
  --color-closer:             #755b00;

  /* ===== SPACING ===== */
  --space-xs:   4px;
  --space-sm:   8px;
  --space-md:   16px;
  --space-lg:   24px;
  --space-xl:   32px;
  --space-2xl:  48px;

  /* ===== RADIUS ===== */
  --radius-sm:  4px;
  --radius-md:  12px;
  --radius-lg:  16px;
  --radius-xl:  24px;

  /* ===== SHADOWS ===== */
  --shadow-sm:   0px 4px 8px -2px rgba(45, 45, 37, 0.04);
  --shadow-md:   0px 12px 24px -6px rgba(45, 45, 37, 0.06);
  --shadow-lg:   0px 24px 48px -12px rgba(45, 45, 37, 0.06);
  --shadow-gold: 0px 4px 16px -4px rgba(201, 168, 76, 0.3);

  /* ===== GRADIENTS ===== */
  --gradient-gold: linear-gradient(135deg, #755b00, #c9a84c);
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background-color: var(--color-background);
  color: var(--color-on-surface);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

### 4.4 `src/app/layout.tsx`

```
src/app/layout.tsx
```

**O que criar:**
- Importar `globals.css`
- Configurar `next/font/google` para Playfair Display (weight 400-700) e Inter (weight 300-700)
- Aplicar fontes via `className` no `<html>` com CSS variables (`--font-serif`, `--font-sans`)
- Metadata: `title: "HBS Performance"`, `description: "Dashboard de performance HBS"`
- Corpo: `<html lang="pt-BR">` + `<body className={inter.className}>{children}</body>`

### 4.5 `.env.local`

```
.env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

---

## 5. BACKEND — LIB / SUPABASE

### 5.1 `src/lib/supabase/client.ts`

**O que criar:**
```typescript
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### 5.2 `src/lib/supabase/server.ts`

**O que criar:**
```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );
}
```

### 5.3 `src/lib/supabase/middleware.ts`

**O que criar:**
- Funcao `updateSession(request: NextRequest)` que:
  - Cria um `NextResponse`
  - Instancia `createServerClient` com cookies de request/response
  - Chama `supabase.auth.getUser()`
  - Redireciona para `/auth/login` se nao autenticado e rota e `/dashboard/*`
  - Redireciona para `/dashboard` se autenticado e rota e `/auth/*`
  - Retorna response com cookies atualizados

### 5.4 `src/lib/utils.ts`

**O que criar:**
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Merge de classes Tailwind
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formato monetario BR
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(value);
}

// Formato de data
export function formatDate(date: string | Date, pattern = "dd 'de' MMMM, yyyy"): string {
  return format(new Date(date), pattern, { locale: ptBR });
}

// Formato de hora
export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm');
}

// Cor da barra de progresso baseada no percentual
export function getProgressColor(percent: number): string {
  if (percent >= 70) return 'bg-primary-container';    // gold
  if (percent >= 40) return 'bg-yellow-500';            // amber
  return 'bg-soft-red';                                  // red
}

// Semaforo TMR (Tempo Medio Resposta)
export function getTmrSemaphore(hours: number, minutes: number): 'green' | 'amber' | 'red' {
  const totalHours = hours + minutes / 60;
  if (totalHours < 2) return 'green';
  if (totalHours <= 4) return 'amber';
  return 'red';
}

// Dias uteis restantes no mes
export function getRemainingWorkDays(): number {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let count = 0;
  for (let d = new Date(now); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

// Calculo de "faltante por dia"
export function getMissingPerDay(current: number, target: number): number {
  const remaining = getRemainingWorkDays();
  if (remaining <= 0) return 0;
  return Math.max(0, Math.ceil((target - current) / remaining));
}

// Formato de mes para query
export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}
```

### 5.5 `src/lib/constants.ts`

**O que criar:**
```typescript
export const AREA_LABELS: Record<string, string> = {
  produto: 'Produto',
  comercial: 'Comercial',
  gestor: 'Gestor',
};

export const ROLE_LABELS: Record<string, string> = {
  sdr: 'SDR',
  seller: 'Seller',
  closer: 'Closer',
  especialista: 'Especialista de Produto',
  gestora_produto: 'Gestora de Produto',
  gestor: 'Gestor',
};

export const AREA_COLORS: Record<string, string> = {
  produto: 'secondary',
  comercial: 'primary-container',
  gestor: 'primary',
};

export const ROLE_COLORS: Record<string, string> = {
  sdr: 'sdr',
  seller: 'seller',
  closer: 'closer',
  especialista: 'secondary',
  gestora_produto: 'secondary-light',
  gestor: 'primary',
};

export const FUNNEL_TABS = [
  { key: 'aplicacao', label: 'Aplicacao' },
  { key: 'isca_gratuita', label: 'Isca Gratuita' },
  { key: 'diagnostico', label: 'Diagnostico' },
  { key: 'aula_gratuita', label: 'Funil Aula Gratuita' },
];

export const ABORDAGEM_TIPOS = ['FDO', 'HBS Talks', 'Outros'];

export const RANKING_PERIODS = [
  { key: 'today', label: 'Hoje' },
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
];
```

### 5.6 `src/lib/calculations.ts`

**O que criar:**
```typescript
// Score de ranking Produto
// Formula: (resolvidos x pesoResolvidos) + (metaTMR / TMR x pesoTMR) - (bloqueios x pesoBloqueios)
export function calcProdutoScore(
  resolvidos: number,
  tmrHours: number,
  tmrMinutes: number,
  bloqueios: number,
  weights = { resolvidos: 3, tmr: 2, bloqueios: 1 }
): number {
  const tmrTotal = tmrHours + tmrMinutes / 60;
  const tmrScore = tmrTotal > 0 ? (2 / tmrTotal) * weights.tmr : weights.tmr * 2;
  return (resolvidos * weights.resolvidos) + tmrScore - (bloqueios * weights.bloqueios);
}

// Taxa de resolucao
export function calcResolutionRate(atendidos: number, resolvidos: number): number {
  if (atendidos === 0) return 0;
  return Math.round((resolvidos / atendidos) * 100);
}

// ROAS
export function calcROAS(faturamento: number, investimento: number): number {
  if (investimento === 0) return 0;
  return faturamento / investimento;
}

// CPL (Custo por Lead)
export function calcCPL(investimento: number, leads: number): number {
  if (leads === 0) return 0;
  return investimento / leads;
}

// CPA (Custo por Aquisicao)
export function calcCPA(investimento: number, vendas: number): number {
  if (vendas === 0) return 0;
  return investimento / vendas;
}
```

---

## 6. TYPES

### 6.1 `src/types/database.ts`

**O que criar:**
```typescript
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          area: 'produto' | 'comercial' | 'gestor';
          role: 'sdr' | 'seller' | 'closer' | 'especialista' | 'gestora_produto' | 'gestor';
          avatar_url: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      daily_reports: {
        Row: {
          id: string;
          user_id: string;
          report_date: string;
          area: string;
          role: string;
          data: Record<string, any>;
          submitted_at: string;
          edited_at: string | null;
          edited_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['daily_reports']['Row'], 'id' | 'submitted_at' | 'edited_at' | 'edited_by'>;
        Update: Partial<Database['public']['Tables']['daily_reports']['Insert']> & {
          edited_at?: string;
          edited_by?: string;
        };
      };
      monthly_goals: {
        Row: {
          id: string;
          month: string;
          area: 'produto' | 'comercial' | 'geral';
          metric: string;
          target: number;
          created_at: string;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['monthly_goals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['monthly_goals']['Insert']>;
      };
      ranking_weights: {
        Row: {
          id: string;
          area: 'produto' | 'comercial';
          weights: Record<string, number>;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['ranking_weights']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['ranking_weights']['Insert']>;
      };
      investment_metrics: {
        Row: {
          id: string;
          month: string;
          funnel: string;
          data: Record<string, any>;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['investment_metrics']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['investment_metrics']['Insert']>;
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type DailyReport = Database['public']['Tables']['daily_reports']['Row'];
export type MonthlyGoal = Database['public']['Tables']['monthly_goals']['Row'];
```

### 6.2 `src/types/forms.ts`

**O que criar:**
```typescript
import { z } from 'zod';

// ===== SDR =====
export const sdrSchema = z.object({
  abordagens_total: z.number().min(0),
  abordagens_tipos: z.array(z.string()).min(1, 'Selecione ao menos um tipo'),
  abordagens_descricao: z.string().optional().default(''),
  calls_agendadas: z.object({
    vtl: z.number().min(0),
    flw: z.number().min(0),
    outros: z.number().min(0),
  }),
  contatos_capturados: z.object({
    total: z.number().min(0),
    amht: z.number().min(0),
    vtl: z.number().min(0),
    flw: z.number().min(0),
    outros: z.number().min(0),
  }),
  crm_status: z.enum(['atualizado', 'pendente']),
  deu_certo: z.string().min(1, 'Campo obrigatorio'),
  a_melhorar: z.string().min(1, 'Campo obrigatorio'),
  atividades_amanha: z.string().min(1, 'Campo obrigatorio'),
});

// ===== SELLER =====
export const sellerSchema = z.object({
  abordagens: z.object({
    follow_up: z.number().min(0),
    conducoes: z.number().min(0),
    outros: z.number().min(0),
  }),
  cross: z.number().min(0),
  calls_agendadas: z.object({
    vtl: z.number().min(0),
    flw: z.number().min(0),
  }),
  contatos_capturados: z.object({
    total: z.number().min(0),
    amht: z.number().min(0),
    vtl: z.number().min(0),
    flw: z.number().min(0),
    outros: z.number().min(0),
  }),
  crm_status: z.enum(['atualizado', 'pendente']),
  deu_certo: z.string().min(1, 'Campo obrigatorio'),
  a_melhorar: z.string().min(1, 'Campo obrigatorio'),
  atividades_amanha: z.string().min(1, 'Campo obrigatorio'),
});

// ===== CLOSER =====
export const closerSchema = z.object({
  calls_agendadas: z.object({
    vtl: z.number().min(0),
    flw: z.number().min(0),
    amht: z.number().min(0),
    individual: z.number().min(0),
  }),
  calls_realizadas: z.object({
    vtl: z.number().min(0),
    flw: z.number().min(0),
    amht: z.number().min(0),
    individual: z.number().min(0),
  }),
  vendas: z.object({
    amht: z.number().min(0),
    vtl: z.number().min(0),
    flw: z.number().min(0),
  }),
  cash_collect_valor: z.number().min(0),
  cash_collect_descricao: z.string().optional().default(''),
  faturamento_dia: z.number().min(0),
  crm_status: z.enum(['atualizado', 'pendente']),
  deu_certo: z.string().min(1, 'Campo obrigatorio'),
  a_melhorar: z.string().min(1, 'Campo obrigatorio'),
});

// ===== PRODUTO (especialista + gestora) =====
export const produtoSchema = z.object({
  atendimentos: z.object({
    flw: z.number().min(0),
    vtl_amht_outros: z.number().min(0),
    sprint: z.number().min(0),
  }),
  atendimentos_total: z.number().min(0),
  resolvidos: z.object({
    flw: z.number().min(0),
    vtl_amht_outros: z.number().min(0),
    sprint: z.number().min(0),
  }),
  resolvidos_total: z.number().min(0),
  nao_sei_o_que_fazer: z.number().min(0),
  falta_clareza_qtd: z.number().min(0),
  falta_clareza_descricao: z.string().optional().default(''),
  tempo_medio_resposta_horas: z.number().min(0).max(23),
  tempo_medio_resposta_minutos: z.number().min(0).max(59),
  deu_certo: z.string().min(1, 'Campo obrigatorio'),
  a_melhorar: z.string().min(1, 'Campo obrigatorio'),
  atividades_amanha: z.string().min(1, 'Campo obrigatorio'),
});

export type SdrFormData = z.infer<typeof sdrSchema>;
export type SellerFormData = z.infer<typeof sellerSchema>;
export type CloserFormData = z.infer<typeof closerSchema>;
export type ProdutoFormData = z.infer<typeof produtoSchema>;
```

---

## 7. HOOKS

### 7.1 `src/hooks/useProfile.ts`

**O que criar:**
- Estado: `profile`, `loading`, `error`
- No mount: `supabase.auth.getUser()` -> buscar profile em `profiles` por `id`
- Retorna: `{ profile, loading, error, isGestor: profile?.area === 'gestor' }`
- Deve escutar `onAuthStateChange` para re-fetch em login/logout

### 7.2 `src/hooks/useSupabaseAuth.ts`

**O que criar:**
- `signIn(email, password)`: `supabase.auth.signInWithPassword` -> redirect `/dashboard`
- `signUp(email, password, metadata)`: `supabase.auth.signUp` com `options.data: { full_name, area, role }` -> trigger cria profile
- `signOut()`: `supabase.auth.signOut` -> redirect `/auth/login`
- Retorna: `{ signIn, signUp, signOut, loading, error }`

### 7.3 `src/hooks/useDailyReport.ts`

**O que criar:**
- `fetchTodayReport(userId)`: SELECT de `daily_reports` WHERE `user_id` AND `report_date = CURRENT_DATE`
- `submitReport(data)`: INSERT em `daily_reports` com `user_id`, `area`, `role`, `data`
- `updateReport(reportId, data, editorId)`: UPDATE `daily_reports` SET `data`, `edited_at = now()`, `edited_by`
- Estado: `report`, `loading`, `submitted`
- Guard: nao permite submit se `report` ja existe (exceto gestor via `updateReport`)
- Retorna: `{ report, loading, submitted, submitReport, updateReport, fetchTodayReport }`

### 7.4 `src/hooks/useTeamReports.ts`

**O que criar:**
- `fetchTeamReports(date, areaFilter?)`: SELECT `daily_reports` JOIN `profiles` WHERE `report_date`
- Realtime subscription: `supabase.channel('daily_reports')` com filter `report_date=eq.{hoje}`
  - On INSERT: adiciona ao state + dispara toast "[Nome] enviou o relatorio"
- Estado: `reports[]`, `loading`
- Retorna: `{ reports, loading, refresh }`

### 7.5 `src/hooks/useMonthlyGoals.ts`

**O que criar:**
- `fetchGoals(month)`: SELECT `monthly_goals` WHERE `month`
- `upsertGoal(goal)`: UPSERT `monthly_goals` (INSERT ... ON CONFLICT (month, area, metric) UPDATE)
- `deleteGoal(id)`: DELETE `monthly_goals` WHERE `id`
- Estado: `goals[]`, `loading`
- Retorna: `{ goals, loading, upsertGoal, deleteGoal, refresh }`

### 7.6 `src/hooks/useRealtime.ts`

**O que criar:**
- Hook generico: `useRealtime<T>(table, filter, onInsert, onUpdate, onDelete)`
- Cria canal Supabase, escuta eventos `postgres_changes`
- Cleanup no unmount: `supabase.removeChannel`

### 7.7 `src/hooks/useRankingWeights.ts`

**O que criar:**
- `fetchWeights(area)`: SELECT `ranking_weights` WHERE `area`
- `updateWeights(area, weights)`: UPSERT `ranking_weights`
- Retorna: `{ weights, loading, updateWeights }`

### 7.8 `src/hooks/useInvestmentMetrics.ts`

**O que criar:**
- `fetchMetrics(month)`: SELECT `investment_metrics` WHERE `month`
- `upsertMetrics(month, funnel, data)`: UPSERT `investment_metrics`
- Retorna: `{ metrics, loading, upsertMetrics }`

---

## 8. UI COMPONENTS — Design System (Referencia Stitch)

> Todos os componentes seguem o design system "The Curated Atelier":
> - Sem bordas opacas para secionar (usar shift tonal)
> - Diamond glyph (diamond) como elemento decorativo
> - Border-radius: 12px em cards, 24px em containers grandes
> - Sombras "ambient" com cor tinted (nunca preto puro)

### 8.1 `src/components/ui/Button.tsx`

**O que criar:**
- Variantes:
  - `primary`: bg `gradient-gold` (135deg #755b00 -> #c9a84c), text white, rounded-md, hover opacity 90
  - `secondary`: bg transparent, border 1px outline-variant 15% opacity, text primary, hover bg surface-low
  - `ghost`: text only + diamond accent antes do label
  - `danger`: bg soft-red, text white
- Tamanhos: `sm` (h-8 px-3 text-sm), `md` (h-10 px-4), `lg` (h-12 px-6 text-lg)
- Props: `variant`, `size`, `loading` (spinner), `icon` (Lucide), `disabled`
- Loading state: spinner + text "Enviando..."

### 8.2 `src/components/ui/Input.tsx`

**O que criar:**
- Estilo minimalista: apenas bottom-border 1px outline-variant
- Focus state: bottom-border transiciona para primary gold
- Label acima do input em `label-sm` uppercase com letter-spacing 0.1em
- Props: `label`, `error`, `type`, `icon` (Lucide ao lado esquerdo)
- Numeric variant: `type="number"`, min/max, step

### 8.3 `src/components/ui/Textarea.tsx`

**O que criar:**
- Mesmo estilo bottom-border do Input
- Auto-resize baseado no conteudo (min 3 rows)
- Label em `label-sm`
- Props: `label`, `error`, `maxLength` (com contador)

### 8.4 `src/components/ui/Badge.tsx`

**O que criar:**
- Variantes por area: `comercial` (bg gold/10%, text gold), `produto` (bg secondary/10%, text secondary)
- Variantes por role: `sdr`, `seller`, `closer`, `especialista`, `gestora_produto`, `gestor`
- Size: `sm` (text-xs px-2 py-0.5), `md` (text-sm px-3 py-1)
- Props: `area`, `role`, `size`
- Renderiza como `<span>` com rounded-full

### 8.5 `src/components/ui/Card.tsx`

**O que criar:**
- Variantes:
  - `default`: bg surface, rounded-md (12px), sem borda visivel, hover sutil
  - `elevated`: bg surface + shadow-sm
  - `comercial`: border-top 3px solid primary-container (gold)
  - `produto`: border-top 3px solid secondary (blue)
  - `glass`: bg surface 70% opacity, backdrop-blur-16px, ghost-border 1px outline-variant 15%
- Props: `variant`, `className`, `children`, `padding` (default: p-5)

### 8.6 `src/components/ui/ProgressBar.tsx`

**O que criar:**
- Barra: h-1.5 (6px) bg surface-high rounded-full
- Fill: height 100%, rounded-full, transicao width 500ms ease
- Cor condicional: >=70% gold | 40-69% yellow-500 | <40% soft-red
- Label opcional: percentual a direita
- Props: `value`, `max`, `showLabel`, `className`

### 8.7 `src/components/ui/Toast.tsx`

**O que criar:**
- Provider + hook: `useToast()` retorna `{ toast(message, type) }`
- Posicao: bottom-right, fixed
- Tipos: `success` (tertiary bg), `error` (error bg), `info` (secondary bg)
- Animacao: slide-in from right, auto-dismiss 4s
- Icone: CheckCircle / AlertTriangle / Info (Lucide)
- Props: `message`, `type`, `duration`

### 8.8 `src/components/ui/Skeleton.tsx`

**O que criar:**
- Variantes: `text` (h-4 rounded), `card` (h-32 rounded-md), `circle` (rounded-full)
- Animacao: pulse com bg surface-high
- Props: `variant`, `width`, `height`, `className`

### 8.9 `src/components/ui/Modal.tsx`

**O que criar:**
- Overlay: bg charcoal/50 fixed inset-0, backdrop-blur-sm
- Container: bg surface rounded-xl, shadow-lg, max-w-lg mx-auto, animacao scale-in
- Header: title (headline-md Playfair) + botao X
- Body: scroll se necessario
- Footer: slot para botoes
- Props: `open`, `onClose`, `title`, `children`, `footer`

### 8.10 `src/components/ui/Tabs.tsx`

**O que criar:**
- Container: flex gap-1, bg surface-container rounded-lg p-1
- Tab item: px-4 py-2 rounded-md text-body-md
- Active: bg surface text-on-surface font-medium
- Inactive: text-outline hover:text-on-surface-variant
- Props: `tabs: { key, label }[]`, `active`, `onChange`

### 8.11 `src/components/ui/Toggle.tsx`

**O que criar:**
- Estilo switch: w-11 h-6 rounded-full
- On: bg tertiary (verde olive), circle branco a direita
- Off: bg outline-variant, circle branco a esquerda
- Label ao lado: "Atualizado" (on) / "Pendente" (off)
- Props: `value`, `onChange`, `labelOn`, `labelOff`

### 8.12 `src/components/ui/ChipSelect.tsx`

**O que criar:**
- Multi-select via chips clicaveis
- Chip selecionado: bg primary-container text-on-primary rounded-full px-3 py-1
- Chip nao selecionado: bg surface-container text-on-surface-variant border outline-variant/15
- Props: `options: string[]`, `selected: string[]`, `onChange`

### 8.13 `src/components/ui/MoneyInput.tsx`

**O que criar:**
- Input com prefixo "R$" fixo a esquerda
- Mascara: formata como moeda brasileira ao digitar (1.500,00)
- Remove mascara ao enviar (numero puro)
- Props: extends Input + `onValueChange(numericValue: number)`

### 8.14 `src/components/ui/TimeInput.tsx`

**O que criar:**
- Dois inputs inline: `[__] h  [__] min`
- Semaforo automatico a direita: circulo verde/amber/vermelho baseado no valor
- Props: `hours`, `minutes`, `onChangeHours`, `onChangeMinutes`

### 8.15 `src/components/ui/AreaStepSelector.tsx`

**O que criar:**
- Step 1: dois cards grandes lado a lado (Produto | Comercial)
  - Card com icone Lucide (Package / TrendingUp), titulo, descricao
  - Selecionado: border primary-container, shadow-gold, bg surface
  - Nao selecionado: bg surface-container, hover shadow-sm
- Step 2: cards de funcao (dinamico por area selecionada)
  - Produto: Especialista | Gestora de Produto
  - Comercial: SDR | Seller | Closer
  - Cada card com icone + titulo + descricao da funcao
- Indicador de progresso: 2 dots, dot ativo = primary
- Props: `step`, `area`, `role`, `onSelectArea`, `onSelectRole`

---

## 9. LAYOUT COMPONENTS

### 9.1 `src/components/layout/Sidebar.tsx`

**Referencia visual:** Stitch screen "Painel Geral" — sidebar charcoal a esquerda

**O que criar:**
- Container: w-64 (desktop), bg charcoal (#2D2D25), h-screen, fixed left-0, flex flex-col
- Logo topo: "VITALE" em Playfair Display text-primary-light, text-xl, py-6 px-6
- Linha decorativa: h-0.5, bg linear-gradient por area do usuario:
  - Comercial: gradient gold (#755b00 -> #c9a84c)
  - Produto: gradient blue (#406181 -> #a8caee)
  - Gestor: gradient gold
- Nav items: flex flex-col gap-1 px-3
  - Item: flex items-center gap-3 px-3 py-2.5 rounded-md text-body-md
  - Ativo: bg surface/10%, text primary-light, font-medium
  - Inativo: text outline-variant, hover bg surface/5%
  - Icone: Lucide 20px
- Links:
  - LayoutDashboard — "Painel Geral" -> `/dashboard`
  - Package — "Produto" -> `/dashboard/produto`
  - TrendingUp — "Comercial" -> `/dashboard/comercial`
  - FileText — "Meu Relatorio" -> `/dashboard/relatorio` (oculto para gestor)
  - Separator
  - Target — "Metas" -> `/dashboard/gestao` (apenas gestor)
  - Users — "Equipe" -> `/dashboard/equipe` (apenas gestor)
  - Separator
  - Settings — "Configuracoes"
  - LogOut — "Sair"
- Perfil no rodape: avatar + nome + badges (area + role)
  - Dois badges: Badge area + Badge role
- Responsivo mobile: sidebar oculta, bottom-nav com 4-5 icones
- Responsivo tablet: sidebar colapsada (apenas icones, w-16)

### 9.2 `src/components/layout/Topbar.tsx`

**Referencia visual:** Stitch screen "Painel Geral" — barra superior

**O que criar:**
- Container: h-16, bg surface, flex items-center justify-between, px-6
- Esquerda: titulo da pagina atual (headline-md Playfair)
  - Overline: label-sm uppercase text-outline com diamond "Painel" / "Relatorio" / etc
  - Titulo: headline-md text-on-surface
- Direita: flex items-center gap-4
  - Data atual formatada: "07 de Abril, 2026" em body-md text-on-surface-variant
  - Icone Bell (notificacoes) com badge contador se houver novos relatorios
  - Avatar do usuario: w-9 h-9 rounded-full, iniciais se sem foto
  - Badge de area ao lado do avatar

---

## 10. PAGINAS — IMPLEMENTACAO DETALHADA

### 10.1 `src/app/auth/login/page.tsx`

**Referencia visual:** Stitch screen "Login & Cadastro"

**O que criar:**
- Layout split: esquerda (form) + direita (visual decorativo)
- Lado esquerdo (w-1/2):
  - Logo "VITALE" Playfair Display bold, text-primary
  - Subtitulo "Performance Dashboard" em label-sm uppercase
  - Form:
    - Input email (icone Mail)
    - Input senha (icone Lock, toggle visibilidade)
    - Checkbox "Lembrar-me"
    - Link "Esqueci minha senha"
    - Button primary "Entrar" full-width
    - Link "Criar conta" -> /auth/register
  - Validacao: react-hook-form + zod
  - Submit: `signIn(email, password)` -> redirect `/dashboard`
  - Erro: toast com mensagem de erro
- Lado direito (w-1/2):
  - bg gradient-gold com pattern decorativo
  - Texto motivacional em Playfair Display branco

### 10.2 `src/app/auth/register/page.tsx`

**Referencia visual:** Stitch screen "Login & Cadastro"

**O que criar:**
- Mesmo layout split do login
- Lado esquerdo:
  - Indicador de progresso: 2 steps com dots
  - **Step 1:**
    - Input "Nome completo" (icone User)
    - Input "E-mail corporativo" (icone Mail)
    - Input "Senha" (icone Lock) + confirmacao
    - AreaStepSelector step 1: escolher Produto ou Comercial
    - Button "Proximo" -> valida e avanca
  - **Step 2:**
    - Texto: "Selecione sua funcao em [area]"
    - AreaStepSelector step 2: cards de funcao
    - Button "Criar conta" -> `signUp(email, password, { full_name, area, role })`
  - Animacao entre steps: slide horizontal suave
  - Link "Ja tenho conta" -> /auth/login

### 10.3 `src/app/dashboard/layout.tsx`

**O que criar:**
- Server component que verifica auth via `createServerSupabaseClient`
- Se nao autenticado: redirect `/auth/login`
- Se autenticado: renderiza layout com Sidebar + Topbar + children
- Estrutura:
  ```
  <div className="flex h-screen">
    <Sidebar profile={profile} />
    <div className="flex-1 flex flex-col ml-64">
      <Topbar profile={profile} pageTitle={...} />
      <main className="flex-1 overflow-y-auto p-6 bg-background">
        {children}
      </main>
    </div>
  </div>
  ```
- ProfileProvider context: disponibiliza profile para toda a arvore

### 10.4 `src/app/dashboard/page.tsx` — Painel Geral

**Referencia visual:** Stitch screen "Painel Geral"

**O que criar:**

**Secao 1 — KPIs Comercial (linha de cards com borda top dourada):**
- Overline: "PERFORMANCE COMERCIAL" label-sm + diamond
- 4 KpiCards lado a lado em grid cols-4:
  1. **Faturamento**: valor atual R$, meta, faltante, faltante/dia, ProgressBar
  2. **Vendas**: contagem, meta, faltante, faltante/dia, ProgressBar
  3. **Agendamentos**: contagem, meta, faltante/dia, ProgressBar
  4. **Capturados**: contagem, meta, faltante/dia, ProgressBar
- Cada card: Card variant="comercial" (border-top gold)
- Dados: agregar `daily_reports` WHERE `area='comercial'` do mes atual + `monthly_goals`

**Secao 2 — KPIs Produto (linha de cards com borda top azul):**
- Overline: "PERFORMANCE PRODUTO" label-sm + diamond
- 4 KpiCards lado a lado:
  1. **Atendimentos hoje**: total do dia
  2. **Resolvidos hoje**: total do dia
  3. **TMR medio**: valor com semaforo (verde/amber/vermelho)
  4. **Bloqueios**: nao_sei_o_que_fazer + falta_clareza total
- Cada card: Card variant="produto" (border-top blue)
- Dados: agregar `daily_reports` WHERE `area='produto'` de hoje

**Secao 3 — Status Diario da Equipe:**
- Overline: "STATUS DA EQUIPE" label-sm
- Tabs component: Todos | Produto | Comercial
- TeamStatusTable:
  - Colunas: Avatar+Nome | Area+Funcao (badges) | Status (check/hourglass) | Horario envio | Acao
  - Status: check_circle verde se enviou, hourglass amber se pendente
  - Acao: botao "Ver" abre ReportViewModal; gestor ve "Editar" tambem
  - Linhas com alternancia tonal (surface vs surface-low) — SEM borders de grid
  - Realtime: subscription em `daily_reports` para hoje, atualiza status ao vivo
  - Toast discreto: "[Nome] enviou o relatorio de hoje" ao receber INSERT

### 10.5 `src/app/dashboard/produto/page.tsx` — Painel Produto

**Referencia visual:** Stitch screen "Painel Produto"

**O que criar:**

**Secao 1 — KPIs por Funil:**
- Grid cols-3: FLW | VTL/AMHT/OUTROS | SPRINT
- Cada card mostra: atendimentos e resolvidos por funil
- Card adicional: Taxa de resolucao total (%) com ProgressBar
- Card TMR medio do time com semaforo
- Card Bloqueios: total nao_sei + total falta_clareza (com lista de descricoes expandivel)

**Secao 2 — Grafico Atendimentos vs Resolvidos:**
- `AttendanceBarChart.tsx`
- Recharts BarChart agrupado
- Eixo X: FLW | VTL/AMHT | SPRINT
- 2 barras por grupo: Atendidos (cor gold #c9a84c) + Resolvidos (cor tertiary #476647)
- Tooltip: nome do funil, qtd atendidos, qtd resolvidos, % resolucao
- Estilo: barras com rounded-top, sem grid lines visivel, bg surface

**Secao 3 — Grafico TMR ao longo do mes:**
- `TmrLineChart.tsx`
- Recharts LineChart, curva `monotone`
- Eixo X: dias do mes (1, 2, 3...)
- Eixo Y: horas
- Linha principal: cor secondary (#406181), strokeWidth 2
- Linha de meta pontilhada: 2h, cor outline-variant, strokeDasharray="8 4"
- Dots: circulo preenchido nos pontos de dado
- Tooltip: data + valor TMR
- Area abaixo da linha: fill secondary/10%

**Secao 4 — Ranking Equipe Produto:**
- `RankingList.tsx` com props area="produto"
- Tabs: Hoje | Semana | Mes
- Tabela:
  - Colunas: Posicao | Avatar+Nome | Resolvidos | TMR | Bloqueios | Score
  - Top 3: medalhas (ouro/prata/bronze via icone Trophy com cor)
  - Score calculado: `(resolvidos x 3) + (metaTMR / TMR x 2) - (bloqueios x 1)`
  - Pesos editaveis por gestores (botao engrenagem abre form inline)
- Linhas alternadas tonal (sem borders)

**Secao 5 — Mini-status hoje (equipe Produto):**
- TeamStatusTable filtrado por area="produto"
- Versao compacta (menos colunas): Nome | Status | Horario

### 10.6 `src/app/dashboard/comercial/page.tsx` — Painel Comercial

**Referencia visual:** Stitch screen "Painel Comercial"

**O que criar:**

**Secao 1 — KPIs Comercial detalhados:**
- Grid cols-4: Faturamento | Vendas | Agendamentos | Capturados
- Cada card: KpiCard com valor, meta, ProgressBar, faltante/dia
- Cor da barra condicional: gold >=70%, amber 40-69%, red <40%

**Secao 2 — Funil de Conversao:**
- `FunnelChart.tsx`
- Barras horizontais decrescentes (Recharts BarChart horizontal)
- Etapas: Leads -> MQL -> Aplicou -> Agendou -> Reuniao -> Venda
- Largura proporcional ao valor
- Cor: gradiente gold (mais escuro no topo, mais claro na base)
- Labels: nome da etapa + valor numerico
- Tooltip: % conversao entre etapas adjacentes

**Secao 3 — Metricas por Funil:**
- `FunnelTabs.tsx`
- Tabs: Aplicacao | Isca Gratuita | Diagnostico | Funil Aula Gratuita
- Tabela por tab com colunas:
  - Leads, MQL, Aplicou, Agendamentos, Reuniao, Venda
  - %MQL, %Aplicacao, %Agend., %Reuniao, %Vendas
  - CPL, CPA, ROAS, Investimento, Faturamento, Ticket-medio, Saldo
- Linhas alternadas tonal

**Secao 4 — Ranking Comercial:**
- `RankingList.tsx` com props area="comercial"
- Tabs: SDR | Seller | Closer | Geral
- SDR/Seller: ordenar por capturados + agendamentos
- Closer: ordenar por vendas + faturamento + cash collect
- Top 3 com medalhas

**Secao 5 — Metricas de Investimento (apenas gestores):**
- `InvestmentMetrics.tsx`
- Grid cols-5: CPL | CPA | ROAS | Investimento | Saldo
- ROAS: cor tertiary (verde) se > 1, soft-red se < 1
- Trend indicator: seta para cima/baixo com % variacao

**Secao 6 — Mini-status hoje (equipe Comercial):**
- TeamStatusTable filtrado por area="comercial"

### 10.7 `src/app/dashboard/relatorio/page.tsx` — Meu Relatorio

**Referencia visual:** Stitch screen "Meu Relatorio"

**O que criar:**

**Logica principal:**
```
1. useProfile() -> { area, role }
2. Se area === 'gestor': redirecionar para /dashboard (gestores nao preenchem)
3. useDailyReport(userId, today)
4. Se report existe: modo leitura
5. Se nao existe: modo formulario
```

**Modo Leitura (pos-envio):**
- Banner topo: icone CheckCircle + "Relatorio enviado as HH:MM" bg tertiary-container
- Dados do relatorio renderizados em formato leitura (labels + valores)
- Se gestor visualizando: botao "Editar" que ativa modo edicao
- Dados de edicao: "Editado por [nome] em [data]" se edited_at existe

**Modo Formulario:**
- Renderizar form baseado no role:
  - `sdr` -> `<SdrForm />`
  - `seller` -> `<SellerForm />`
  - `closer` -> `<CloserForm />`
  - `especialista` | `gestora_produto` -> `<ProdutoForm />`
- Cada form usa react-hook-form + resolver zod
- Botao "Revisar e Enviar" abre ConfirmSubmitModal

### 10.8 `src/app/dashboard/gestao/page.tsx` — Metas do Mes

**O que criar:**
- Guard: se `area !== 'gestor'` -> redirect `/dashboard`
- Titulo: "Metas de [Mes Atual]" headline-md Playfair
- Tabs: Produto | Comercial | Geral

**Form de metas:**
- Select area + Input metrica (text) + Input target (numerico)
- Botao "Adicionar meta"

**Tabela de metas existentes:**
- Colunas: Area | Metrica | Meta | Acoes (editar/excluir)
- Edicao inline: clicar no valor da meta permite editar direto na celula
- Confirmacao: icone Check para salvar, X para cancelar

**Pesos dos Rankings:**
- Secao separada: "Pesos do Ranking"
- Produto: inputs para resolvidos, tmr, bloqueios (default 3, 2, 1)
- Comercial: inputs por funcao (SDR, Seller, Closer)
- Botao "Salvar pesos"

### 10.9 `src/app/dashboard/equipe/page.tsx` — Gestao da Equipe

**O que criar:**
- Guard: se `area !== 'gestor'` -> redirect `/dashboard`
- Titulo: "Equipe" headline-md Playfair

**Filtros:**
- Select area (Todos | Produto | Comercial)
- Select funcao (dinamico por area)

**Tabela de membros:**
- Colunas: Avatar+Nome | Area (badge) | Funcao (badge) | Ultimo relatorio (data) | Acoes
- Acoes:
  - "Ver relatorios" -> abre lista de datas com relatorios, cada um abre ReportViewModal
  - "Editar relatorio" -> selecionar data, abre formulario pre-preenchido
  - "Alterar funcao" -> dropdown com funcoes validas da area
  - "Promover a Gestor" -> modal de confirmacao com aviso

**Modal de promocao:**
- Titulo: "Promover [nome] a Gestor?"
- Aviso: "Esta acao ira alterar a area e funcao do membro. Gestores nao preenchem relatorios diarios."
- Botoes: "Cancelar" | "Confirmar Promocao"
- Acao: UPDATE profiles SET area='gestor', role='gestor'

**Historico de edicoes:**
- Ao ver um relatorio editado: badge "Editado" + "por [nome] em [data]"

---

## 11. DASHBOARD COMPONENTS — IMPLEMENTACAO

### 11.1 `src/components/dashboard/KpiCard.tsx`

**O que criar:**
- Props:
  ```typescript
  interface KpiCardProps {
    title: string;            // "Faturamento"
    value: number;            // 142500
    format: 'currency' | 'number' | 'time' | 'percent';
    target?: number;          // meta do mes
    area: 'comercial' | 'produto';
    icon?: LucideIcon;
    semaphore?: 'green' | 'amber' | 'red'; // para TMR
  }
  ```
- Layout:
  - Card com border-top por area (gold ou blue)
  - Overline: titulo em label-sm uppercase
  - Valor principal: display-lg Playfair (ou headline-md se menor)
  - Se target: "Meta: [target]" + ProgressBar + "Faltam: [faltante]" + "[X]/dia"
  - Se semaphore: circulo colorido ao lado do valor

### 11.2 `src/components/dashboard/TeamStatusTable.tsx`

**O que criar:**
- Props: `reports[]`, `profiles[]`, `filter: 'all' | 'produto' | 'comercial'`, `compact?: boolean`
- Tabela sem borders de grid (tonal rows: surface alternando com surface-low)
- Cada linha:
  - Avatar: iniciais em circulo colorido por area, ou imagem se avatar_url
  - Nome: body-md font-medium
  - Badges: Badge area + Badge role
  - Status: icone CheckCircle (tertiary) ou Clock (outline) + texto
  - Horario: submitted_at formatado HH:MM
  - Acao: Button ghost "Ver" -> abre ReportViewModal
- Se compact: omitir badges e horario

### 11.3 `src/components/dashboard/RankingList.tsx`

**O que criar:**
- Props: `area`, `period: 'today' | 'week' | 'month'`, `data[]`, `editable?: boolean`
- Tabela com linhas tonal alternadas
- Coluna posicao: top 3 com icones medal (Trophy)
  - 1o: cor gold #c9a84c
  - 2o: cor outline #7e7665
  - 3o: cor primary #755b00
- Avatar + nome + role badge
- Colunas de metricas variam por area (passadas como prop)
- Coluna score: font-bold text-primary

### 11.4 `src/components/dashboard/FunnelChart.tsx`

**O que criar:**
- Recharts BarChart layout="vertical"
- Barras horizontais com largura proporcional, cor gradiente gold
- Labels a esquerda: nome da etapa
- Labels dentro da barra: valor numerico
- Tooltip: valor + % conversao da etapa anterior
- Responsivo: ResponsiveContainer width="100%"

### 11.5 `src/components/dashboard/AttendanceBarChart.tsx`

**O que criar:**
- Recharts BarChart vertical agrupado
- Eixo X: categorias de funil (FLW, VTL/AMHT, SPRINT)
- 2 barras por grupo:
  - Atendidos: fill primary-container (#c9a84c)
  - Resolvidos: fill tertiary (#476647)
- Tooltip customizado: fundo surface, borda outline-variant, rounded-md
- Legenda: 2 items com cores
- CartesianGrid: horizontal only, stroke outline-variant/30%

### 11.6 `src/components/dashboard/TmrLineChart.tsx`

**O que criar:**
- Recharts LineChart / AreaChart
- Eixo X: dias do mes
- Eixo Y: horas (0, 1, 2, 3, 4, 5)
- Linha de dados: stroke secondary (#406181), strokeWidth 2, type monotone
- Area abaixo: fill secondary, fillOpacity 0.08
- ReferenceLine: y=2, stroke outline-variant, strokeDasharray="8 4", label "Meta 2h"
- Tooltip customizado: data + TMR formatado
- Dots ativados: fill secondary, r=4

### 11.7 `src/components/dashboard/FunnelTabs.tsx`

**O que criar:**
- Componente Tabs no topo: Aplicacao | Isca Gratuita | Diagnostico | Aula Gratuita
- Tabela abaixo com dados do funil selecionado
- Colunas fixas: metrica, valor
- Valores formatados: numeros inteiros, percentuais com %, monetarios com R$
- ROAS com cor condicional (verde > 1, vermelho < 1)

### 11.8 `src/components/dashboard/InvestmentMetrics.tsx`

**O que criar:**
- Grid cols-5 de cards pequenos
- Cada card: label-sm titulo + valor headline + trend indicator
- CPL, CPA: formatCurrency
- ROAS: numero com 1 decimal + cor condicional
- Investimento, Saldo: formatCurrency
- Trend: icone TrendingUp/TrendingDown + % em text-xs
- Editavel por gestor: double-click abre input inline

### 11.9 `src/components/dashboard/ReportViewModal.tsx`

**O que criar:**
- Modal com titulo: "Relatorio de [nome] - [data]"
- Renderiza campos baseado no role do report
- Layout: secoes com overlines (label-sm) + valores em body-md
- Valores zero: text-outline (muted)
- CRM pendente: badge amber com icone AlertTriangle
- Se editado: footer com "Editado por [nome] em [data]"
- Botao "Fechar" | "Editar" (apenas gestor)

---

## 12. FORMS — IMPLEMENTACAO

### 12.1 `src/components/forms/SdrForm.tsx`

**O que criar:**
- react-hook-form com zodResolver(sdrSchema)
- Secao 1 — Abordagens:
  - Input numerico "Total de abordagens"
  - ChipSelect "Tipos": FDO | HBS Talks | Outros
  - Textarea "Descricao" (opcional)
- Secao 2 — Calls Agendadas:
  - 3 inputs inline: VTL [ ] . FLW [ ] . Outros [ ]
- Secao 3 — Contatos Capturados:
  - 4 inputs inline: AMHT [ ] . VTL [ ] . FLW [ ] . Outros [ ]
  - Total: auto-soma exibido como label destacado
- Secao 4 — CRM:
  - Toggle: Atualizado / Pendente
- Secao 5 — Reflexoes:
  - Textarea "O que deu certo hoje?"
  - Textarea "O que melhorar?"
  - Textarea "Atividades para amanha"
- Botao "Revisar e Enviar" -> abre ConfirmSubmitModal com dados

### 12.2 `src/components/forms/SellerForm.tsx`

**O que criar:**
- react-hook-form com zodResolver(sellerSchema)
- Secao 1 — Abordagens: Follow-Up [ ] . Conducoes [ ] . Outros [ ] (inline)
- Secao 2 — Cross: Input numerico "Total cross"
- Secao 3 — Calls Agendadas: VTL [ ] . FLW [ ] (inline)
- Secao 4 — Contatos Capturados: AMHT [ ] . VTL [ ] . FLW [ ] . Outros [ ] + auto-soma
- Secao 5 — CRM: Toggle
- Secao 6 — Reflexoes: 3 textareas
- Botao "Revisar e Enviar"

### 12.3 `src/components/forms/CloserForm.tsx`

**O que criar:**
- react-hook-form com zodResolver(closerSchema)
- Secao 1 — Calls Agendadas: VTL [ ] . FLW [ ] . AMHT [ ] . Individual [ ] (inline)
- Secao 2 — Calls Realizadas: VTL [ ] . FLW [ ] . AMHT [ ] . Individual [ ] (inline)
- Secao 3 — Vendas: AMHT [ ] . VTL [ ] . FLW [ ] (inline)
- Secao 4 — Cash Collect:
  - MoneyInput "Valor R$"
  - Textarea "Descricao"
- Secao 5 — Faturamento do Dia: MoneyInput "Valor total R$"
- Secao 6 — CRM: Toggle
- Secao 7 — Reflexoes: 2 textareas (deu certo + a melhorar)
- Botao "Revisar e Enviar"

### 12.4 `src/components/forms/ProdutoForm.tsx`

**O que criar:**
- react-hook-form com zodResolver(produtoSchema)
- Usado por `especialista` E `gestora_produto` (mesmos campos)
- Secao 1 — Atendimentos:
  - 3 inputs inline: FLW [ ] . VTL/AMHT/Outros [ ] . SPRINT [ ]
  - Total: auto-soma exibido em destaque (headline-md)
- Secao 2 — Resolvidos:
  - 3 inputs inline: FLW [ ] . VTL/AMHT/Outros [ ] . SPRINT [ ]
  - Total auto-soma + Taxa de resolucao (% calculado automaticamente, exibido com ProgressBar)
- Secao 3 — Bloqueios:
  - Input numerico "Nao sei o que fazer agora"
  - Input numerico "Falta de clareza/direcionamento"
  - Textarea "Descricao da falta de clareza" (opcional, visivel se falta_clareza_qtd > 0)
- Secao 4 — TMR:
  - TimeInput: [ ] h [ ] min
  - Semaforo automatico: circulo verde (<2h) / amber (2-4h) / vermelho (>4h)
- Secao 5 — Reflexoes: 3 textareas
- Botao "Revisar e Enviar"

### 12.5 `src/components/forms/ConfirmSubmitModal.tsx`

**O que criar:**
- Props: `data` (form data), `role`, `onConfirm`, `onCancel`, `loading`
- Modal com titulo "Confirmar Envio do Relatorio"
- Tabela resumo: renderiza todos os campos preenchidos em pares label/valor
- Campos zero ou vazios: texto em text-outline (muted, mais claro)
- CRM pendente: badge amber com icone AlertTriangle
- Taxa de resolucao (Produto): calculada e exibida
- TMR (Produto): com semaforo
- Aviso: "Apos confirmar, apenas gestores poderao editar." em text-sm text-outline
- Botoes:
  - "Revisar" (secondary) -> fecha modal
  - "Confirmar Envio" (primary) com icone CheckCircle -> loading state -> submit -> toast sucesso

---

## 13. RESPONSIVIDADE

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

### Mobile (< 768px)
- Sidebar: oculta, substituida por bottom navigation bar fixa
  - Bottom nav: 4-5 icones (Home, Produto, Comercial, Relatorio, Menu)
  - Menu: abre drawer lateral com itens completos
- Topbar: compacta, apenas logo + avatar
- Grids: cols-1 para KPIs, stack vertical
- Tabelas: horizontal scroll ou cards empilhados
- Formularios: full-width, inputs empilhados (nao inline)

### Tablet (768px - 1024px)
- Sidebar: colapsada (w-16, apenas icones, tooltip no hover)
- Expand ao clicar no hamburger
- Grids: cols-2 para KPIs
- Tabelas: horizontal scroll se necessario

### Desktop (> 1024px)
- Sidebar: expandida (w-64)
- Grids: cols-4 para KPIs
- Tabelas: full-width

---

## 14. REALTIME

### Configuracao
- Canal: `daily_reports_today`
- Filtro: `report_date=eq.{CURRENT_DATE}`
- Eventos: INSERT, UPDATE

### Comportamento
- On INSERT:
  - Atualizar TeamStatusTable: status do membro muda de hourglass para check
  - Toast discreto: "[Nome] enviou o relatorio de hoje" com icone CheckCircle
  - Incrementar badge de notificacoes na Topbar
- On UPDATE (edicao por gestor):
  - Atualizar dados no TeamStatusTable se visivel
  - Nenhum toast (edicoes sao silenciosas)

### Implementacao
```typescript
// Em useTeamReports.ts
const channel = supabase
  .channel('daily_reports_today')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'daily_reports',
      filter: `report_date=eq.${format(new Date(), 'yyyy-MM-dd')}`,
    },
    (payload) => {
      // Adicionar ao state
      // Buscar profile do user_id para toast com nome
    }
  )
  .subscribe();
```

---

## 15. REGRAS DE NEGOCIO — GUARDS

| Regra | Onde aplicar | Como |
| ----- | ------------ | ---- |
| 1 relatorio/dia | `useDailyReport` + DB constraint UNIQUE(user_id, report_date) | Check antes de INSERT + constraint |
| Form bloqueado pos-envio | `relatorio/page.tsx` | Se report existe -> modo leitura |
| Edicao pos-envio so gestor | `ReportViewModal` + RLS | Botao visivel se `isGestor` + policy UPDATE |
| Gestores nao preenchem | `Sidebar` + `relatorio/page.tsx` | Ocultar link + redirect se gestor |
| Metas so gestor | `gestao/page.tsx` + RLS | Guard client + policy INSERT/UPDATE |
| Promocao so gestor | `equipe/page.tsx` + RLS | Guard client + policy UPDATE profiles |
| Retroativo so gestor | Forms | Gestor ve date-picker; membro nao |
| Metricas investimento | `InvestmentMetrics` | Editavel se `isGestor`, read-only caso contrario |
| Cadastro publico, gestor so promocao | `register/page.tsx` | Nao oferecer "gestor" como opcao no registro |

---

## 16. ORDEM DE IMPLEMENTACAO SUGERIDA

### Fase 1 — Fundacao
1. Inicializar projeto Next.js + TypeScript + Tailwind
2. Configurar `globals.css` com variaveis CSS
3. Configurar `tailwind.config.ts` com tokens
4. Configurar Supabase: client.ts, server.ts, middleware.ts
5. Executar migrations SQL (schema + RLS + trigger + realtime)
6. Criar types (database.ts + forms.ts)
7. Criar utils.ts + constants.ts + calculations.ts
8. Criar middleware.ts (auth guard)

### Fase 2 — Auth
9. Criar componentes UI base (Button, Input, Card, Badge, Modal)
10. Criar useSupabaseAuth hook
11. Criar useProfile hook
12. Criar pagina login
13. Criar pagina register (2 steps com AreaStepSelector)

### Fase 3 — Layout
14. Criar Sidebar
15. Criar Topbar
16. Criar dashboard/layout.tsx

### Fase 4 — Painel Geral
17. Criar KpiCard
18. Criar TeamStatusTable
19. Criar ReportViewModal
20. Criar useTeamReports + useMonthlyGoals
21. Montar dashboard/page.tsx
22. Implementar Realtime

### Fase 5 — Formularios
23. Criar ProgressBar, Toggle, ChipSelect, MoneyInput, TimeInput, Textarea
24. Criar SdrForm
25. Criar SellerForm
26. Criar CloserForm
27. Criar ProdutoForm
28. Criar ConfirmSubmitModal
29. Criar useDailyReport
30. Montar relatorio/page.tsx

### Fase 6 — Paineis Especificos
31. Criar AttendanceBarChart + TmrLineChart
32. Criar RankingList
33. Montar produto/page.tsx
34. Criar FunnelChart + FunnelTabs + InvestmentMetrics
35. Montar comercial/page.tsx

### Fase 7 — Gestao
36. Montar gestao/page.tsx (metas + pesos)
37. Montar equipe/page.tsx (membros + promocao)

### Fase 8 — Polish
38. Loading skeletons em todas as paginas
39. Toast notifications
40. Responsividade (mobile bottom-nav, tablet sidebar colapsada)
41. Tratamento de erro em todas as chamadas Supabase
42. Testes manuais de todos os fluxos
