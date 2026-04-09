'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { produtoSchema, type ProdutoFormData } from '@/types/forms';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getTmrSemaphore } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface ProdutoFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

const SEMAPHORE_COLORS = {
  green: 'bg-tertiary',
  amber: 'bg-yellow-500',
  red: 'bg-soft-red',
};

export function ProdutoForm({ onSubmit, submitting }: ProdutoFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: {
      atendimentos: { flw: 0, vtl_amht_outros: 0, sprint: 0 },
      atendimentos_total: 0,
      resolvidos: { flw: 0, vtl_amht_outros: 0, sprint: 0 },
      resolvidos_total: 0,
      nao_sei_o_que_fazer: 0,
      falta_clareza_qtd: 0,
      tempo_medio_resposta_horas: 0,
      tempo_medio_resposta_minutos: 0,
    },
  });

  const tmrH = watch('tempo_medio_resposta_horas') ?? 0;
  const tmrM = watch('tempo_medio_resposta_minutos') ?? 0;
  const semaphore = getTmrSemaphore(tmrH, tmrM);

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d as Record<string, unknown>))} className="space-y-6">
      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Atendimentos</p>
        <div className="grid grid-cols-4 gap-4">
          <Input label="FLW" type="number" min={0} {...register('atendimentos.flw', { valueAsNumber: true })} />
          <Input label="VTL/AMHT/Outros" type="number" min={0} {...register('atendimentos.vtl_amht_outros', { valueAsNumber: true })} />
          <Input label="Sprint" type="number" min={0} {...register('atendimentos.sprint', { valueAsNumber: true })} />
          <Input label="Total" type="number" min={0} {...register('atendimentos_total', { valueAsNumber: true })} error={errors.atendimentos_total?.message} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Resolvidos</p>
        <div className="grid grid-cols-4 gap-4">
          <Input label="FLW" type="number" min={0} {...register('resolvidos.flw', { valueAsNumber: true })} />
          <Input label="VTL/AMHT/Outros" type="number" min={0} {...register('resolvidos.vtl_amht_outros', { valueAsNumber: true })} />
          <Input label="Sprint" type="number" min={0} {...register('resolvidos.sprint', { valueAsNumber: true })} />
          <Input label="Total" type="number" min={0} {...register('resolvidos_total', { valueAsNumber: true })} error={errors.resolvidos_total?.message} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Bloqueios</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Não sei o que fazer" type="number" min={0} {...register('nao_sei_o_que_fazer', { valueAsNumber: true })} />
          <Input label="Falta clareza (qtd)" type="number" min={0} {...register('falta_clareza_qtd', { valueAsNumber: true })} />
        </div>
        <div className="mt-4">
          <Textarea label="Descrição falta clareza (opcional)" {...register('falta_clareza_descricao')} />
        </div>
      </Card>

      <Card variant="elevated">
        <div className="flex items-center justify-between mb-4">
          <p className="text-label-sm uppercase text-outline">TMR — Tempo Médio de Resposta</p>
          <span className={cn('w-2.5 h-2.5 rounded-full', SEMAPHORE_COLORS[semaphore])} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Horas" type="number" min={0} max={23} {...register('tempo_medio_resposta_horas', { valueAsNumber: true })} error={errors.tempo_medio_resposta_horas?.message} />
          <Input label="Minutos" type="number" min={0} max={59} {...register('tempo_medio_resposta_minutos', { valueAsNumber: true })} error={errors.tempo_medio_resposta_minutos?.message} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Reflexão do Dia</p>
        <div className="space-y-4">
          <Textarea label="O que deu certo?" {...register('deu_certo')} error={errors.deu_certo?.message} />
          <Textarea label="A melhorar" {...register('a_melhorar')} error={errors.a_melhorar?.message} />
          <Textarea label="Atividades de amanhã" {...register('atividades_amanha')} error={errors.atividades_amanha?.message} />
        </div>
      </Card>

      <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
        Enviar Relatório
      </Button>
    </form>
  );
}
