'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { closerSchema, type CloserFormData } from '@/types/forms';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';

interface CloserFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

export function CloserForm({ onSubmit, submitting }: CloserFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<CloserFormData>({
    resolver: zodResolver(closerSchema),
    defaultValues: {
      calls_agendadas: { vtl: 0, flw: 0, amht: 0, individual: 0 },
      calls_realizadas: { vtl: 0, flw: 0, amht: 0, individual: 0 },
      vendas: { amht: 0, vtl: 0, flw: 0 },
      cash_collect_valor: 0,
      faturamento_dia: 0,
      crm_status: 'pendente',
    },
  });

  const crmStatus = watch('crm_status');

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d as Record<string, unknown>))} className="space-y-6">
      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Calls Agendadas</p>
        <div className="grid grid-cols-4 gap-4">
          <Input label="FLW" type="number" min={0} {...register('calls_agendadas.flw', { valueAsNumber: true })} />
          <Input label="VTL" type="number" min={0} {...register('calls_agendadas.vtl', { valueAsNumber: true })} />
          <Input label="AMHT" type="number" min={0} {...register('calls_agendadas.amht', { valueAsNumber: true })} />
          <Input label="Individual" type="number" min={0} {...register('calls_agendadas.individual', { valueAsNumber: true })} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Calls Realizadas</p>
        <div className="grid grid-cols-4 gap-4">
          <Input label="FLW" type="number" min={0} {...register('calls_realizadas.flw', { valueAsNumber: true })} />
          <Input label="VTL" type="number" min={0} {...register('calls_realizadas.vtl', { valueAsNumber: true })} />
          <Input label="AMHT" type="number" min={0} {...register('calls_realizadas.amht', { valueAsNumber: true })} />
          <Input label="Individual" type="number" min={0} {...register('calls_realizadas.individual', { valueAsNumber: true })} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Vendas</p>
        <div className="grid grid-cols-3 gap-4">
          <Input label="FLW" type="number" min={0} {...register('vendas.flw', { valueAsNumber: true })} />
          <Input label="VTL" type="number" min={0} {...register('vendas.vtl', { valueAsNumber: true })} />
          <Input label="AMHT" type="number" min={0} {...register('vendas.amht', { valueAsNumber: true })} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Financeiro</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Faturamento do dia (R$)" type="number" min={0} step={0.01} {...register('faturamento_dia', { valueAsNumber: true })} error={errors.faturamento_dia?.message} />
          <Input label="Cash Collect (R$)" type="number" min={0} step={0.01} {...register('cash_collect_valor', { valueAsNumber: true })} />
        </div>
        <div className="mt-4">
          <Textarea label="Descrição Cash Collect (opcional)" {...register('cash_collect_descricao')} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">CRM</p>
        <Toggle value={crmStatus === 'atualizado'} onChange={(v) => setValue('crm_status', v ? 'atualizado' : 'pendente')} />
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Reflexão do Dia</p>
        <div className="space-y-4">
          <Textarea label="O que deu certo?" {...register('deu_certo')} error={errors.deu_certo?.message} />
          <Textarea label="A melhorar" {...register('a_melhorar')} error={errors.a_melhorar?.message} />
        </div>
      </Card>

      <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
        Enviar Relatório
      </Button>
    </form>
  );
}
