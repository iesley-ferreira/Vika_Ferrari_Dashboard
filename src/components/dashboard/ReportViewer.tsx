import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ReportViewerProps {
  role: string;
  data: Record<string, unknown>;
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p
        className="text-xs font-bold uppercase tracking-widest mb-2"
        style={{ color: '#7e7665' }}
      >
        {title}
      </p>
      <div
        className="rounded-md p-3 space-y-2"
        style={{ backgroundColor: '#f8f3eb', border: '1px solid #d0c5b2' }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-0.5">
      <span className="text-sm" style={{ color: '#4d4637' }}>{label}</span>
      <span
        className="text-sm font-semibold text-right"
        style={{ color: highlight ? '#755b00' : '#1d1c17' }}
      >
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, backgroundColor: '#d0c5b2', margin: '4px 0' }} />;
}

function CrmBadge({ status }: { status: string }) {
  const ok = status === 'atualizado';
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{
        backgroundColor: ok ? '#47664715' : '#c9a84c20',
        color: ok ? '#476647' : '#755b00',
      }}
    >
      {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
      {ok ? 'Atualizado' : 'Pendente'}
    </span>
  );
}

function Textarea({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium" style={{ color: '#7e7665' }}>{label}</p>
      <p className="text-sm" style={{ color: '#1d1c17', lineHeight: 1.6 }}>{value}</p>
    </div>
  );
}

function inlineTotal(obj: Record<string, unknown>, keys: string[]): number {
  return keys.reduce((sum, k) => sum + (Number(obj[k]) || 0), 0);
}

