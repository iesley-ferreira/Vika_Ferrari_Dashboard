export const AREAS = {
  produto: 'Produto',
  comercial: 'Comercial',
  gestor: 'Gestor',
} as const;

export const ROLES = {
  especialista: 'Especialista',
  gestora_produto: 'Gestora de Produto',
  sdr: 'SDR',
  seller: 'Seller',
  closer: 'Closer',
  gestor: 'Gestor',
} as const;

export const FUNNEL_LABELS = {
  aplicacao: 'Aplicação',
  isca_gratuita: 'Isca Gratuita',
  diagnostico: 'Diagnóstico',
  aula_gratuita: 'Aula Gratuita',
} as const;

export const FUNNELS = Object.keys(FUNNEL_LABELS) as Array<keyof typeof FUNNEL_LABELS>;

export const CRM_STATUS_LABELS = {
  atualizado: 'Atualizado',
  pendente: 'Pendente',
} as const;

export const ABORDAGEM_TIPOS = ['FDO', 'HBS Talks', 'Outros'] as const;

export const AREA_ROLES: Record<string, string[]> = {
  produto: ['especialista', 'gestora_produto'],
  comercial: ['sdr', 'seller', 'closer'],
  gestor: ['gestor'],
};
