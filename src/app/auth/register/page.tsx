'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, ChevronLeft, Check } from 'lucide-react';

type Area = 'produto' | 'comercial';
type Role = 'especialista' | 'gestora_produto' | 'sdr' | 'seller' | 'closer';

const AREA_OPTIONS: { value: Area; label: string; desc: string }[] = [
  { value: 'produto', label: 'Produto', desc: 'Especialista ou Gestora de Produto' },
  { value: 'comercial', label: 'Comercial', desc: 'SDR, Seller ou Closer' },
];

const ROLE_OPTIONS: Record<Area, { value: Role; label: string; desc: string }[]> = {
  produto: [
    { value: 'especialista', label: 'Especialista de Produto', desc: 'Atendimentos, suporte e resoluções' },
    { value: 'gestora_produto', label: 'Gestora de Produto', desc: 'Gestão do time de produto' },
  ],
  comercial: [
    { value: 'sdr', label: 'SDR', desc: 'Prospecção e agendamentos' },
    { value: 'seller', label: 'Seller', desc: 'Conduções e follow-ups' },
    { value: 'closer', label: 'Closer', desc: 'Fechamentos e faturamento' },
  ],
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Step 1
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [area, setArea] = useState<Area | ''>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2
  const [role, setRole] = useState<Role | ''>('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Informe seu nome completo.'); return; }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirmPassword) { setError('As senhas não coincidem.'); return; }
    if (!area) { setError('Selecione sua área.'); return; }
    setStep(2);
  }

  async function handleStep2(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!role) { setError('Selecione sua função.'); return; }

    setLoading(true);
    const supabase = createClient();

    // Sign up
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName.trim(), area, role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError('Erro ao criar conta. Tente novamente.');
      setLoading(false);
      return;
    }

    // Try to create profile via API route (uses service key to bypass RLS)
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: authData.user.id,
        full_name: fullName.trim(),
        area,
        role,
      }),
    });

    if (!res.ok) {
      // Profile creation failed but account exists - user can retry via dashboard
      console.warn('Profile creation failed, will retry on dashboard');
    }

    // If no session (email confirmation required), tell user
    if (!authData.session) {
      setStep(3);
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
        {/* Header */}
        <div className="mb-6">
          <h1
            className="text-2xl font-bold text-center"
            style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#755b00' }}
          >
            HBS Performance
          </h1>
          <p className="text-sm text-center mt-1" style={{ color: '#7e7665' }}>
            {step === 1 ? 'Crie sua conta' : step === 2 ? 'Selecione sua função' : 'Verifique seu email'}
          </p>

          {/* Progress bar */}
          {step < 3 && (
            <div className="mt-4 flex gap-1.5">
              <div
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: '#755b00' }}
              />
              <div
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: step >= 2 ? '#755b00' : '#d0c5b2' }}
              />
            </div>
          )}
        </div>

        {/* Step 1 */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
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
              <label className="block text-sm font-medium mb-1" style={{ color: '#1d1c17' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ borderColor: '#d0c5b2' }}
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#1d1c17' }}>
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: '#d0c5b2' }}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center"
                  style={{ color: '#7e7665' }}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#1d1c17' }}>
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2"
                  style={{ borderColor: '#d0c5b2' }}
                  placeholder="Repita a senha"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-3 flex items-center"
                  style={{ color: '#7e7665' }}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Area selector */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1d1c17' }}>
                Área
              </label>
              <div className="grid grid-cols-2 gap-2">
                {AREA_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setArea(opt.value)}
                    className="relative p-3 rounded-xl border-2 text-left transition-all"
                    style={{
                      borderColor: area === opt.value
                        ? (opt.value === 'produto' ? '#406181' : '#755b00')
                        : '#d0c5b2',
                      backgroundColor: area === opt.value
                        ? (opt.value === 'produto' ? '#b9daff22' : '#c9a84c22')
                        : 'transparent',
                    }}
                  >
                    {area === opt.value && (
                      <span
                        className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: opt.value === 'produto' ? '#406181' : '#755b00' }}
                      >
                        <Check size={10} color="white" />
                      </span>
                    )}
                    <p className="text-sm font-semibold" style={{ color: '#1d1c17' }}>{opt.label}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#7e7665' }}>{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm" style={{ color: '#ba1a1a' }}>{error}</p>}

            <button
              type="submit"
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition"
              style={{ backgroundColor: '#755b00', color: '#ffffff' }}
            >
              Continuar →
            </button>
          </form>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <button
              type="button"
              onClick={() => { setStep(1); setRole(''); setError(''); }}
              className="flex items-center gap-1 text-sm mb-2"
              style={{ color: '#7e7665' }}
            >
              <ChevronLeft size={16} /> Voltar
            </button>

            <p className="text-sm font-medium" style={{ color: '#4d4637' }}>
              Área selecionada:{' '}
              <span className="font-semibold" style={{ color: areaColor }}>
                {area === 'produto' ? 'Produto' : 'Comercial'}
              </span>
            </p>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#1d1c17' }}>
                Qual é sua função?
              </label>
              <div className="space-y-2">
                {(ROLE_OPTIONS[area as Area] ?? []).map((opt) => (
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
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1d1c17' }}>{opt.label}</p>
                      <p className="text-xs" style={{ color: '#7e7665' }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm" style={{ color: '#ba1a1a' }}>{error}</p>}

            <button
              type="submit"
              disabled={loading || !role}
              className="w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
              style={{ backgroundColor: areaColor, color: '#ffffff' }}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}

        {/* Step 3 — Email confirmation */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto"
              style={{ backgroundColor: '#c9a84c22' }}
            >
              <Check size={28} style={{ color: '#755b00' }} />
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: '#1d1c17' }}>
                Conta criada!
              </p>
              <p className="text-sm mt-1" style={{ color: '#4d4637' }}>
                Verifique seu email <strong>{email}</strong> e clique no link de confirmação para ativar sua conta.
              </p>
            </div>
            <Link
              href="/auth/login"
              className="inline-block mt-2 text-sm font-semibold hover:underline"
              style={{ color: '#755b00' }}
            >
              Ir para o login
            </Link>
          </div>
        )}

        {step < 3 && (
          <p className="text-sm text-center mt-5" style={{ color: '#7e7665' }}>
            Já tem uma conta?{' '}
            <Link href="/auth/login" className="font-semibold hover:underline" style={{ color: '#755b00' }}>
              Entrar
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
