# CLAUDE.md — HBS Performance Dashboard

> **Para agentes futuros:** Este arquivo é a fonte de verdade sobre o projeto. Após qualquer alteração de rotas, componentes, lógica de negócio ou estrutura, **atualize este documento**. Se adicionar uma nova feature, documente a rota, o hook e o comportamento. Se remover algo, remova a entrada correspondente aqui.

---

## Visão Geral

Dashboard de performance interno da HBS, construído em **Next.js 14 (App Router)** com **Supabase** como backend. Serve dois times: **Comercial** (SDR, Seller, Closer) e **Produto** (Especialista, Gestora). Cada colaborador submete um relatório diário, e gestores acompanham KPIs, rankings e metas em tempo real.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router, TypeScript estrito) |
| Auth + DB | Supabase (PostgreSQL + Realtime) |
| ORM / Client | @supabase/supabase-js 2.45 + @supabase/ssr 0.5 |
| Estilização | Tailwind CSS 3.4 + CSS custom properties (Material Design 3) |
| Ícones | lucide-react |
| Gráficos | Recharts 2.12 (linhas/barras) + amCharts 5 (avançados) |
| Formulários | React Hook Form 7.52 + Zod 3.23 |
| Datas | date-fns 3.6 (locale pt-BR) |
| Deploy | Vercel (Node 24.x) |

---

## Estrutura de Diretórios

```
src/
├── app/
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx              # Layout com sidebar + topbar
│   │   ├── page.tsx                # Overview (KPIs + status do time)
│   │   ├── comercial/page.tsx      # Painel Comercial
│   │   ├── produto/page.tsx        # Painel Produto
│   │   ├── relatorio/page.tsx      # Formulário de relatório diário
│   │   ├── gestao/page.tsx         # Gestão de metas mensais (gestor only)
│   │   ├── equipe/page.tsx         # Gestão do time (gestor only)
│   │   └── configuracoes/page.tsx  # Perfil e avatar
│   ├── api/
│   │   └── profile/route.ts        # POST (criar) / PATCH (atualizar) perfil
│   ├── layout.tsx                  # Root layout (fontes)
│   └── page.tsx                    # Redirect → /dashboard
├── components/
│   ├── charts/                     # ComercialCharts, ProdutoCharts, SalesRankingChart, MiniDonutChart
│   ├── dashboard/                  # KpiCard, TeamStatusTable, ReportViewer, RankingList
│   ├── forms/                      # SdrForm, SellerForm, CloserForm, ProdutoForm
│   ├── layout/                     # Sidebar, Topbar, ProfileSetup
│   └── ui/                         # Button, Card, Input, Modal, Badge, ProgressBar, Skeleton, Toast, Tabs, Toggle
├── hooks/
│   ├── useProfile.ts
│   ├── useDailyReport.ts
│   ├── useReportsByDate.ts
│   ├── useMonthReports.ts
│   ├── useTeamReports.ts
│   └── useMonthlyGoals.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # createBrowserClient
│   │   ├── server.ts               # createServerClient (cookies)
│   │   └── middleware.ts           # Lógica de redirect no middleware
│   ├── utils.ts                    # formatCurrency, formatDate, getMissingPerDay, etc.
│   ├── calculations.ts             # Scores, taxas, cores por threshold
│   └── constants.ts                # Áreas, roles, funis
├── types/
│   ├── database.ts                 # Tipos gerados do Supabase
│   └── forms.ts                    # Schemas Zod para todos os formulários
└── middleware.ts                   # Entry point do middleware Next.js
```

---

## Banco de Dados (Supabase PostgreSQL)

### Tabelas

#### `profiles`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID (PK) | FK → auth.users |
| `full_name` | text | |
| `area` | text | `'produto'` ou `'comercial'` |
| `role` | text | Ver roles abaixo |
| `avatar_url` | text | DiceBear ou upload customizado |
| `created_at` | timestamptz | |

**Roles válidas:** `sdr`, `seller`, `closer`, `especialista`, `gestora_produto`, `gestor`

