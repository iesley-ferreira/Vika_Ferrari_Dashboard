'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, User } from 'lucide-react';

type Area = 'produto' | 'comercial';
type Role = 'especialista' | 'gestora_produto' | 'sdr' | 'seller' | 'closer';

const AREA_OPTIONS: { value: Area; label: string }[] = [
  { value: 'produto', label: 'Produto' },
  { value: 'comercial', label: 'Comercial' },
];

const ROLE_OPTIONS: Record<Area, { value: Role; label: string }[]> = {
  produto: [
    { value: 'especialista', label: 'Especialista de Produto' },
    { value: 'gestora_produto', label: 'Gestora de Produto' },
  ],
  comercial: [
    { value: 'sdr', label: 'SDR' },
    { value: 'seller', label: 'Seller' },
    { value: 'closer', label: 'Closer' },
  ],
};

interface ProfileSetupProps {
  userId: string;
  userEmail: string;
}

export function ProfileSetup({ userId, userEmail }: ProfileSetupProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [area, setArea] = useState<Area | ''>('');
  const [role, setRole] = useState<Role | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Informe seu nome completo.'); return; }
    if (!area) { setError('Selecione sua área.'); return; }
    if (!role) { setError('Selecione sua função.'); return; }

    setLoading(true);

    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userId, full_name: fullName.trim(), area, role }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? 'Erro ao salvar perfil. Tente novamente.');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  const areaColor = area === 'produto' ? '#406181' : '#755b00';

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fef9f1' }}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
            style={{ backgroundColor: '#c9a84c22' }}
          >
            <User size={24} style={{ color: '#755b00' }} />
          </div>
          <h1
            className="text-xl font-bold text-center"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#755b00' }}
          >
            Complete seu perfil
          </h1>
          <p className="text-sm text-center mt-1" style={{ color: '#7e7665' }}>
            Sua conta (<strong>{userEmail}</strong>) já existe. Informe seus dados para acessar o painel.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#1d1c17' }}>
              Nome completo
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
              style={{ borderColor: '#d0c5b2' }}
              placeholder="Seu nome completo"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: '#1d1c17' }}>
              Área
            </label>
            <div className="grid grid-cols-2 gap-2">
              {AREA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setArea(opt.value); setRole(''); }}
                  className="p-3 rounded-xl border-2 text-left transition-all"
                  style={{
                    borderColor: area === opt.value
                      ? (opt.value === 'produto' ? '#406181' : '#755b00')
                      : '#d0c5b2',
                    backgroundColor: area === opt.value
                      ? (opt.value === 'produto' ? '#b9daff22' : '#c9a84c22')
                      : 'transparent',
                  }}
                >
                  <p className="text-sm font-semibold" style={{ color: '#1d1c17' }}>{opt.label}</p>
                </button>
              ))}
            </div>
          </div>

          {area && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1d1c17' }}>
                Função
              </label>
              <div className="space-y-2">
                {ROLE_OPTIONS[area].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className="w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 transition-all"
                    style={{
                      borderColor: role === opt.value ? areaColor : '#d0c5b2',
                      backgroundColor: role === opt.value ? `${areaColor}15` : 'transparent',
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        borderColor: role === opt.value ? areaColor : '#d0c5b2',
                        backgroundColor: role === opt.value ? areaColor : 'transparent',
                      }}
                    >
                      {role === opt.value && <Check size={10} color="white" />}
                    </span>
                    <p className="text-sm font-semibold" style={{ color: '#1d1c17' }}>{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {error && <p className="text-sm" style={{ color: '#ba1a1a' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading || !fullName || !area || !role}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
            style={{ backgroundColor: area ? areaColor : '#755b00', color: '#ffffff' }}
          >
            {loading ? 'Salvando...' : 'Acessar o painel'}
          </button>
        </form>
      </div>
    </div>
  );
}