// ────────────────────────────────────────────────────────────
// SDR
// ────────────────────────────────────────────────────────────
function SdrView({ d }: { d: Record<string, unknown> }) {
  const ag = (d.calls_agendadas as Record<string, unknown>) ?? {};
  const cap = (d.contatos_capturados as Record<string, unknown>) ?? {};
  const tipos = (d.abordagens_tipos as string[]) ?? [];

  return (
    <div className="space-y-4">
      <Section title="Abordagens">
        <Row label="Total" value={String(d.abordagens_total ?? 0)} highlight />
        {tipos.length > 0 && (
          <Row
            label="Tipos"
            value={
              <div className="flex gap-1 flex-wrap justify-end">
                {tipos.map((t) => (
                  <span
                    key={t}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: '#c9a84c20', color: '#755b00' }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            }
          />
        )}
        {d.abordagens_descricao && (
          <Textarea label="Descrição" value={String(d.abordagens_descricao)} />
        )}
      </Section>

      <Section title="Calls Agendadas">
        <Row label="VTL" value={String(ag.vtl ?? 0)} />
        <Row label="FLW" value={String(ag.flw ?? 0)} />
        <Row label="Outros" value={String(ag.outros ?? 0)} />
        <Divider />
        <Row
          label="Total"
          value={String(inlineTotal(ag, ['vtl', 'flw', 'outros']))}
          highlight
        />
      </Section>

      <Section title="Contatos Capturados">
        <Row label="AMHT" value={String(cap.amht ?? 0)} />
        <Row label="VTL" value={String(cap.vtl ?? 0)} />
        <Row label="FLW" value={String(cap.flw ?? 0)} />
        <Row label="Outros" value={String(cap.outros ?? 0)} />
        <Divider />
        <Row label="Total" value={String(cap.total ?? 0)} highlight />
      </Section>

      <Section title="CRM">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#4d4637' }}>Status</span>
          <CrmBadge status={String(d.crm_status ?? '')} />
        </div>
      </Section>

      {(d.deu_certo || d.a_melhorar || d.atividades_amanha) && (
        <Section title="Reflexão">
          <Textarea label="✅ O que deu certo" value={String(d.deu_certo ?? '')} />
          <Textarea label="⚠️ A melhorar" value={String(d.a_melhorar ?? '')} />
          <Textarea label="📌 Amanhã" value={String(d.atividades_amanha ?? '')} />
        </Section>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Seller
// ────────────────────────────────────────────────────────────
function SellerView({ d }: { d: Record<string, unknown> }) {
  const ab = (d.abordagens as Record<string, unknown>) ?? {};
  const ag = (d.calls_agendadas as Record<string, unknown>) ?? {};
  const cap = (d.contatos_capturados as Record<string, unknown>) ?? {};

  return (
    <div className="space-y-4">
      <Section title="Abordagens">
        <Row label="Follow-up" value={String(ab.follow_up ?? 0)} />
        <Row label="Conduções" value={String(ab.conducoes ?? 0)} />
        <Row label="Outros" value={String(ab.outros ?? 0)} />
        <Divider />
        <Row label="Total" value={String(inlineTotal(ab, ['follow_up', 'conducoes', 'outros']))} highlight />
      </Section>

      <Section title="Cross">
        <Row label="Cross-sell" value={String(d.cross ?? 0)} highlight />
      </Section>

      <Section title="Calls Agendadas">
        <Row label="VTL" value={String(ag.vtl ?? 0)} />
        <Row label="FLW" value={String(ag.flw ?? 0)} />
        <Divider />
        <Row label="Total" value={String(inlineTotal(ag, ['vtl', 'flw']))} highlight />
      </Section>

      <Section title="Contatos Capturados">
        <Row label="AMHT" value={String(cap.amht ?? 0)} />
        <Row label="VTL" value={String(cap.vtl ?? 0)} />
        <Row label="FLW" value={String(cap.flw ?? 0)} />
        <Row label="Outros" value={String(cap.outros ?? 0)} />
        <Divider />
        <Row label="Total" value={String(cap.total ?? 0)} highlight />
      </Section>

      <Section title="CRM">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#4d4637' }}>Status</span>
          <CrmBadge status={String(d.crm_status ?? '')} />
        </div>
      </Section>

      {(d.deu_certo || d.a_melhorar || d.atividades_amanha) && (
        <Section title="Reflexão">
          <Textarea label="✅ O que deu certo" value={String(d.deu_certo ?? '')} />
          <Textarea label="⚠️ A melhorar" value={String(d.a_melhorar ?? '')} />
          <Textarea label="📌 Amanhã" value={String(d.atividades_amanha ?? '')} />
        </Section>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Closer
// ────────────────────────────────────────────────────────────
function CloserView({ d }: { d: Record<string, unknown> }) {
  const agendadas = (d.calls_agendadas as Record<string, unknown>) ?? {};
  const realizadas = (d.calls_realizadas as Record<string, unknown>) ?? {};
  const vendas = (d.vendas as Record<string, unknown>) ?? {};

  const totalAgendadas = inlineTotal(agendadas, ['vtl', 'flw', 'amht', 'individual']);
  const totalRealizadas = inlineTotal(realizadas, ['vtl', 'flw', 'amht', 'individual']);
  const totalVendas = inlineTotal(vendas, ['amht', 'vtl', 'flw']);

  return (
    <div className="space-y-4">
      <Section title="Calls Agendadas">
        <Row label="VTL" value={String(agendadas.vtl ?? 0)} />
        <Row label="FLW" value={String(agendadas.flw ?? 0)} />
        <Row label="AMHT" value={String(agendadas.amht ?? 0)} />
        <Row label="Individual" value={String(agendadas.individual ?? 0)} />
        <Divider />
        <Row label="Total" value={String(totalAgendadas)} highlight />
      </Section>

      <Section title="Calls Realizadas">
        <Row label="VTL" value={String(realizadas.vtl ?? 0)} />
        <Row label="FLW" value={String(realizadas.flw ?? 0)} />
        <Row label="AMHT" value={String(realizadas.amht ?? 0)} />
        <Row label="Individual" value={String(realizadas.individual ?? 0)} />
        <Divider />
        <Row label="Total" value={String(totalRealizadas)} highlight />
      </Section>

      <Section title="Vendas">
        <Row label="AMHT" value={String(vendas.amht ?? 0)} />
        <Row label="VTL" value={String(vendas.vtl ?? 0)} />
        <Row label="FLW" value={String(vendas.flw ?? 0)} />
        <Divider />
        <Row label="Total" value={String(totalVendas)} highlight />
      </Section>

      <Section title="Financeiro">
        <Row label="Faturamento do dia" value={formatCurrency(Number(d.faturamento_dia ?? 0))} highlight />
        <Row label="Cash Collect" value={formatCurrency(Number(d.cash_collect_valor ?? 0))} />
        {d.cash_collect_descricao && (
          <Textarea label="Descrição Cash Collect" value={String(d.cash_collect_descricao)} />
        )}
      </Section>

      <Section title="CRM">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: '#4d4637' }}>Status</span>
          <CrmBadge status={String(d.crm_status ?? '')} />
        </div>
      </Section>

      {(d.deu_certo || d.a_melhorar) && (
        <Section title="Reflexão">
          <Textarea label="✅ O que deu certo" value={String(d.deu_certo ?? '')} />
          <Textarea label="⚠️ A melhorar" value={String(d.a_melhorar ?? '')} />
        </Section>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Produto (Especialista + Gestora)
// ────────────────────────────────────────────────────────────
function ProdutoView({ d }: { d: Record<string, unknown> }) {
  const at = (d.atendimentos as Record<string, unknown>) ?? {};
  const re = (d.resolvidos as Record<string, unknown>) ?? {};
  const atTotal = Number(d.atendimentos_total ?? 0);
  const reTotal = Number(d.resolvidos_total ?? 0);
  const taxa = atTotal > 0 ? Math.round((reTotal / atTotal) * 100) : 0;
  const tmrH = Number(d.tempo_medio_resposta_horas ?? 0);
  const tmrM = Number(d.tempo_medio_resposta_minutos ?? 0);
  const tmrTotal = tmrH + tmrM / 60;
  const tmrColor = tmrTotal === 0 ? '#476647' : tmrTotal < 2 ? '#476647' : tmrTotal <= 4 ? '#c9a84c' : '#ba1a1a';

  return (
    <div className="space-y-4">
      <Section title="Atendimentos">
        <Row label="FLW" value={String(at.flw ?? 0)} />
        <Row label="VTL / AMHT / Outros" value={String(at.vtl_amht_outros ?? 0)} />
        <Row label="Sprint" value={String(at.sprint ?? 0)} />
        <Divider />
        <Row label="Total" value={String(atTotal)} highlight />
      </Section>

      <Section title="Resolvidos">
        <Row label="FLW" value={String(re.flw ?? 0)} />
        <Row label="VTL / AMHT / Outros" value={String(re.vtl_amht_outros ?? 0)} />
        <Row label="Sprint" value={String(re.sprint ?? 0)} />
        <Divider />
        <Row label="Total" value={String(reTotal)} highlight />
        <Row
          label="Taxa de resolução"
          value={
            <span
              className="font-bold"
              style={{ color: taxa >= 80 ? '#476647' : taxa >= 50 ? '#c9a84c' : '#ba1a1a' }}
            >
              {taxa}%
            </span>
          }
        />
      </Section>

      <Section title="Tempo Médio de Resposta">
        <Row
          label="TMR"
          value={
            <span className="flex items-center gap-1.5 font-bold" style={{ color: tmrColor }}>
              <Clock size={14} />
              {tmrH}h{tmrM > 0 ? ` ${tmrM}min` : ''}
            </span>
          }
        />
      </Section>

      <Section title="Bloqueios">
        <Row label="Não sei o que fazer" value={String(d.nao_sei_o_que_fazer ?? 0)} />
        <Row label="Falta de clareza" value={String(d.falta_clareza_qtd ?? 0)} />
        {d.falta_clareza_descricao && (
          <Textarea label="Descrição" value={String(d.falta_clareza_descricao)} />
        )}
      </Section>

      {(d.deu_certo || d.a_melhorar || d.atividades_amanha) && (
        <Section title="Reflexão">
          <Textarea label="✅ O que deu certo" value={String(d.deu_certo ?? '')} />
          <Textarea label="⚠️ A melhorar" value={String(d.a_melhorar ?? '')} />
          <Textarea label="📌 Amanhã" value={String(d.atividades_amanha ?? '')} />
        </Section>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────────────────────

export function ReportViewer({ role, data }: ReportViewerProps) {
  const d = data as Record<string, unknown>;

  if (role === 'sdr') return <SdrView d={d} />;
  if (role === 'seller') return <SellerView d={d} />;
  if (role === 'closer') return <CloserView d={d} />;
  if (role === 'especialista' || role === 'gestora_produto') return <ProdutoView d={d} />;

  // Fallback
  return (
    <pre className="text-xs text-on-surface-variant whitespace-pre-wrap bg-surface-low rounded-lg p-4">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