#### `daily_reports`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK) | → profiles.id |
| `report_date` | date | |
| `area` | text | |
| `role` | text | |
| `data` | JSONB | Varia por role (ver schemas Zod) |
| `submitted_at` | timestamptz | |
| `edited_at` | timestamptz | Preenchido se gestor editou |
| `edited_by` | UUID | FK → profiles.id |

Unique: `(user_id, report_date)`. Realtime habilitado.

#### `monthly_goals`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | UUID (PK) | |
| `month` | text | Formato `'YYYY-MM'` |
| `area` | text | `'produto'`, `'comercial'` ou `'geral'` |
| `metric` | text | Ex: `'faturamento'`, `'vendas'` |
| `target` | numeric | |
| `updated_by` | UUID | FK → profiles.id |

Unique: `(month, area, metric)`.

#### `ranking_weights`
| Coluna | Tipo | Notas |
|---|---|---|
| `area` | text (unique) | `'produto'` ou `'comercial'` |
| `weights` | JSONB | Multiplicadores por métrica |
| `updated_by` | UUID | |

#### `investment_metrics`
| Coluna | Tipo | Notas |
|---|---|---|
| `month` | text | `'YYYY-MM'` |
| `funnel` | text | `'aplicacao'`, `'isca_gratuita'`, etc. |
| `data` | JSONB | |

### Row Level Security (RLS)
- **profiles:** Todos autenticados leem. Cada um atualiza o próprio. Gestores atualizam qualquer um.
- **daily_reports:** Cada um lê o próprio. Gestores leem todos.
- **monthly_goals / ranking_weights:** Gestores escrevem. Autenticados leem.
- API routes com `SUPABASE_SERVICE_ROLE_KEY` contornam RLS quando necessário.

---

## Rotas e Comportamento

### Rotas Públicas

#### `GET /auth/login`
Página de login. Formulário email + senha → `signInWithPassword`. Erro exibido inline. Link para `/auth/register`.

#### `GET /auth/register`
Registro em 3 passos:
1. Nome, email, senha, seleção de área (Produto / Comercial)
2. Seleção de role (baseada na área)
3. Aviso de confirmação de e-mail

Ao finalizar o passo 2: chama `auth.signUp()` e depois `POST /api/profile` para criar o registro em `profiles`. Avatar gerado automaticamente via DiceBear com seed no nome.

---

### Rotas Protegidas — Dashboard

Todas protegidas pelo middleware (`src/middleware.ts`). Usuários não autenticados são redirecionados para `/auth/login`.

#### `GET /dashboard`
**Overview principal.**
- Usa `useReportsByDate(date)` para carregar todos os relatórios do dia selecionado.
- Usa `useTeamReports()` com Realtime subscription para atualizar ao vivo.
- KPIs agregados:
  - **Comercial:** Faturamento, Vendas, Agendamentos, Calls, Capturados
  - **Produto:** Atendimentos, Resolvidos, TMR Médio, Bloqueios
- Mini donuts: participação do usuário vs time.
- Tabela `TeamStatusTable` com status de todos os membros (enviou/pendente + hora).
- Date picker para navegar em dias históricos.
- Notificação toast quando um membro submete relatório.
- Topbar com sino de notificação para não-gestores: se faltar relatório diário, mostra aviso com CTA **"Preencher agora"** para `/dashboard/relatorio`; ao enviar o relatório, o aviso some automaticamente.

#### `GET /dashboard/comercial`
**Painel detalhado do time Comercial.**
- KPIs do dia (mesmo do overview + Cash Collect).
- Gráficos de evolução do mês (`ComercialCharts`): faturamento, vendas, agendamentos, capturados — renderizados com Recharts.
- Ranking dos membros por score (`SalesRankingChart`): horizontal bar chart.
- Filtro de ranking por role: SDR, Seller, Closer.
- **Score Comercial:** `Vendas * 5 + Faturamento / 1000`

