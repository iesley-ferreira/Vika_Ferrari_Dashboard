# PRD — Responsividade Total: HBS Performance Dashboard

> **Objetivo:** Tornar o dashboard completamente responsivo e utilizável em dispositivos móveis (320px+), tablets (768px+) e desktops (1024px+), sem quebrar funcionalidades existentes.
>
> **Data de criação:** 2026-04-13  
> **Prioridade:** Alta  
> **Estimativa de escopo:** 8–12 arquivos modificados, nenhum novo arquivo de rota

---

## 1. Diagnóstico Atual

### Bloqueadores críticos (quebram mobile completamente)

| Problema | Arquivo | Detalhe |
|---|---|---|
| Sidebar fixa em 256px, sem toggle | `src/components/layout/Sidebar.tsx:73` | `fixed left-0 top-0 w-64` sem breakpoint — cobre toda a tela em mobile |
| Margem esquerda fixa | `src/app/dashboard/layout.tsx:33` | `ml-64` nunca se ajusta — conteúdo fica espremido ou oculto |
| Sem hambúrguer / menu mobile | `Sidebar.tsx` / `Topbar.tsx` | Não há botão de toggle nem overlay |

### Problemas de alta prioridade

| Problema | Arquivo | Detalhe |
|---|---|---|
| Grids saltam direto para `lg:` | `page.tsx`, `comercial/page.tsx`, `produto/page.tsx` | `grid-cols-2 lg:grid-cols-5` — sem breakpoint `md:`, tablets ficam com 2 colunas apertadas |
| Gráficos AmCharts não responsivos | `src/components/charts/ComercialCharts.tsx`, `ProdutoCharts.tsx`, `SalesRankingChart.tsx` | Padding, font-size e `minGridDistance` hardcoded; sem listener de resize |
| Tabela de gestão sem scroll/stack | `src/app/dashboard/gestao/page.tsx:242` | Tabela anual com ~10 colunas, sem `overflow-x-auto` efetivo no mobile |
| Modais com layout fixo | `src/app/dashboard/gestao/page.tsx:425–534` | `max-w-md` sem responsividade real — em 320px, conteúdo vaza |

### Problemas de média prioridade

| Problema | Arquivo | Detalhe |
|---|---|---|
| Inputs com font-size <16px | Formulários SdrForm, SellerForm, CloserForm, ProdutoForm | iOS faz auto-zoom em inputs com `text-sm` (14px) |
| Topbar não adapta conteúdo | `src/components/layout/Topbar.tsx:129` | Data já some com `hidden md:block`, mas sino e avatar não reorganizam bem |
| Tabela de equipe não stack | `src/app/dashboard/equipe/page.tsx` | Colunas de ações no mobile empilham mal |
| MiniDonutChart tamanho fixo | `src/components/charts/MiniDonutChart.tsx` | `size={64}` hardcoded — pode ser pequeno demais em mobile |

---

## 2. Breakpoints e Estratégia

### Sistema de breakpoints (Tailwind — mobile-first)

| Prefixo | Viewport | Dispositivo-alvo |
|---|---|---|
| *(sem prefixo)* | 0px+ | Mobile (320px–639px) |
| `sm:` | 640px+ | Mobile grande / landscape |
| `md:` | 768px+ | Tablet |
| `lg:` | 1024px+ | Desktop pequeno |
| `xl:` | 1280px+ | Desktop grande |

### Regra geral de desenvolvimento

> **Sempre escrever o estilo mobile primeiro**, depois adicionar `md:` e `lg:` para expandir. Nunca usar width fixo em px sem breakpoint que o anule em mobile.

---

## 3. Implementação — Detalhada por Arquivo

---

### 3.1 `src/app/dashboard/layout.tsx` — Layout Principal

**Problema:** `ml-64` sempre ativo + sem suporte a sidebar collapsível.

**Solução:** Transformar o layout em componente client-side com estado de sidebar, ou usar CSS transform para esconder a sidebar e remover a margem no mobile.

```tsx
// ANTES
<div className="flex-1 flex flex-col ml-64 min-h-0">

// DEPOIS
<div className={cn(
  'flex-1 flex flex-col min-h-0',
  'md:ml-64' // margem só a partir de tablet
)}>
```

O layout completo deve ficar:

