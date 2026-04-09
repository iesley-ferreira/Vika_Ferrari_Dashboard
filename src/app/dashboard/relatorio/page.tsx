'use client';

import { ReportViewer } from '@/components/dashboard/ReportViewer';
import { CloserForm } from '@/components/forms/CloserForm';
import { ProdutoForm } from '@/components/forms/ProdutoForm';
import { SdrForm } from '@/components/forms/SdrForm';
import { SellerForm } from '@/components/forms/SellerForm';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useDailyReport } from '@/hooks/useDailyReport';
import { useProfile } from '@/hooks/useProfile';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { CircleCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const ROLE_LABELS: Record<string, string> = {
  sdr: 'SDR',
  seller: 'Seller',
  closer: 'Closer',
  especialista: 'Especialista de Produto',
  gestora_produto: 'Gestora de Produto',
};

export default function RelatorioPage() {
  const router = useRouter();
  const { profile, loading: profileLoading, isGestor } = useProfile();
  const { report, loading: reportLoading, submitting, submitReport } = useDailyReport(profile?.id);
  const { toast } = useToast();

  useEffect(() => {
    if (!profileLoading && isGestor) router.replace('/dashboard');
  }, [profileLoading, isGestor, router]);

  if (profileLoading || reportLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton variant="text" width="200px" className="h-6" />
        <Skeleton variant="card" />
        <Skeleton variant="card" />
      </div>
    );
  }

  if (!profile) return null;

  async function handleSubmit(data: Record<string, unknown>) {
    const { error } = await submitReport(data, profile!.area, profile!.role) ?? {};
    if (error) {
      toast('Erro ao enviar relatório. Tente novamente.', 'error');
    } else {
      toast('Relatório enviado com sucesso!', 'success');
    }
  }

  const formProps = { onSubmit: handleSubmit, submitting };

  return (
    <div className="max-w-2xl mx-auto">
      {report ? (
        <div className="space-y-6">
          {/* Sent banner */}
          <div
            className="flex items-center gap-3 rounded-md px-4 py-3"
            style={{ backgroundColor: '#47664715', border: '1px solid #92b49040' }}
          >
            <CircleCheck size={20} style={{ color: '#476647' }} className="shrink-0" />
            <div>
              <p className="text-sm font-semibold" style={{ color: '#1d1c17' }}>Relatório enviado</p>
              <p className="text-xs" style={{ color: '#4d4637' }}>
                {format(new Date(report.submitted_at), "HH:mm 'de' dd 'de' MMMM", { locale: ptBR })}
                {report.edited_at && (
                  <> · <span style={{ color: '#7e7665' }}>Editado às {format(new Date(report.edited_at), 'HH:mm')}</span></>
                )}
              </p>
            </div>
          </div>

          {/* Header info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-label-sm uppercase tracking-widest" style={{ color: '#7e7665' }}>
                ◆ Relatório Diário
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#4d4637' }}>
                {profile.full_name} ·{' '}
                <span style={{ color: '#755b00' }}>{ROLE_LABELS[report.role] ?? report.role}</span>
                {' · '}
                {format(new Date(report.report_date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Structured report data */}
          <ReportViewer role={report.role} data={report.data as Record<string, unknown>} />

          <p className="text-xs text-center" style={{ color: '#7e7665' }}>
            Apenas gestores podem editar relatórios após o envio.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-label-sm uppercase tracking-widest" style={{ color: '#7e7665' }}>
              ◆ Relatório Diário
            </p>
            <p className="text-xs mt-1" style={{ color: '#4d4637' }}>
              {profile.full_name} · {ROLE_LABELS[profile.role] ?? profile.role}
              {' · '}
              {format(new Date(), "dd 'de' MMMM, yyyy", { locale: ptBR })}
            </p>
          </div>

          {profile.role === 'sdr' && <SdrForm {...formProps} />}
          {profile.role === 'seller' && <SellerForm {...formProps} />}
          {profile.role === 'closer' && <CloserForm {...formProps} />}
          {(profile.role === 'especialista' || profile.role === 'gestora_produto') && (
            <ProdutoForm {...formProps} />
          )}
        </div>
      )}
    </div>
  );
}