#### `GET /dashboard/produto`
**Painel detalhado do time Produto.**
- KPIs do dia: Atendimentos, Resolvidos, TMR Médio, Taxa de Resolução, Bloqueios.
- Gráficos de evolução do mês (`ProdutoCharts`).
- Ranking com score.
- TMR com semáforo de cor: verde <2h, amarelo <4h, vermelho >4h.
- **Score Produto:** `Resolvidos * 10 + max(0, 4 - TMR_h) * 5 - Bloqueios * 2`

#### `GET /dashboard/relatorio`
**Formulário de relatório diário.**
- Rota inacessível para gestores (redirecionados).
- Exibe o formulário correto de acordo com `profile.role`:
  - `sdr` → `SdrForm`
  - `seller` → `SellerForm`
  - `closer` → `CloserForm`
  - `especialista` / `gestora_produto` → `ProdutoForm`
- Se relatório já foi enviado, exibe `ReportViewer` com opção de editar.
- Timestamps de envio e edição exibidos.
- Hooks: `useProfile`, `useDailyReport`.

#### `GET /dashboard/gestao` _(gestor only)_
**Gestão de metas mensais.**
- CRUD via `useMonthlyGoals(month)`.
- Filtro por área: Comercial, Produto, Geral.
- Seleção de métrica (ex: `faturamento`, `vendas`, `atendimentos`).
- Edição inline com save/cancel.
- Metas exibidas agrupadas por área.

#### `GET /dashboard/equipe` _(gestor only)_
**Gestão da equipe.**
- Lista todos os membros com área, role e status do relatório de hoje.
- Filtro por área, busca por nome.
- Ações: alterar role, promover a gestor.
- Botão "Ver relatório" (e clique na data do último relatório) abre modal com `ReportViewer`, com o mesmo visual de leitura usado no overview (`/dashboard`).
- Histórico de relatórios por membro (data + horário + se foi editado).

#### `GET /dashboard/configuracoes`
**Perfil do usuário.**
- Editar nome.
- Upload de avatar (drag-drop ou click) → Supabase Storage.
- Email, área e role são somente leitura (gestor altera via `/equipe`).
- Card de capa com gradiente baseado na área.

---

### API Routes