```tsx
// layout.tsx
'use client';

import { useState } from 'react';

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
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
          onMenuToggle={() => setSidebarOpen(prev => !prev)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Nota sobre altura:** Usar `h-[100dvh]` em vez de `h-screen` para respeitar a barra de endereço do navegador mobile (Dynamic Viewport Height).

---

### 3.2 `src/components/layout/Sidebar.tsx` — Sidebar Responsiva

**Problema:** `fixed left-0 top-0 w-64` sem toggle — bloqueia mobile.

**Solução:** Sidebar desliza pela esquerda com CSS transform. Sempre visível em `md+`, oculta e collapsível em mobile.

```tsx
// Props adicionadas
interface SidebarProps {
  profile: Profile;
  isOpen: boolean;     // novo
  onClose: () => void; // novo
}

// Classe da aside
<aside className={cn(
  'fixed left-0 top-0 h-full w-64 bg-charcoal z-30',
  'flex flex-col transition-transform duration-300 ease-in-out',
  // Mobile: desliza para fora quando fechada
  isOpen ? 'translate-x-0' : '-translate-x-full',
  // Tablet+: sempre visível
  'md:translate-x-0'
)}>
  {/* Botão fechar — só mobile */}
  <button
    onClick={onClose}
    className="md:hidden absolute top-4 right-4 p-2 text-white/70 hover:text-white"
    aria-label="Fechar menu"
  >
    <X size={20} />
  </button>

  {/* ... conteúdo existente ... */}
</aside>
```

---

### 3.3 `src/components/layout/Topbar.tsx` — Topbar com Hambúrguer

**Problema:** Sem botão de menu mobile; informações não se reorganizam bem em telas pequenas.

**Solução:** Adicionar prop `onMenuToggle` e botão hambúrguer visível apenas em mobile.

```tsx
interface TopbarProps {
  profile: Profile;
  onMenuToggle: () => void; // novo
}

// Estrutura do header
<header className="h-14 md:h-16 bg-background border-b border-outline-variant flex items-center px-4 md:px-6 gap-3">

  {/* Botão hambúrguer — só mobile */}
  <button
    onClick={onMenuToggle}
    className="md:hidden p-2 -ml-2 text-on-surface hover:bg-white/5 rounded-md"
    aria-label="Abrir menu"
  >
    <Menu size={22} />
  </button>

  {/* Título da seção */}
  <div className="flex-1 min-w-0">
    <p className="text-label-sm uppercase text-on-surface-variant hidden md:block">◆ {section}</p>
    <h1 className="text-sm md:text-base font-semibold text-on-surface truncate">{title}</h1>
  </div>

  {/* Ações à direita */}
  <div className="flex items-center gap-2 md:gap-3 shrink-0">
    {/* Data — só desktop */}
    <span className="text-xs text-on-surface-variant hidden lg:block">{today}</span>
    
    {/* Sino */}
    <button className="p-2 rounded-md hover:bg-white/5 relative">
      <Bell size={20} />
      {/* badge de notificação */}
    </button>

    {/* Avatar — adapta tamanho */}
    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full overflow-hidden shrink-0">
      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
    </div>
  </div>
</header>
```

---

### 3.4 Grids de KPI Cards — Todos os Painéis

**Problema:** Saltos de `grid-cols-2` direto para `lg:grid-cols-5` sem breakpoint `md:`.

**Solução por painel:**

#### Dashboard (`page.tsx`) — Comercial + Produto
```tsx
// Comercial: 2 mobile → 3 tablet → 5 desktop
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">

// Produto: 2 mobile → 2 tablet → 4 desktop
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
```

#### Painel Comercial (`comercial/page.tsx`)
```tsx
// 2 mobile → 3 tablet → 3 desktop → 6 xl
<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
```

#### Painel Produto (`produto/page.tsx`)
```tsx
// 2 mobile → 4 tablet/desktop
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
```

#### KPI Card (`src/components/dashboard/KpiCard.tsx`)
Verificar que o conteúdo interno usa texto responsivo:
```tsx
// valor principal
<p className="text-lg md:text-xl lg:text-2xl font-bold">{value}</p>

// label
<p className="text-xs md:text-sm text-on-surface-variant truncate">{label}</p>
```

---

### 3.5 Gráficos AmCharts — Responsividade

**Problema:** Padding e font-sizes hardcoded; sem resize listener.

**Padrão a aplicar em `ComercialCharts.tsx`, `ProdutoCharts.tsx` e `SalesRankingChart.tsx`:**

```tsx
'use client';

