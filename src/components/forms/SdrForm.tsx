'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { sdrSchema, type SdrFormData } from '@/types/forms';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';

interface SdrFormProps {
  onSubmit: (data: Record<string, unknown>) => void;
  submitting: boolean;
}

const TIPO_OPTIONS = ['FDO', 'HBS Talks', 'Outros'];

export function SdrForm({ onSubmit, submitting }: SdrFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<SdrFormData>({
    resolver: zodResolver(sdrSchema),
    defaultValues: {
      abordagens_tipos: [],
      calls_agendadas: { vtl: 0, flw: 0, outros: 0 },
      contatos_capturados: { total: 0, amht: 0, vtl: 0, flw: 0, outros: 0 },
      crm_status: 'pendente',
    },
  });

  const tipos = watch('abordagens_tipos') ?? [];
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

  function toggleTipo(tipo: string) {
    const next = tipos.includes(tipo) ? tipos.filter((t) => t !== tipo) : [...tipos, tipo];
    setValue('abordagens_tipos', next);
  }

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d as Record<string, unknown>))} className="space-y-6">
      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Abordagens</p>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Total de abordagens" type="number" min={0} {...register('abordagens_total', { valueAsNumber: true })} error={errors.abordagens_total?.message} />
        </div>
        <div className="mt-4">
          <p className="text-label-sm uppercase text-on-surface-variant mb-2">Tipos</p>
          <div className="flex gap-2 flex-wrap">
            {TIPO_OPTIONS.map((t) => (
              <button key={t} type="button" onClick={() => toggleTipo(t)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${tipos.includes(t) ? 'bg-primary-container text-white' : 'bg-surface-container text-on-surface-variant'}`}>
                {t}
              </button>
            ))}
          </div>
          {errors.abordagens_tipos && <p className="text-xs text-error mt-1">{errors.abordagens_tipos.message}</p>}
        </div>
        <div className="mt-4">
          <Textarea label="Descrição (opcional)" {...register('abordagens_descricao')} />
        </div>
      </Card>

      <Card variant="elevated">
        <p className="text-label-sm uppercase text-outline mb-4">Calls Agendadas</p>
        <div className="grid grid-cols-3 gap-4">
          <Input label="FLW" type="number" min={0} {...register('calls_agendadas.flw', { valueAsNumber: true })} />
          <Input label="VTL" type="number" min={0} {...register('calls_agendadas.vtl', { valueAsNumber: true })} />
          <Input label="Outros" type="number" min={0} {...register('calls_agendadas.outros', { valueAsNumber: true })} />
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
