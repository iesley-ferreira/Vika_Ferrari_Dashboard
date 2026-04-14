# SPEC — Responsividade Total: HBS Performance Dashboard

> Gerado a partir do `PRD_RESPONSIVIDADE.md` com análise do código real.  
> Cada item indica o arquivo exato, a linha relevante e a mudança precisa a fazer.

---

## Ordem de execução recomendada

1. Criar `useIsMobile` (novo arquivo, zero dependências)  
2. Layout + Sidebar + Topbar (desbloqueio mobile — sem isso o app é inutilizável)  
3. Viewport meta no root layout  
4. Grids de KPIs e KpiCard  
5. Gráficos AmCharts  
6. Tabela e modais de Gestão  
7. Equipe — view dual  
8. Input / Modal (componentes UI compartilhados)  
9. Formulários e página de Relatório  
10. Safe area em globals.css  

---

## 1. NOVO ARQUIVO — `src/hooks/useIsMobile.ts`

**Arquivo:** não existe ainda — criar.

```ts
'use client';

import { useEffect, useState } from 'react';

export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);

  return isMobile;
}
```

---

## 2. `src/app/layout.tsx`

**Problema:** sem `viewport` export — iOS não respeita escala inicial.  
**Linhas atuais:** 1–32 (arquivo completo, apenas `metadata` exportado).

### O que adicionar

Após o bloco `export const metadata`, adicionar:

```ts
import type { Metadata, Viewport } from 'next';

// mantém metadata existente:
export const metadata: Metadata = {
  title: 'HBS Performance',
  description: 'Dashboard de performance HBS',
};

// ADICIONAR:
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};
```

---

## 3. `src/app/dashboard/layout.tsx`

**Problema crítico:**
- É Server Component (async) — não pode ter estado React (`useState`). Precisa ser dividido: um server wrapper que busca o perfil + um client component filho que gerencia `sidebarOpen`.
- Linha 31: `h-screen` → deve ser `h-[100dvh]`
- Linha 33: `ml-64` sempre ativo → deve ser `md:ml-64`
- Linha 35: `p-6` fixo → deve ser `p-4 md:p-6`
- Falta overlay dark quando sidebar abre no mobile
- Falta passar `isOpen`/`onClose` para `<Sidebar>` e `onMenuToggle` para `<Topbar>`

### Estratégia

Manter a busca de perfil no Server Component, mas extrair o JSX de layout para um novo Client Component `DashboardLayoutClient`.

### Criar `src/components/layout/DashboardLayoutClient.tsx` (novo arquivo)

```tsx
'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ToastProvider } from '@/components/ui/Toast';
import type { Profile } from '@/types/database';

export function DashboardLayoutClient({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="flex h-[100dvh] bg-background overflow-hidden">
        <Sidebar
          profile={profile}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-h-0 md:ml-64">
          <Topbar
            profile={profile}
            onMenuToggle={() => setSidebarOpen((prev) => !prev)}
          />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
```

### Alterar `src/app/dashboard/layout.tsx`

Substituir o `return` do layout (linhas 29–42) para usar o novo client component:

```tsx
// REMOVER: import { Sidebar }, { Topbar }, { ToastProvider } direto aqui
// ADICIONAR import:
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient';

// O bloco return passa a ser:
return (
  <DashboardLayoutClient profile={profile}>
    {children}
  </DashboardLayoutClient>
);
```

O caso de "usuário sem perfil" (linhas 21–27) mantém o `<ToastProvider>` diretamente (sem sidebar/topbar), então não precisa mudar.

---

## 4. `src/components/layout/Sidebar.tsx`

**Problema crítico:** linha 73 — `fixed left-0 top-0` sem transform. Em mobile, bloqueia 100% da tela.

### Mudanças

**Linha 54–56 — interface `SidebarProps`:** adicionar `isOpen` e `onClose`:
```tsx
// ANTES
interface SidebarProps {
  profile: Profile;
}

// DEPOIS
interface SidebarProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
}
```

**Linha 58 — assinatura do componente:**
```tsx
// ANTES
export function Sidebar({ profile }: SidebarProps) {

// DEPOIS
export function Sidebar({ profile, isOpen, onClose }: SidebarProps) {
```

