# HBS Performance Dashboard

Dashboard interno de acompanhamento de performance das equipes Comercial e Produto da HBS.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript 5 |
| Estilização | Tailwind CSS 3 |
| Backend / Auth | Supabase (PostgreSQL + Auth + Realtime) |
| Gráficos | amCharts 5 |
| Formulários | React Hook Form + Zod |
| Ícones | Lucide React |
| Datas | date-fns |

---

## Requisitos

- Node.js 18+
- Conta e projeto no [Supabase](https://supabase.com)

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Crie um arquivo `.env.local` na raiz com:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 3. Banco de dados

Execute as migrations na ordem:

```bash
npm run db:migrate
```

Ou aplique manualmente via Supabase Studio na seguinte ordem:

```
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_auth_trigger.sql
supabase/migrations/004_realtime.sql
```

### 4. Popular usuários (opcional)

```bash
# Execute no SQL Editor do Supabase Studio
seed_usuarios.sql
```

---

## Rodando localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Estrutura do projeto

```
src/
├── app/
│   ├── auth/
│   │   ├── login/          # Página de login
│   │   └── register/       # Cadastro de conta
│   ├── dashboard/
│   │   ├── page.tsx              # Painel Geral
│   │   ├── comercial/page.tsx    # Painel Comercial
│   │   ├── produto/page.tsx      # Painel Produto
│   │   ├── relatorio/page.tsx    # Relatório Diário
│   │   ├── gestao/page.tsx       # Metas do Mês
│   │   ├── equipe/page.tsx       # Gestão de Equipe
│   │   └── configuracoes/page.tsx
│   └── api/
│       └── profile/route.ts
├── components/
│   ├── charts/
│   │   ├── ComercialCharts.tsx   # Gráficos de evolução comercial
│   │   ├── ProdutoCharts.tsx     # Gráficos de evolução produto
│   │   ├── SalesRankingChart.tsx # Ranking de vendas (barras)
│   │   └── MiniDonutChart.tsx    # Mini donut de participação
│   ├── dashboard/
│   │   ├── KpiCard.tsx           # Card de métrica com donut opcional
│   │   ├── TeamStatusTable.tsx   # Status diário da equipe
│   │   ├── ReportViewer.tsx      # Visualizador de relatório
│   │   └── RankingList.tsx       # Lista de ranking
│   ├── forms/
│   │   ├── SdrForm.tsx
│   │   ├── SellerForm.tsx
│   │   ├── CloserForm.tsx
│   │   └── ProdutoForm.tsx
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── Topbar.tsx
│   │   └── ProfileSetup.tsx
│   └── ui/                       # Primitivos de UI
│       ├── Button, Card, Badge, Input, Modal,
│           ProgressBar, Skeleton, Tabs, Toast,
│           Textarea, Toggle
├── hooks/
│   ├── useProfile.ts             # Perfil do usuário autenticado
│   ├── useReportsByDate.ts       # Relatórios de um dia específico
│   ├── useMonthReports.ts        # Série histórica do mês
│   ├── useDailyReport.ts         # Relatório do usuário atual
│   ├── useTeamReports.ts         # Relatórios da equipe
│   └── useMonthlyGoals.ts        # Metas mensais
├── lib/
│   ├── supabase/                 # Clients (browser, server, middleware)
│   ├── utils.ts                  # Formatação, cálculos auxiliares
│   ├── calculations.ts           # Pontuação e métricas
│   └── constants.ts
└── types/
    ├── database.ts               # Tipos do schema Supabase
    └── forms.ts                  # Schemas Zod dos formulários
```

---

## Perfis e funções

| Área | Função (`role`) | Acesso |
|---|---|---|
| Comercial | `sdr` | Painel Geral, Painel Comercial, Relatório |
| Comercial | `seller` | Painel Geral, Painel Comercial, Relatório |
| Comercial | `closer` | Painel Geral, Painel Comercial, Relatório |
| Produto | `especialista` | Painel Geral, Painel Produto, Relatório |
| Produto | `gestora_produto` | Painel Geral, Painel Produto, Relatório |
| — | `gestor` | Acesso completo + Gestão de Equipe + Metas |

---

## Scripts disponíveis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Inicia build de produção
npm run lint         # ESLint
npm run db:migrate   # Aplica migrations via script Node
npm run db:push      # Push das migrations via Supabase CLI
```

---

## Funcionalidades principais

- **Painel Geral** — KPIs do dia com donut de participação individual, status da equipe em tempo real via Supabase Realtime
- **Painel Comercial** — KPIs detalhados, evolução mensal em gráficos (faturamento, vendas, agendamentos, capturados), ranking de vendas
- **Painel Produto** — KPIs de atendimento, TMR, taxa de resolução, evolução mensal, ranking de equipe
- **Relatório Diário** — Formulário por função (SDR, Seller, Closer, Especialista/Gestora de Produto) com validação Zod
- **Gestão de Metas** — Definição de metas mensais por área e métrica
- **Gestão de Equipe** — Cadastro, edição e controle de perfis (gestor)
- **Configurações** — Edição de perfil e avatar
