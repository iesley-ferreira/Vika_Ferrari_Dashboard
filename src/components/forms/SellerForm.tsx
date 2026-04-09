'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sellerSchema, type SellerFormData } from '@/types/forms';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';

interface SellerFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

export function SellerForm({ onSubmit, submitting }: SellerFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SellerFormData>({
    resolver: zodResolver(sellerSchema),
    defaultValues: {
      abordagens: { follow_up: 0, conducoes: 0, outros: 0 },
      cross: 0,
      calls_agendadas: { vtl: 0, flw: 0 },
      contatos_capturados: { total: 0, amht: 0, vtl: 0, flw: 0, outros: 0 },
      crm_status: 'pendente',
    },
  });

  const crmStatus = watch('crm_status');

  // Calcula total automaticamente
  const capFLW = watch('contatos_capturados.flw') ?? 0;
  const capVTL = watch('contatos_capturados.vtl') ?? 0;
  const capAMHT = watch('contatos_capturados.amht') ?? 0;
  const capOutros = watch('contatos_capturados.outros') ?? 0;
  const totalCapturados = capFLW + capVTL + capAMHT + capOutros;

  useEffect(() => {
    setValue('contatos_capturados.total', totalCapturados);
  }, [totalCapturados, setValue]);

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d as Record<string, unknown>))} className="space-y-6">
      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Abordagens</p>
        <div className="grid grid-cols-3 gap-4">
          <Input label="Follow-up" type="number" min={0} {...register('abordagens.follow_up', { valueAsNumber: true })} />
          <Input label="Conduções" type="number" min={0} {...register('abordagens.conducoes', { valueAsNumber: true })} />
          <Input label="Outros" type="number" min={0} {...register('abordagens.outros', { valueAsNumber: true })} />
        </div>
        <div className="mt-4">
          <Input label="Cross" type="number" min={0} {...register('cross', { valueAsNumber: true })} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Calls Agendadas</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="FLW" type="number" min={0} {...register('calls_agendadas.flw', { valueAsNumber: true })} />
          <Input label="VTL" type="number" min={0} {...register('calls_agendadas.vtl', { valueAsNumber: true })} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Contatos Capturados</p>
        <div className="grid grid-cols-3 gap-4">
          <Input label="FLW" type="number" min={0} {...register('contatos_capturados.flw', { valueAsNumber: true })} />
          <Input label="VTL" type="number" min={0} {...register('contatos_capturados.vtl', { valueAsNumber: true })} />
          <Input label="AMHT" type="number" min={0} {...register('contatos_capturados.amht', { valueAsNumber: true })} />
          <Input label="Outros" type="number" min={0} {...register('contatos_capturados.outros', { valueAsNumber: true })} />
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">Total</label>
            <div className="border border-outline-variant rounded-lg px-3 py-2.5 text-sm bg-surface-container text-on-surface font-semibold tabular-nums">
              {totalCapturados}
            </div>
          </div>
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
          <Textarea label="Atividades de amanhã" {...register('atividades_amanha')} error={errors.atividades_amanha?.message} />
        </div>
      </Card>

      <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full">
        Enviar Relatório
      </Button>
    </form>
  );
}