**Linha 73 — classe da `<aside>`:**
```tsx
// ANTES
<aside className="w-64 bg-charcoal h-screen fixed left-0 top-0 flex flex-col z-30">

// DEPOIS
<aside className={cn(
  'w-64 bg-charcoal h-[100dvh] fixed left-0 top-0 flex flex-col z-30',
  'transition-transform duration-300 ease-in-out',
  isOpen ? 'translate-x-0' : '-translate-x-full',
  'md:translate-x-0',
)}>
```

**Após a abertura da `<aside>` (linha 74), adicionar botão de fechar visível apenas no mobile:**
```tsx
{/* Botão fechar — só mobile */}
<button
  onClick={onClose}
  className="md:hidden absolute top-4 right-4 p-2 text-white/70 hover:text-white rounded-md"
  aria-label="Fechar menu"
>
  <X size={20} />
</button>
```

Adicionar `X` ao bloco de imports do lucide-react (linha 6–14).

**Links de nav (linhas 93–106 e 115–129):** adicionar `onClick={onClose}` em cada `<Link>` para fechar a sidebar ao navegar no mobile:
```tsx
<Link
  key={item.href}
  href={item.href}
  onClick={onClose}   // ADICIONAR
  className={cn(...)}
>
```
Aplicar o mesmo para os `GESTOR_ITEMS` (linhas 115–129) e para os links de "Configurações" (linha 138) e o perfil no rodapé (linha 158).

---

## 5. `src/components/layout/Topbar.tsx`

**Problema:** sem botão hambúrguer; header não reorganiza bem em mobile.

### Mudanças

**Linhas 32–34 — interface `TopbarProps`:** adicionar `onMenuToggle`:
```tsx
// ANTES
interface TopbarProps {
  profile: Profile;
}

// DEPOIS
interface TopbarProps {
  profile: Profile;
  onMenuToggle: () => void;
}
```

**Linha 36 — assinatura do componente:**
```tsx
// ANTES
export function Topbar({ profile }: TopbarProps) {

// DEPOIS
export function Topbar({ profile, onMenuToggle }: TopbarProps) {
```

**Linha 122 — `<header>`:**
```tsx
// ANTES
<header className="h-16 bg-background flex items-center justify-between px-6 border-b-2 border-outline-variant/40 shrink-0">

// DEPOIS
<header className="h-14 md:h-16 bg-background flex items-center gap-3 px-4 md:px-6 border-b-2 border-outline-variant/40 shrink-0">
```

**Dentro do header, logo após a abertura da tag, adicionar botão hambúrguer antes do bloco do título (linha 123):**
```tsx
{/* Hambúrguer — só mobile */}
<button
  onClick={onMenuToggle}
  className="md:hidden p-2 -ml-1 text-on-surface hover:bg-white/5 rounded-md shrink-0"
  aria-label="Abrir menu"
>
  <Menu size={22} />
</button>
```

Adicionar `Menu` ao import do lucide-react (linha 8).

**Bloco do título (linhas 123–126):** tornar o overline responsivo:
```tsx
// ANTES
<div>
  <p className="text-label-sm uppercase text-outline tracking-widest">◆ {page.overline}</p>
  <h1 className="font-serif text-xl font-semibold text-on-surface leading-tight">{page.title}</h1>
</div>

// DEPOIS
<div className="flex-1 min-w-0">
  <p className="text-label-sm uppercase text-outline tracking-widest hidden md:block">◆ {page.overline}</p>
  <h1 className="font-serif text-base md:text-xl font-semibold text-on-surface leading-tight truncate">{page.title}</h1>
</div>
```

**Bloco de ações à direita (linha 128):**
```tsx
// ANTES
<div className="flex items-center gap-4">

// DEPOIS
<div className="flex items-center gap-2 md:gap-4 shrink-0">
```

**Avatar (linhas 174–186):** reduzir gap e ocultar Badge no mobile:
```tsx
// ANTES
<div className="flex items-center gap-2">
  <div className={cn('w-9 h-9 rounded-full ...')}>
    ...
  </div>
  <Badge type="area" value={profile.area} size="sm" />
</div>

// DEPOIS
<div className="flex items-center gap-2">
  <div className={cn('w-8 h-8 md:w-9 md:h-9 rounded-full ...')}>
    ...
  </div>
  <Badge type="area" value={profile.area} size="sm" className="hidden sm:inline-flex" />
</div>
```