import { useLayoutEffect, useRef, useEffect, useState } from 'react';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export function ComercialCharts({ data }) {
  const chartRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useLayoutEffect(() => {
    if (!chartRef.current) return;

    const root = am5.Root.new(chartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        paddingLeft: isMobile ? 0 : 10,
        paddingRight: isMobile ? 4 : 16,
        paddingTop: 4,
        paddingBottom: 4,
      })
    );

    // Configurar eixo X com fontes responsivas
    const xAxis = chart.xAxes.push(
      am5xy.DateAxis.new(root, {
        renderer: am5xy.AxisRendererX.new(root, {
          minGridDistance: isMobile ? 50 : 30,
        }),
      })
    );
    xAxis.get('renderer').labels.template.setAll({
      fontSize: isMobile ? 9 : 11,
      rotation: isMobile ? -45 : 0,
      centerY: isMobile ? am5.p50 : am5.p0,
      centerX: isMobile ? am5.p100 : am5.p50,
    });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        renderer: am5xy.AxisRendererY.new(root, {}),
      })
    );
    yAxis.get('renderer').labels.template.setAll({
      fontSize: isMobile ? 9 : 11,
    });

    // ... séries e dados ...

    return () => root.dispose();
  }, [data, isMobile]); // re-renderiza quando isMobile muda

  return (
    <div
      ref={chartRef}
      className="w-full"
      style={{ height: isMobile ? '220px' : '320px' }}
    />
  );
}
```

**Container dos gráficos nas páginas:**
```tsx
// Wrapping card com padding responsivo
<div className="bg-surface-low rounded-xl p-3 md:p-5">
  <h3 className="text-sm md:text-base font-semibold mb-3">{title}</h3>
  <ComercialCharts data={data} />
</div>
```

---

### 3.6 Tabela de Gestão (`gestao/page.tsx`) — Tabela Anual

**Problema:** Tabela com ~10+ colunas sem adaptação mobile.

**Solução:** Adicionar `overflow-x-auto` com hint de scroll + reduzir padding em mobile.

```tsx
{/* Wrapper com scroll horizontal */}
<div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 pb-2">
  <table className="w-full min-w-[700px] md:min-w-full text-xs md:text-sm">
    <thead>
      <tr className="border-b border-outline-variant">
        <th className="px-2 md:px-4 py-2 md:py-3 text-left font-semibold sticky left-0 bg-surface z-10 w-20 md:w-28">
          Mês
        </th>
        {/* demais colunas */}
      </tr>
    </thead>
    <tbody>
      {months.map(month => (
        <tr key={month} className="border-b border-outline-variant">
          <td className="px-2 md:px-4 py-1.5 md:py-2 sticky left-0 bg-surface z-10 text-xs md:text-sm font-medium">
            {getMonthLabel(month)}
          </td>
          {/* demais células */}
        </tr>
      ))}
    </tbody>
  </table>
  {/* Hint de scroll — só mobile */}
  <p className="md:hidden text-center text-xs text-on-surface-variant mt-2 pb-1">
    ← Deslize para ver mais colunas →
  </p>
