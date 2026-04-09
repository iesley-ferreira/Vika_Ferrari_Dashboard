'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError('Email ou senha inválidos.');
      setLoading(false);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fef9f1' }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <h1
          className="text-2xl font-bold text-center mb-1"
          style={{ fontFamily: "'Playfair Display', Georgia, serif", color: '#755b00' }}
        >
          HBS Performance
        </h1>
        <p className="text-sm text-center mb-6" style={{ color: '#7e7665' }}>
          Acesse o painel
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              style={{ borderColor: '#d0c5b2', color: '#1d1c17' }}
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
                style={{ borderColor: '#d0c5b2', color: '#1d1c17' }}
                placeholder="••••••••"
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

          {error && <p className="text-sm" style={{ color: '#ba1a1a' }}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-50"
            style={{ backgroundColor: '#755b00', color: '#ffffff' }}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-sm text-center mt-5" style={{ color: '#7e7665' }}>
          Não tem uma conta?{' '}
          <Link href="/auth/register" className="font-semibold hover:underline" style={{ color: '#755b00' }}>
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