**Dropdown de notificação (linha 147):** garantir que não vaze em mobile:
```tsx
// ANTES
<div className="absolute right-0 top-9 w-72 ...">

// DEPOIS
<div className="absolute right-0 top-9 w-[calc(100vw-2rem)] sm:w-72 ...">
```

---

## 6. `src/app/dashboard/page.tsx`

### Grid KPIs Comercial — linhas 231 e 235

```tsx
// ANTES
<div className="grid grid-cols-2 lg:grid-cols-5 gap-3">

// DEPOIS
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
```
Alterar em **ambas** as ocorrências: linha 231 (skeleton) e linha 235 (conteúdo).

### Grid KPIs Produto — linhas 298 e 302

```tsx
// ANTES
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

// DEPOIS
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```
Alterar em **ambas** as ocorrências: linha 298 (skeleton) e linha 302 (conteúdo).

---

## 7. `src/app/dashboard/comercial/page.tsx`

### Grid KPIs — linhas 205 e 209

O grid atual `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` pula de 2 colunas direto para `lg:`. Adicionar `md:grid-cols-3` explicitamente:

```tsx
// ANTES
<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">

// DEPOIS
<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
```
Alterar em **ambas** as ocorrências (linhas 205 e 209).

---

## 8. `src/app/dashboard/produto/page.tsx`

### Grid KPIs — linhas 185 e 189

```tsx
// ANTES
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

// DEPOIS
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
```
Alterar em **ambas** as ocorrências (linhas 185 e 189).

---

## 9. `src/components/dashboard/KpiCard.tsx`

**Problema:** valores com `text-3xl` fixo — estoura em telas pequenas, especialmente com valores de moeda longos.

### Linha 75 — valor monetário (símbolo R$)

```tsx
// ANTES
<span className="font-serif text-lg font-bold text-on-surface-variant">

// DEPOIS
<span className="font-serif text-sm md:text-lg font-bold text-on-surface-variant">
```

### Linha 76 — valor monetário (número)

```tsx
// ANTES
<span className="font-serif text-3xl font-bold text-on-surface leading-none">

// DEPOIS
<span className="font-serif text-2xl md:text-3xl font-bold text-on-surface leading-none">
```

### Linha 80 — valor não-monetário

```tsx
// ANTES
<span className={cn('font-serif text-3xl font-bold text-on-surface leading-none')}>

// DEPOIS
<span className={cn('font-serif text-2xl md:text-3xl font-bold text-on-surface leading-none')}>
```

---

## 10. `src/components/charts/ComercialCharts.tsx`

**Problema:** `minGridDistance`, alturas e fontes hardcoded; sem hook de resize.

### Adicionar imports no topo (linha 1–8)

```tsx
// Adicionar ao bloco de imports existente:
import { useEffect, useState } from 'react';
import { useIsMobile } from '@/hooks/useIsMobile';
```

### Função `makeXAxis` (linhas 11–19): tornar `minGridDistance` parametrizável

```tsx
// ANTES
function makeXAxis(root: am5.Root, chart: am5xy.XYChart) {
  const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
  xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color('#7e7665') });

// DEPOIS
function makeXAxis(root: am5.Root, chart: am5xy.XYChart, isMobile = false) {
  const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: isMobile ? 50 : 30 });
  xRenderer.labels.template.setAll({
    fontSize: isMobile ? 9 : 10,
    rotation: isMobile ? -45 : 0,
    centerY: isMobile ? am5.p50 : am5.p0,
    centerX: isMobile ? am5.p100 : am5.p50,
    fill: am5.color('#7e7665'),
  });
```

### Cada componente de gráfico (ex. `FaturamentoChart`, `VendasChart`, `CapturadosChart`)

Para cada um deles:

1. Adicionar `const isMobile = useIsMobile();` dentro do componente.
2. Passar `isMobile` para `makeXAxis(root, chart, isMobile)`.
3. Alterar a altura do `<div>` de retorno:

```tsx
// ANTES (ex. linha 135)
return <div ref={ref} style={{ width: '100%', height: 240 }} />;

// DEPOIS
return <div ref={ref} style={{ width: '100%', height: isMobile ? 180 : 240 }} />;
```

