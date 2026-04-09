import { z } from 'zod';

// SDR
export const sdrSchema = z.object({
  abordagens_total: z.number().min(0),
  abordagens_tipos: z.array(z.string()).min(1, 'Selecione ao menos um tipo'),
  abordagens_descricao: z.string().optional(),
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
  deu_certo: z.string().min(1, 'Campo obrigatório'),
  a_melhorar: z.string().min(1, 'Campo obrigatório'),
  atividades_amanha: z.string().min(1, 'Campo obrigatório'),
});
export type SdrFormData = z.infer<typeof sdrSchema>;

// Seller
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
  deu_certo: z.string().min(1, 'Campo obrigatório'),
  a_melhorar: z.string().min(1, 'Campo obrigatório'),
  atividades_amanha: z.string().min(1, 'Campo obrigatório'),
});
export type SellerFormData = z.infer<typeof sellerSchema>;

// Closer
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
  cash_collect_descricao: z.string(),
  faturamento_dia: z.number().min(0),
  crm_status: z.enum(['atualizado', 'pendente']),
  deu_certo: z.string().min(1, 'Campo obrigatório'),
  a_melhorar: z.string().min(1, 'Campo obrigatório'),
});
export type CloserFormData = z.infer<typeof closerSchema>;

// Produto (Especialista + Gestora de Produto)
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
  falta_clareza_descricao: z.string(),
  tempo_medio_resposta_horas: z.number().min(0),
  tempo_medio_resposta_minutos: z.number().min(0).max(59),
  deu_certo: z.string().min(1, 'Campo obrigatório'),
  a_melhorar: z.string().min(1, 'Campo obrigatório'),
  atividades_amanha: z.string().min(1, 'Campo obrigatório'),
});
export type ProdutoFormData = z.infer<typeof produtoSchema>;

// Register
export const registerSchema = z.object({
  full_name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
  area: z.enum(['produto', 'comercial', 'gestor']),
  role: z.string().min(1, 'Selecione uma função'),
});
export type RegisterFormData = z.infer<typeof registerSchema>;

// Login
export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});
export type LoginFormData = z.infer<typeof loginSchema>;