#### `POST /api/profile`
Cria perfil no banco após registro.
- **Body:** `{ id, full_name, area, role }`
- Usa `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS.
- Gera `avatar_url` via DiceBear com seed no nome.
- Retorna `200` ou erro descritivo.

#### `PATCH /api/profile`
Atualiza perfil (somente gestor).
- **Body:** `{ id, area?, role?, full_name? }`
- Valida que quem faz a requisição é gestor.
- Usa service key para atualizar qualquer perfil.

---

## Autenticação e Middleware

**Fluxo:**
1. Registro → email de confirmação → login.
2. `middleware.ts` intercepta todas as rotas `/dashboard/*`: usuário sem sessão → redirect `/auth/login`.
3. Usuário autenticado em `/auth/*` → redirect `/dashboard`.
4. Componente `ProfileSetup` exibido para usuários sem perfil completo (primeiro acesso pós-confirmação).

**Clientes Supabase:**
- `lib/supabase/client.ts` → `createBrowserClient` (uso em hooks/componentes client-side)
- `lib/supabase/server.ts` → `createServerClient` com cookies (uso em Server Components e API routes)

---

## Hooks Customizados

| Hook | Propósito |
|---|---|
| `useProfile()` | Perfil do usuário autenticado. Retorna `{ profile, loading, isGestor }` |
| `useDailyReport(userId)` | Relatório de hoje. Retorna `{ report, submitReport(), updateReport() }` |
| `useReportsByDate(date)` | Todos os relatórios de uma data. Join com profiles. |
| `useMonthReports(month)` | Relatórios do mês agregados por dia para gráficos |
| `useTeamReports()` | Relatórios de hoje com Realtime subscription |
| `useMonthlyGoals(month)` | CRUD de metas mensais |

---

## Lógica de Cálculo (`lib/calculations.ts`)

```ts
calcResolutionRate(resolvidos, atendimentos)  // (resolvidos / atendimentos) * 100
getTmrStatus(hours)                            // 'green' | 'yellow' | 'red'
calcProdutoScore(resolvidos, tmrH, tmrM, bloqueios)
calcCommercialScore(data, weights)
calcProgress(current, target)                  // capped at 100%
getProgressColor(percent)                      // green ≥80%, yellow ≥50%, red <50%
```

---

## Utilitários (`lib/utils.ts`)

```ts
formatCurrency(value)          // R$ 1.234,56
formatDate(date, pattern)      // pt-BR
getCurrentMonth()              // 'YYYY-MM'
getRemainingWorkDays()         // dias úteis restantes no mês
getMissingPerDay(current, target)  // (target - current) / remaining_days
getMonthLabel(month)           // "Abril 2026"
```

---

## Schemas de Formulários (`src/types/forms.ts`)

### SDR
```ts
{ abordagens_total, abordagens_tipos[], calls_agendadas: { vtl, flw, outros },
  contatos_capturados: { total, amht, vtl, flw, outros }, crm_status,
  deu_certo, a_melhorar, atividades_amanha }
```

### Seller
Idêntico ao SDR com adição de `cross` (cross-sells).

### Closer
```ts
{ calls_agendadas: { vtl, flw, amht, individual },
  calls_realizadas: { vtl, flw, amht, individual },
  vendas: { amht, vtl, flw }, cash_collect_valor, cash_collect_descricao,
  faturamento_dia, crm_status, deu_certo, a_melhorar }
```

### Produto (Especialista / Gestora)
```ts
{ atendimentos: { flw, vtl_amht_outros, sprint }, atendimentos_total,
  resolvidos: { flw, vtl_amht_outros, sprint }, resolvidos_total,
  nao_sei_o_que_fazer, falta_clareza_qtd, falta_clareza_descricao,
  tempo_medio_resposta_horas, tempo_medio_resposta_minutos,
  deu_certo, a_melhorar, atividades_amanha }
```

---

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=          # URL pública do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Chave anônima (browser-safe)
SUPABASE_SERVICE_ROLE_KEY=         # Chave de serviço (somente servidor, bypass RLS)
```

---

## Cores e Identidade Visual

| Elemento | Valor |
|---|---|
| Área Produto | `#406181` (azul) |
| Área Comercial | `#755b00` (dourado) |
| Gestor | `#476647` (verde) |
| Status OK | `#476647` |
| Status Alerta | `#c9a84c` |
| Status Crítico | `#ba1a1a` |

Tipografia: **Playfair Display** (títulos) + **Inter** (corpo).

---

## Comandos Úteis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run start        # Servidor de produção
npm run lint         # ESLint
npm run db:push      # Push de schema via Supabase CLI
npm run db:migrate   # Aplicar migrações via script Node
```

---

## Instruções para Agentes Futuros

1. **Antes de qualquer alteração**, leia os arquivos relevantes — não assuma baseado apenas neste documento.
2. **Ao adicionar uma rota/page:** documente-a na seção "Rotas e Comportamento" com o que ela faz, quais hooks usa e quem tem acesso.
3. **Ao adicionar um hook:** documente-o na seção "Hooks Customizados".
4. **Ao modificar o schema do banco:** atualize a seção "Banco de Dados".
5. **Ao adicionar um schema de formulário:** atualize a seção "Schemas de Formulários".
6. **Ao alterar lógica de cálculo:** atualize a seção "Lógica de Cálculo".
7. **Ao adicionar variáveis de ambiente:** documente em "Variáveis de Ambiente".
8. **Nunca remova seções** sem substituí-las por informação atualizada.
9. **Contexto de negócio:** este é um sistema interno da HBS. Julgue features pela utilidade operacional para times de Comercial e Produto, não por complexidade técnica.
10. **RLS é crítico:** qualquer nova tabela deve ter política de RLS definida, especialmente para operações de escrita de gestores.