4. Adicionar `isMobile` ao array de dependências do `useLayoutEffect`:

```tsx
// ANTES
}, [data]);

// DEPOIS
}, [data, isMobile]);
```

### Container de cada gráfico nas páginas (`comercial/page.tsx` e `produto/page.tsx`)

```tsx
// ANTES
<ComercialEvolutionCharts data={chartData} />

// DEPOIS
<div className="bg-surface-low rounded-xl p-3 md:p-5">
  <ComercialEvolutionCharts data={chartData} />
</div>
```

---

## 11. `src/components/charts/ProdutoCharts.tsx`

Mesmas alterações do item 10, adaptadas para os gráficos de produto:

- Adicionar `useIsMobile` import.
- Tornar `minGridDistance` responsivo nas funções helper equivalentes.
- Alterar altura de 240 → `isMobile ? 180 : 240` em cada componente de gráfico.
- Adicionar `isMobile` ao array de dependências do `useLayoutEffect`.

---

## 12. `src/components/charts/SalesRankingChart.tsx`

**Problema:** `minGridDistance: 60`, `paddingBottom: 50`, `paddingTop: 40` e `fontSize: 12` hardcoded.

### Adicionar import e hook (após linha 7)

```tsx
import { useIsMobile } from '@/hooks/useIsMobile';
```

### No componente `SalesRankingChart` (linha 19)

Adicionar antes do `useLayoutEffect`:

```tsx
const isMobile = useIsMobile();
```

### Bloco de configuração do `XYChart` (linhas 30–41)

```tsx
// ANTES
am5xy.XYChart.new(root, {
  ...
  paddingBottom: 50,
  paddingTop: 40,
  paddingLeft: 0,
  paddingRight: 0,
})

// DEPOIS
am5xy.XYChart.new(root, {
  ...
  paddingBottom: isMobile ? 30 : 50,
  paddingTop: isMobile ? 20 : 40,
  paddingLeft: 0,
  paddingRight: 0,
})
```

### Configuração do `xRenderer` (linhas 44–56)

```tsx
// ANTES
am5xy.AxisRendererX.new(root, {
  minorGridEnabled: true,
  minGridDistance: 60,
})
...
xRenderer.labels.template.setAll({
  fontSize: 12,
  ...
  maxWidth: 80,
})

// DEPOIS
am5xy.AxisRendererX.new(root, {
  minorGridEnabled: true,
  minGridDistance: isMobile ? 40 : 60,
})
...
xRenderer.labels.template.setAll({
  fontSize: isMobile ? 9 : 12,
  ...
  maxWidth: isMobile ? 50 : 80,
})
```

### Altura do `<div>` de retorno (procurar `height:` no final do componente)

```tsx
// ANTES
style={{ width: '100%', height: N }}

// DEPOIS
style={{ width: '100%', height: isMobile ? 220 : 340 }}
```

### Array de dependências do `useLayoutEffect`

```tsx
// ANTES
}, [entries]);

// DEPOIS
}, [entries, isMobile]);
```

---

## 13. `src/components/charts/MiniDonutChart.tsx`

**Problema:** `size = 72` (linha 19) e chamado com `size={64}` em `KpiCard.tsx:93`. Em telas muito pequenas pode ser excessivo mas não é crítico.

### Ajuste menor em `KpiCard.tsx` (linha 89–95)

Tornar o donut opcional em mobile muito pequeno via classe wrapper:

```tsx
// ANTES
{hasDonut && (
  <MiniDonutChart
    data={donutData!}
    size={64}
    formatValue={(v) => formatValue(v, format)}
  />
)}

// DEPOIS
{hasDonut && (
  <div className="hidden sm:block">
    <MiniDonutChart
      data={donutData!}
      size={56}
      formatValue={(v) => formatValue(v, format)}
    />
  </div>
)}
```

---

## 14. `src/app/dashboard/gestao/page.tsx`

### Tabela anual — linha 242

```tsx
// ANTES
<div className="bg-surface rounded-sm border border-outline-variant overflow-x-auto">
  <table className="w-full min-w-max">

// DEPOIS
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2 bg-surface rounded-sm border border-outline-variant">
  <table className="w-full min-w-[640px] text-xs md:text-sm">
```

