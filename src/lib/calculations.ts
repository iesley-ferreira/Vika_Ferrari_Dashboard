// Calcula taxa de resolucao do produto
export function calcResolutionRate(resolvidos: number, atendimentos: number): number {
  if (atendimentos === 0) return 0;
  return Math.round((resolvidos / atendimentos) * 100);
}

// Semaforo do TMR (tempo medio de resposta em horas)
export type TmrStatus = 'green' | 'yellow' | 'red';
export function getTmrStatus(hours: number): TmrStatus {
  if (hours <= 2) return 'green';
  if (hours <= 4) return 'yellow';
  return 'red';
}

// Score de ranking comercial
export interface CommercialWeights {
  calls_agendadas: number;
  vendas: number;
  faturamento: number;
  contatos: number;
}

export function calcCommercialScore(
  data: Record<string, number>,
  weights: CommercialWeights
): number {
  return Object.entries(weights).reduce((score, [key, weight]) => {
    return score + (data[key] ?? 0) * weight;
  }, 0);
}

// Score de ranking produto
export interface ProductWeights {
  atendimentos_total: number;
  resolvidos_total: number;
  tempo_medio_resposta_horas: number;
}

export function calcProductScore(
  data: Record<string, number>,
  weights: ProductWeights
): number {
  const baseScore = Object.entries(weights).reduce((score, [key, weight]) => {
    if (key === 'tempo_medio_resposta_horas') {
      // Menor TMR = maior score (inverte)
      const tmr = data[key] ?? 8;
      return score + (Math.max(0, 8 - tmr) / 8) * weight;
    }
    return score + (data[key] ?? 0) * weight;
  }, 0);
  return Math.round(baseScore * 100) / 100;
}

// Calcula progresso percentual em relacao a meta
export function calcProgress(current: number, target: number): number {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
}

// Cor da barra de progresso por percentual
export type ProgressColor = 'green' | 'yellow' | 'red';
export function getProgressColor(percent: number): ProgressColor {
  if (percent >= 80) return 'green';
  if (percent >= 50) return 'yellow';
  return 'red';
}

// Score de ranking produto (usado em produto/page.tsx)
export function calcProdutoScore(
  resolvidos: number,
  tmrHoras: number,
  tmrMinutos: number,
  bloqueios: number
): number {
  const tmrTotal = tmrHoras + tmrMinutos / 60;
  const tmrBonus = Math.max(0, 4 - tmrTotal) * 5;
  return Math.round(resolvidos * 10 + tmrBonus - bloqueios * 2);
}