</div>
```

**Sticky primeira coluna:** O atributo `sticky left-0` com `bg-surface` mantém o mês visível enquanto se rola horizontalmente.

---

### 3.7 Modais — Behavior de Sheet em Mobile

**Problema:** Modais centrados com `max-w-md` vazam em telas menores que 400px.

**Solução:** Em mobile, modal comporta-se como *bottom sheet* (ocupa toda a largura, ancora na base). Em tablet+, mantém o comportamento centralizado atual.

```tsx
{/* Overlay */}
<div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-0 md:p-4">

  {/* Painel do modal */}
  <div className="
    w-full md:max-w-md
    bg-surface
    rounded-t-2xl md:rounded-xl
    max-h-[90dvh] overflow-y-auto
    flex flex-col
  ">

    {/* Header com drag handle (mobile) */}
    <div className="flex justify-between items-center px-4 py-3 md:p-4 border-b border-outline-variant sticky top-0 bg-surface z-10">
      {/* linha de drag — só mobile */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-10 h-1 bg-outline-variant rounded-full md:hidden" />
      <h2 className="text-base font-semibold">{title}</h2>
      <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-md">
        <X size={18} />
      </button>
    </div>

    {/* Conteúdo */}
    <div className="px-4 py-4 space-y-4 flex-1">
      {/* Form / conteúdo */}
    </div>

    {/* Ações — sticky na base */}
    <div className="flex gap-2 p-4 border-t border-outline-variant sticky bottom-0 bg-surface">
      <button className="flex-1 px-4 py-2.5 border border-outline-variant rounded-lg hover:bg-surface-low text-sm">
        Cancelar
      </button>
      <button className="flex-1 px-4 py-2.5 bg-primary text-on-primary rounded-lg hover:opacity-90 text-sm font-medium">
        Confirmar
      </button>
    </div>
  </div>
</div>
```

**Grids dentro de modais — 1 coluna em mobile:**
```tsx
// ANTES: grid-cols-2 fixo
<div className="grid grid-cols-2 gap-3">

// DEPOIS: 1 coluna mobile, 2 colunas em sm+
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```

---

### 3.8 Formulários — Inputs e Font Size

**Problema:** Inputs com `text-sm` (14px) causam auto-zoom no iOS.

**Regra:** Todo `<input>`, `<select>` e `<textarea>` deve ter pelo menos `text-base` (16px) em mobile.

```tsx
// Padrão unificado para inputs
<input
  className={cn(
    'w-full px-3 py-2.5 md:py-2',
    'text-base md:text-sm',        // 16px mobile → 14px desktop
    'border border-outline-variant rounded-lg',
    'bg-surface text-on-surface',
    'focus:outline-none focus:ring-2 focus:ring-primary',
    'placeholder:text-on-surface-variant',
    'disabled:opacity-50',
  )}
  {...rest}
/>

// Mesmo padrão para <select>
<select className="w-full px-3 py-2.5 md:py-2 text-base md:text-sm border border-outline-variant rounded-lg bg-surface">
```

**Layout de formulários:**
```tsx
// 1 coluna mobile → 2 colunas sm+
<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
  <FormField label="Campo A" />
  <FormField label="Campo B" />
</div>

// Textarea mantém full width
<textarea className="w-full px-3 py-2.5 text-base md:text-sm ..." rows={3} />
```

---

### 3.9 Tabela da Equipe (`equipe/page.tsx`)

**Problema:** Colunas de ações empilham mal em mobile.

**Solução:** Abordagem dual — cards em mobile, tabela em tablet+.

```tsx
{/* Mobile: cards */}
<div className="md:hidden space-y-3">
  {members.map(member => (
    <div key={member.id} className="bg-surface-low rounded-xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <img src={member.avatar_url} className="w-10 h-10 rounded-full" alt={member.full_name} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{member.full_name}</p>
          <p className="text-xs text-on-surface-variant">{member.role} · {member.area}</p>
        </div>
        <StatusBadge status={member.reportStatus} />
      </div>
      <div className="flex gap-2">
        <button className="flex-1 py-2 text-xs border border-outline-variant rounded-lg hover:bg-surface">
          Ver relatório
        </button>
        <button className="flex-1 py-2 text-xs border border-primary/40 text-primary rounded-lg hover:bg-primary/10">
          Editar role
        </button>
      </div>
    </div>
  ))}
</div>

{/* Desktop: tabela */}
<div className="hidden md:block overflow-x-auto">
  <table className="w-full text-sm">
    {/* ... estrutura atual da tabela ... */}
  </table>
</div>
```

---

### 3.10 Página de Relatório (`relatorio/page.tsx`)

A página já usa `max-w-2xl mx-auto` — boa prática. Ajustes menores:

```tsx
// Padding responsivo no container
<div className="max-w-2xl mx-auto px-0 md:px-4">

// O card do formulário
<div className="bg-surface-low rounded-xl md:rounded-2xl p-4 md:p-6">
```

---

### 3.11 Safe Area — iPhones com Notch / Dynamic Island

Adicionar suporte a safe areas no layout principal:

```tsx
// src/app/dashboard/layout.tsx
<div className="flex bg-background" style={{ height: '100dvh' }}>

// Topbar: padding superior respeitando notch
<header className="
  h-14 md:h-16
  pt-[env(safe-area-inset-top,0px)]
  px-4 md:px-6
">

// Bottom navigation (se implementado)
<nav className="pb-[env(safe-area-inset-bottom,0px)]">
```

Em `globals.css`:
```css
/* Safe area support */
@supports (padding-top: env(safe-area-inset-top)) {
  .topbar {
    padding-top: env(safe-area-inset-top);
  }
  .bottom-nav {
    padding-bottom: env(safe-area-inset-bottom);
  }
}
```

---

### 3.12 Viewport Meta Tag (`src/app/layout.tsx`)

Verificar e garantir que o root layout contém:

```tsx
export const metadata: Metadata = {
  title: 'HBS Performance Dashboard',
  description: 'Dashboard interno HBS',
  // Viewport config
};

// Adicionar separadamente (Next.js 14 aceita viewport export):
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover', // suporte a notch
};
```

---

## 4. Checklist de Implementação

### Fase 1 — Desbloqueio Mobile (crítico)
- [ ] `layout.tsx`: Transformar em client component com estado `sidebarOpen`; trocar `ml-64` por `md:ml-64`
- [ ] `Sidebar.tsx`: Adicionar props `isOpen` / `onClose`; aplicar `translate-x-*` responsivo
- [ ] `Topbar.tsx`: Adicionar prop `onMenuToggle` e botão hambúrguer `md:hidden`
- [ ] Overlay de fechamento da sidebar no `layout.tsx`

### Fase 2 — Grids e Tipografia
- [ ] `page.tsx` (dashboard): Corrigir grids de KPI com breakpoint `md:`
- [ ] `comercial/page.tsx`: Corrigir grids de KPI e seção de gráficos
- [ ] `produto/page.tsx`: Corrigir grids de KPI e seção de gráficos
- [ ] Todos os inputs: `text-base md:text-sm` + `py-2.5 md:py-2`
- [ ] Verificar viewport export no root `layout.tsx`

### Fase 3 — Gráficos
- [ ] `ComercialCharts.tsx`: Hook `useIsMobile`, altura dinâmica, padding/fontes responsivos
- [ ] `ProdutoCharts.tsx`: Mesmas alterações
- [ ] `SalesRankingChart.tsx`: `minGridDistance` responsivo, fontes menores no mobile
- [ ] `MiniDonutChart.tsx`: Verificar se `size` precisa ser responsivo

### Fase 4 — Tabelas e Modais
- [ ] `gestao/page.tsx`: Wrapper `overflow-x-auto`, coluna sticky, hint de scroll, padding menor
- [ ] `gestao/page.tsx`: Modais convertidos para sheet em mobile (`items-end md:items-center`)
- [ ] `equipe/page.tsx`: View dual — cards mobile / tabela desktop
- [ ] `relatorio/page.tsx`: Padding responsivo no container

### Fase 5 — Polimento
- [ ] Testar em 320px, 375px, 390px, 768px, 1024px, 1280px
- [ ] Testar orientação landscape em tablet
- [ ] Verificar safe areas em iPhone (se disponível)
- [ ] Checar que nenhum texto fica truncado/sobreposto
- [ ] Testar modal como bottom-sheet em 375px

---

## 5. Padrões de Código a Seguir

### Nomenclatura de classes responsivas
```
// Sempre mobile-first
<div className="
  p-4           // mobile
  md:p-6        // tablet
  lg:p-8        // desktop