### Coluna "Tri." (cabeçalho, linha 246) e "Mês" (linha 247) — adicionar `sticky` na coluna de mês

```tsx
// Cabeçalho — coluna "Mês":
<th className="text-left px-2 md:px-4 py-3 text-xs font-semibold text-outline w-24 md:w-32 sticky left-0 bg-surface-container/40 z-10">
  Mês
</th>

// Corpo — célula de mês (linha 288):
<td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm text-on-surface whitespace-nowrap sticky left-0 bg-surface z-10">
```

### Hint de scroll — adicionar após `</table>` (após linha 412)

```tsx
<p className="md:hidden text-center text-xs text-on-surface-variant mt-2 pb-1 px-4">
  ← Deslize para ver mais colunas →
</p>
```

### Modal "Nova meta" — overlay (linha 426–429)

```tsx
// ANTES
<div
  className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
  onClick={() => setShowAddModal(false)}
>

// DEPOIS
<div
  className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40"
  onClick={() => setShowAddModal(false)}
>
```

### Modal "Nova meta" — painel interno (linhas 430–432)

```tsx
// ANTES
<div
  className="bg-surface rounded-2xl border border-outline-variant p-6 w-full max-w-md shadow-2xl"
  onClick={(e) => e.stopPropagation()}
>

// DEPOIS
<div
  className="bg-surface rounded-t-2xl md:rounded-2xl border border-outline-variant p-5 md:p-6 w-full md:max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto"
  onClick={(e) => e.stopPropagation()}
>
```

### Drag handle no mobile — adicionar dentro do painel, antes do header (linha 434)

```tsx
{/* Drag handle — mobile */}
<div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-outline-variant rounded-full md:hidden" />
```

### Grid de campos do formulário do modal — linhas 442 e 472

```tsx
// ANTES (ambas as ocorrências)
<div className="grid grid-cols-2 gap-3">

// DEPOIS
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

### Selects e inputs dentro do modal — linhas 449, 463, 479, 496

Os selects têm `text-sm` e `py-2`, causando zoom no iOS:

```tsx
// ANTES
className="w-full border border-outline-variant rounded-lg px-3 py-2 text-sm bg-white text-on-surface"

// DEPOIS
className="w-full border border-outline-variant rounded-lg px-3 py-2.5 md:py-2 text-base md:text-sm bg-white text-on-surface"
```
Aplicar nas **4 ocorrências** de select/input do formulário modal.

---

## 15. `src/components/ui/Modal.tsx`

**Problema:** modal genérico usa `items-center` sem comportamento de bottom-sheet no mobile. Afeta modais em `equipe/page.tsx` e `dashboard/page.tsx`.

### Linha 27 — wrapper do overlay

```tsx
// ANTES
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">

// DEPOIS
<div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
```

### Linha 30–33 — painel do modal

```tsx
// ANTES
<div
  className={cn(
    'relative bg-surface rounded-md shadow-lg w-full max-w-lg max-h-[90vh] flex flex-col',
    className
  )}
>

// DEPOIS
<div
  className={cn(
    'relative bg-surface w-full md:max-w-lg max-h-[90dvh] flex flex-col',
    'rounded-t-2xl md:rounded-md shadow-lg',
    className
  )}
