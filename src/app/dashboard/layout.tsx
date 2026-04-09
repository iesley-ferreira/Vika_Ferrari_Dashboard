import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { ToastProvider } from '@/components/ui/Toast';
import { ProfileSetup } from '@/components/layout/ProfileSetup';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Usuário autenticado mas sem perfil → mostrar tela de completar perfil
  if (!profile) {
    return (
      <ToastProvider>
        <ProfileSetup userId={user.id} userEmail={user.email ?? ''} />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="flex h-screen bg-background">
        <Sidebar profile={profile} />
        <div className="flex-1 flex flex-col ml-64 min-h-0">
          <Topbar profile={profile} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