">
```

### Utilitário `cn()` para condicionais
```tsx
import { cn } from '@/lib/utils';

<aside className={cn(
  'fixed left-0 top-0 h-full w-64 bg-charcoal z-30',
  'transition-transform duration-300',
  isOpen ? 'translate-x-0' : '-translate-x-full',
  'md:translate-x-0' // sempre visível no tablet+
)} />
```

### Hook `useIsMobile` — reutilizável
Criar em `src/hooks/useIsMobile.ts`:
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

Uso:
```tsx
const isMobile = useIsMobile(); // padrão 768px
const isTablet = useIsMobile(1024);
```

### Alvos de toque mínimos (44×44px)
```tsx
// Todo botão interativo deve ter área mínima
<button className="p-2.5"> {/* 40px + bordas = ~44px */}
  <Icon size={20} />
</button>

// Itens de lista/nav
<a className="px-4 py-3 block"> {/* min 48px de altura */}
  Link
</a>
```

### Altura de tela — usar `dvh` em vez de `vh`
```tsx
// Evita problema de viewport em mobile quando a barra de endereço aparece/some
<div className="h-[100dvh]">
// ou
style={{ height: '100dvh' }}
```

---

## 6. O que NÃO Fazer

| Evitar | Motivo |
|---|---|
| `ml-64` ou `w-64` sem breakpoint `md:` | Quebra mobile — sidebar sobrepõe conteúdo |
| `text-sm` em inputs | iOS faz auto-zoom em fontes <16px |
| `h-screen` / `min-h-screen` sem fallback `dvh` | Barra de endereço mobile não é contabilizada |
| Padding/font-size hardcoded no AmCharts | Gráficos ficam ilegíveis em pequenas telas |
| Grid `grid-cols-N` sem breakpoints | Conteúdo estoura ou fica esmagado |
| `position: fixed` sem teste em iOS | SafeArea e notch causam sobreposição |
| `overflow: hidden` no root sem scroll no filho | Conteúdo desaparece em mobile |
| Modais com largura fixa em px | Vaza em 320px–375px |

---

## 7. Referências Técnicas

- [Tailwind CSS — Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [MDN — Viewport meta tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)
- [AmCharts 5 — Responsive](https://www.amcharts.com/docs/v5/tutorials/responsive-chart/)
- [CSS dvh unit — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/length#viewport-percentage_lengths)
- [Material Design 3 — Layout](https://m3.material.io/foundations/layout/overview)
- [Web.dev — Accessible tap targets](https://web.dev/accessible-tap-targets/)

---

*Documento criado em 2026-04-13. Atualizar conforme implementação avança.*