>
```

### Adicionar drag handle antes do header condicional (linha 35)

```tsx
{/* Drag handle — mobile */}
<div className="md:hidden absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-outline-variant rounded-full" />
```

---

## 16. `src/app/dashboard/equipe/page.tsx`

**Problema:** apenas tabela, sem adaptação mobile. Tabela com 5 colunas quebra em telas < 640px.

### Linha 224 — substituir a `<div>` que contém a tabela por uma estrutura dual

**Adicionar ANTES da `<div className="bg-surface rounded-md...">` (linha 224):**

```tsx
{/* ── Mobile: cards ─────────────────────────── */}
<div className="md:hidden space-y-3">
  {filtered.length === 0 ? (
    <p className="text-center py-10 text-sm text-on-surface-variant">
      Nenhum membro encontrado.
    </p>
  ) : (
    filtered.map((member) => (
      <div key={member.id} className="bg-surface border border-outline-variant rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{
              background: member.area === 'produto'
                ? 'linear-gradient(135deg, #406181, #a8caee)'
                : member.area === 'gestor'
                ? 'linear-gradient(135deg, #476647, #92b490)'
                : 'linear-gradient(135deg, #755b00, #c9a84c)',
            }}
          >
            {member.full_name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-on-surface truncate">{member.full_name}</p>
            <div className="flex gap-1 mt-0.5 flex-wrap">
              <Badge type="area" value={member.area} size="sm" />
              <Badge type="role" value={member.role} size="sm" />
            </div>
          </div>
          {/* Status hoje */}
          {member.area !== 'gestor' && (
            member.todayReport
              ? <CheckCircle2 size={18} style={{ color: '#476647' }} className="shrink-0" />
              : <Clock size={18} style={{ color: '#c9a84c' }} className="shrink-0" />
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          {member.lastReport && (
            <button
              onClick={() => { setViewReport(member.lastReport); setViewMember(member); }}
              className="flex-1 py-2 text-xs border border-outline-variant rounded-lg hover:bg-surface-low transition text-on-surface-variant"
            >
              Ver relatório
            </button>
          )}
          {member.area !== 'gestor' && (
            <>
              <button
                onClick={() => { setRoleTarget(member); setNewRole(member.role); }}
                className="flex-1 py-2 text-xs border border-outline-variant rounded-lg hover:bg-surface-low transition text-on-surface-variant"
              >
                Função
              </button>
              <button
                onClick={() => setPromoteTarget(member)}
                className="flex-1 py-2 text-xs border border-outline-variant rounded-lg hover:bg-surface-low transition"
                style={{ color: '#476647' }}
              >
                Gestor
              </button>
            </>
          )}
        </div>
      </div>
    ))
  )}
</div>
```

**Na `<div>` que envolve a tabela existente (linha 224), adicionar `hidden md:block`:**

```tsx
// ANTES
<div className="bg-surface rounded-md border border-outline-variant overflow-hidden">

// DEPOIS
<div className="hidden md:block bg-surface rounded-md border border-outline-variant overflow-hidden">
```

### Input de busca — linha 195

```tsx
// ANTES
className="border border-outline-variant rounded-md pl-9 pr-3 py-2 text-sm bg-white text-on-surface w-52"

// DEPOIS
className="border border-outline-variant rounded-md pl-9 pr-3 py-2.5 md:py-2 text-base md:text-sm bg-white text-on-surface w-full sm:w-52"
```

### Div de filtros — linha 187

```tsx
// ANTES
<div className="flex gap-3 items-center flex-wrap">

// DEPOIS
<div className="flex gap-3 items-center flex-wrap w-full">
```

---

## 17. `src/app/dashboard/relatorio/page.tsx`

**Problema:** container sem padding lateral em mobile.

### Linha 60 — div container principal

```tsx
// ANTES
<div className="max-w-2xl mx-auto">

// DEPOIS
<div className="max-w-2xl mx-auto px-0 sm:px-2">
```

---

## 18. `src/components/ui/Input.tsx`

**Problema:** `text-sm` e `py-2` fixos — iOS faz auto-zoom em inputs com fonte < 16px.

### Linha 36

```tsx
// ANTES
'w-full bg-transparent border-b border-outline-variant text-on-surface text-sm py-2 outline-none transition-colors',

// DEPOIS
'w-full bg-transparent border-b border-outline-variant text-on-surface text-base md:text-sm py-2.5 md:py-2 outline-none transition-colors',
```

---

## 19. Formulários — grids internos

### `src/components/forms/SdrForm.tsx`

**Linha 76 — grid de calls agendadas:**
```tsx
// ANTES
<div className="grid grid-cols-3 gap-4">

// DEPOIS
<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
```

**Linha 85 — grid de contatos capturados:**
```tsx
// ANTES
<div className="grid grid-cols-3 gap-4">

// DEPOIS
<div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
```

### `src/components/forms/SellerForm.tsx`

Inspecionar e aplicar o mesmo padrão para qualquer `grid-cols-3` ou `grid-cols-2` sem breakpoints `sm:`.

### `src/components/forms/CloserForm.tsx`

Mesma inspeção e correção de grids internos.

### `src/components/forms/ProdutoForm.tsx`

Mesma inspeção e correção de grids internos.

---

## 20. `src/app/globals.css`

**Problema:** sem suporte a safe area para iPhones com notch/Dynamic Island.

### Adicionar ao final do arquivo

```css
/* ── Safe area (iOS notch / Dynamic Island) ─────────── */
@supports (padding-top: env(safe-area-inset-top)) {
  .safe-area-topbar {
    padding-top: env(safe-area-inset-top);
  }
  .safe-area-bottom {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

### Em `DashboardLayoutClient.tsx` — adicionar à `<header>` via `Topbar`

Após criar o `DashboardLayoutClient`, adicionar `pt-[env(safe-area-inset-top,0px)]` ao `<header>` do Topbar:

```tsx
// Em Topbar.tsx, alterar o <header>:
<header className="h-14 md:h-16 bg-background flex items-center gap-3 px-4 md:px-6 border-b-2 border-outline-variant/40 shrink-0 pt-[env(safe-area-inset-top,0px)]">
```

---

## Checklist resumido

| # | Arquivo | O que fazer | Crítico? |
|---|---|---|---|
| 1 | `src/hooks/useIsMobile.ts` | Criar hook novo | Não (mas necessário para gráficos) |
| 2 | `src/app/layout.tsx` | Adicionar `export const viewport` | Sim |
| 3 | `src/app/dashboard/layout.tsx` | Usar `DashboardLayoutClient`; remover `h-screen`, `ml-64`, `p-6` | **Sim** |
| 4 | `src/components/layout/DashboardLayoutClient.tsx` | Criar client component com estado `sidebarOpen` | **Sim** |
| 5 | `src/components/layout/Sidebar.tsx` | Props `isOpen`/`onClose`; `translate-x-*`; botão X | **Sim** |
| 6 | `src/components/layout/Topbar.tsx` | Prop `onMenuToggle`; botão hambúrguer; título responsivo | **Sim** |
| 7 | `src/app/dashboard/page.tsx` | Grids: `md:grid-cols-3` e `md:grid-cols-4` | Alta |
| 8 | `src/app/dashboard/comercial/page.tsx` | Grid: `md:grid-cols-3` | Alta |
| 9 | `src/app/dashboard/produto/page.tsx` | Grid: `md:grid-cols-4` | Alta |
| 10 | `src/components/dashboard/KpiCard.tsx` | `text-2xl md:text-3xl`; donut hidden em mobile | Média |
| 11 | `src/components/charts/ComercialCharts.tsx` | `useIsMobile`; `minGridDistance` e altura responsivos | Média |
| 12 | `src/components/charts/ProdutoCharts.tsx` | Mesmas alterações de 11 | Média |
| 13 | `src/components/charts/SalesRankingChart.tsx` | `useIsMobile`; `minGridDistance`, paddings, altura responsivos | Média |
| 14 | `src/components/charts/MiniDonutChart.tsx` | `hidden sm:block` wrapper no KpiCard | Baixa |
| 15 | `src/app/dashboard/gestao/page.tsx` | Sticky col, scroll hint, modal bottom-sheet, grids 1-col mobile | Alta |
| 16 | `src/components/ui/Modal.tsx` | Bottom-sheet em mobile (`items-end`); `rounded-t-2xl` | Alta |
| 17 | `src/app/dashboard/equipe/page.tsx` | View dual cards/tabela; input busca responsivo | Alta |
| 18 | `src/app/dashboard/relatorio/page.tsx` | `px-0 sm:px-2` no container | Baixa |
| 19 | `src/components/ui/Input.tsx` | `text-base md:text-sm py-2.5 md:py-2` | Alta |
| 20 | `src/components/forms/SdrForm.tsx` | Grids `grid-cols-2 sm:grid-cols-3` | Média |
| 21 | `src/components/forms/SellerForm.tsx` | Inspecionar e corrigir grids | Média |
| 22 | `src/components/forms/CloserForm.tsx` | Inspecionar e corrigir grids | Média |
| 23 | `src/components/forms/ProdutoForm.tsx` | Inspecionar e corrigir grids | Média |
| 24 | `src/app/globals.css` | Safe area CSS | Baixa |

---

*Spec gerado em 2026-04-13 a partir de análise do código real. Atualizar conforme implementação avança.*
