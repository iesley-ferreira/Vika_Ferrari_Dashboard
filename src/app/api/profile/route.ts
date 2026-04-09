import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, full_name, area, role } = body;

    if (!id || !full_name || !area || !role) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando.' }, { status: 400 });
    }

    // Verify the request comes from an authenticated user
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Allow: authenticated user creating their own profile, OR admin-created profiles
    // We validate the ID matches the authenticated user when a session exists
    if (user && user.id !== id) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 });
    }

    // Use service role key to bypass RLS
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!serviceKey) {
      return NextResponse.json({ error: 'Configuração de servidor incompleta.' }, { status: 500 });
    }

    const adminClient = createClient(serviceUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const seed = encodeURIComponent(full_name.trim());
    const avatar_url = `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}`;

    const { error } = await adminClient
      .from('profiles')
      .upsert({ id, full_name: full_name.trim(), area, role, avatar_url }, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}

// Also handle PATCH for gestores updating other users' profiles
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, area, role, full_name } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório.' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setAll(cookiesToSet: { name: string; value: string; options: any }[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Verify requester is a gestor
    const { data: requesterProfile } = await supabase
      .from('profiles')
      .select('area')
      .eq('id', user.id)
      .single();

    if (requesterProfile?.area !== 'gestor') {
      return NextResponse.json({ error: 'Apenas gestores podem alterar perfis.' }, { status: 403 });
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const updateData: Record<string, string> = {};
    if (area) updateData.area = area;
    if (role) updateData.role = role;
    if (full_name) updateData.full_name = full_name;

    const { error } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
