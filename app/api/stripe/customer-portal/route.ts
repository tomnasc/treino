import { NextResponse } from 'next/server';
import { createCustomerPortalSession } from '@/app/lib/stripe';
import { getCurrentUser } from '@/app/lib/auth';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
  try {
    // Verificar autenticação
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Obter dados do body
    const { returnUrl } = await request.json();

    // Buscar perfil do usuário
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    if (!profileData.stripe_customer_id) {
      return NextResponse.json(
        { error: 'Usuário não possui uma assinatura ativa' },
        { status: 400 }
      );
    }

    // Criar sessão do portal do cliente
    const session = await createCustomerPortalSession(
      profileData.stripe_customer_id,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/planos`
    );

    // Retornar URL para redirecionamento
    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error('Erro ao criar portal do cliente:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao criar portal do cliente' },
      { status: 500 }
    );
  }
} 