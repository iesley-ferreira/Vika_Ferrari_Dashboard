'use client';

import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';
import { AlertCircle, Camera, Check, Mail, Shield, Upload, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const ROLE_LABELS: Record<string, string> = {
  especialista:     'Especialista',
  gestora_produto:  'Gestora de Produto',
  sdr:              'SDR',
  seller:           'Seller',
  closer:           'Closer',
  gestor:           'Gestor',
};

const AREA_LABELS: Record<string, string> = {
  produto:   'Produto',
  comercial: 'Comercial',
  gestor:    'Gestão',
};

const AREA_COLOR: Record<string, string> = {
  produto:   '#406181',
  comercial: '#755b00',
  gestor:    '#476647',
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase();
}

export default function ConfiguracoesPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);

  // ── Load profile ────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEmail(user.email ?? '');

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setProfile(data);
        const parts = data.full_name.trim().split(' ');
        setFirstName(parts[0] ?? '');
        setLastName(parts.slice(1).join(' '));
        setAvatarPreview(data.avatar_url ?? null);
      }
      setLoading(false);
    }

    load();
  }, []);

  // ── Auto-dismiss toast ──────────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Avatar handling ─────────────────────────────────────────
  function handleAvatarFile(file: File) {
    if (!file.type.startsWith('image/')) {
      setToast({ type: 'error', msg: 'Apenas imagens são permitidas.' });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setToast({ type: 'error', msg: 'Imagem deve ter no máximo 2 MB.' });
      return;
    }
    setNewAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleAvatarFile(file);
  }

  // ── Save ────────────────────────────────────────────────────
  async function handleSave() {
    if (!profile) return;
    if (!firstName.trim()) {
      setToast({ type: 'error', msg: 'Primeiro nome é obrigatório.' });
      return;
    }

    setSaving(true);
    const supabase = createClient();

    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if changed
      if (newAvatarFile) {
        setUploading(true);
        const ext = newAvatarFile.name.split('.').pop();
        const path = `avatars/${profile.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, newAvatarFile, { upsert: true });

        if (uploadErr) {
          setToast({ type: 'error', msg: 'Erro ao fazer upload da foto.' });
          setSaving(false);
          setUploading(false);
          return;
        }

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;
        setUploading(false);
      }

      const full_name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');

      const { error } = await supabase
        .from('profiles')
        .update({ full_name, avatar_url: avatarUrl })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile((prev) => prev ? { ...prev, full_name, avatar_url: avatarUrl } : prev);
      setNewAvatarFile(null);
      setToast({ type: 'success', msg: 'Perfil atualizado com sucesso!' });
      router.refresh();
    } catch {
      setToast({ type: 'error', msg: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (!profile) return;
    const parts = profile.full_name.trim().split(' ');
    setFirstName(parts[0] ?? '');
    setLastName(parts.slice(1).join(' '));
    setAvatarPreview(profile.avatar_url ?? null);
    setNewAvatarFile(null);
  }

  const areaColor = profile ? AREA_COLOR[profile.area] ?? '#755b00' : '#755b00';
  const hasChanges =
    !loading &&
    profile &&
    (firstName.trim() !== profile.full_name.split(' ')[0] ||
      lastName.trim() !== profile.full_name.split(' ').slice(1).join(' ') ||
      newAvatarFile !== null);

  return (
    <div className="max-w-3xl mx-auto space-y-0">
      {/* Toast */}
      {toast && (
        <div
          className="fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium transition-all"
          style={{
            background: toast.type === 'success' ? '#476647' : '#A85050',
            color: '#fff',
          }}
        >
          {toast.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* ── Cover + Avatar ───────────────────────────────────── */}
      <div className="relative">
        {/* Cover */}
        <div
          className="h-40 rounded-t-2xl"
          style={{
            background: `linear-gradient(135deg, ${areaColor}22 0%, ${areaColor}44 50%, ${areaColor}18 100%)`,
            borderBottom: `2px solid ${areaColor}30`,
          }}
        >
          {/* Decorative pattern */}
          <svg
            className="absolute inset-0 w-full h-full opacity-10"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill={areaColor} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Avatar over cover */}
        <div className="absolute -bottom-14 left-8">
          <div className="relative group">
            <div
              className="w-24 h-24 rounded-full border-4 border-white flex items-center justify-center overflow-hidden shadow-lg"
              style={{ background: `${areaColor}20` }}
            >
              {loading ? (
                <Skeleton className="w-full h-full rounded-full" />
              ) : avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
              ) : (
                <span
                  className="text-2xl font-bold"
                  style={{ color: areaColor }}
                >
                  {profile ? getInitials(profile.full_name) : '?'}
                </span>
              )}
            </div>
            {/* Camera overlay on hover */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(0,0,0,0.45)' }}
              title="Alterar foto"
            >
              <Camera size={22} color="#fff" />
            </button>
          </div>
        </div>

        {/* Name + handle */}
        <div className="absolute -bottom-12 left-36">
          {loading ? (
            <Skeleton className="h-5 w-32" />
          ) : (
            <>
              <p className="text-lg font-bold text-on-surface leading-tight">
                {profile?.full_name}
              </p>
              <p className="text-sm text-outline mt-0.5">
                {AREA_LABELS[profile?.area ?? '']} · {ROLE_LABELS[profile?.role ?? '']}
              </p>
            </>
          )}
        </div>

        {/* Action buttons (top right) */}
        <div className="absolute top-4 right-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCancel}
            disabled={!hasChanges || saving}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!hasChanges}
          >
            {uploading ? 'Enviando foto…' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Spacing after avatar overlap */}
      <div className="h-20" />

      {/* ── Form card ────────────────────────────────────────── */}
      <div className="bg-background rounded-2xl border border-outline-variant p-8 space-y-8">

        {/* Section: Personal info */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <User size={16} style={{ color: areaColor }} />
            <p className="text-sm font-semibold text-on-surface uppercase tracking-widest">
              Informações Pessoais
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
                Primeiro nome <span style={{ color: areaColor }}>*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                placeholder="Primeiro nome"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm text-on-surface bg-background outline-none focus:ring-2 transition-all disabled:opacity-50"
                style={{ ['--tw-ring-color' as string]: areaColor + '50' }}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
                Sobrenome
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
                placeholder="Sobrenome"
                className="w-full border border-outline-variant rounded-lg px-3 py-2.5 text-sm text-on-surface bg-background outline-none focus:ring-2 transition-all disabled:opacity-50"
                style={{ ['--tw-ring-color' as string]: areaColor + '50' }}
              />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-outline-variant" />

        {/* Section: Email */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Mail size={16} style={{ color: areaColor }} />
            <p className="text-sm font-semibold text-on-surface uppercase tracking-widest">
              Endereço de E-mail
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
              E-mail <span style={{ color: areaColor }}>*</span>
            </label>
            <div className="relative flex items-center">
              <Mail size={15} className="absolute left-3 text-outline pointer-events-none" />
              <input
                type="email"
                value={email}
                disabled
                className="w-full border border-outline-variant rounded-lg pl-9 pr-3 py-2.5 text-sm text-on-surface bg-surface-container opacity-60 cursor-not-allowed outline-none"
              />
            </div>
            <p className="text-xs text-outline mt-1">
              O e-mail não pode ser alterado aqui. Entre em contato com um gestor se necessário.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-outline-variant" />

        {/* Section: Photo upload */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Camera size={16} style={{ color: areaColor }} />
            <p className="text-sm font-semibold text-on-surface uppercase tracking-widest">
              Foto de Perfil
            </p>
          </div>

          <div className="flex items-start gap-5">
            {/* Current photo thumb */}
            <div
              className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden border-2"
              style={{ borderColor: areaColor + '40', background: areaColor + '15' }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} className="w-full h-full object-cover" alt="Preview" />
              ) : (
                <span className="text-lg font-bold" style={{ color: areaColor }}>
                  {profile ? getInitials(profile.full_name) : '?'}
                </span>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center gap-1.5 border-2 border-dashed rounded-xl py-7 cursor-pointer transition-all"
              style={{
                borderColor: isDragging ? areaColor : '#d0c5b2',
                background: isDragging ? areaColor + '08' : 'transparent',
              }}
            >
              <Upload
                size={22}
                style={{ color: isDragging ? areaColor : '#7e7665' }}
              />
              <p className="text-sm">
                <span style={{ color: areaColor }} className="font-medium">
                  Clique para enviar
                </span>{' '}
                <span className="text-outline">ou arraste e solte</span>
              </p>
              <p className="text-xs text-outline">SVG, PNG, JPG ou GIF (máx. 2 MB)</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleAvatarFile(file);
                e.target.value = '';
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-outline-variant" />

        {/* Section: Role info (read-only) */}
        <div>
          <div className="flex items-center gap-2 mb-5">
            <Shield size={16} style={{ color: areaColor }} />
            <p className="text-sm font-semibold text-on-surface uppercase tracking-widest">
              Função &amp; Área
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
                Área
              </label>
              <div className="flex items-center gap-2.5 border border-outline-variant rounded-lg px-3 py-2.5 bg-surface-container opacity-70">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: areaColor }}
                />
                <span className="text-sm text-on-surface">
                  {AREA_LABELS[profile?.area ?? ''] ?? '—'}
                </span>
              </div>
              <p className="text-xs text-outline mt-1">Apenas gestores podem alterar a área.</p>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-widest">
                Função
              </label>
              <div className="flex items-center gap-2.5 border border-outline-variant rounded-lg px-3 py-2.5 bg-surface-container opacity-70">
                <Shield size={14} style={{ color: areaColor }} />
                <span className="text-sm text-on-surface">
                  {ROLE_LABELS[profile?.role ?? ''] ?? '—'}
                </span>
              </div>
              <p className="text-xs text-outline mt-1">Apenas gestores podem alterar a função.</p>
            </div>
          </div>
        </div>

      </div>

      {/* Bottom save bar */}
      {hasChanges && (
        <div
          className="sticky bottom-0 left-0 right-0 z-20 flex items-center justify-between px-8 py-4 rounded-b-2xl border-t border-outline-variant bg-surface shadow-lg"
        >
          <p className="text-sm text-on-surface-variant">Você tem alterações não salvas.</p>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" onClick={handleCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              Salvar alterações
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
