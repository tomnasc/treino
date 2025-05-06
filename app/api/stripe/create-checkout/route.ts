import { NextResponse } from 'next/server';
import { createCheckoutSession, createOrRetrieveCustomer } from '@/app/lib/stripe';
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
    const { priceId, returnUrl } = await request.json();

    if (!priceId) {
      return NextResponse.json(
        { error: 'ID do plano não informado' },
        { status: 400 }
      );
    }

    // Buscar perfil do usuário
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Criar ou recuperar customer do Stripe
    const customer = await createOrRetrieveCustomer(
      profileData.email,
      profileData.full_name || undefined,
      profileData.stripe_customer_id || undefined
    );

    // Atualizar stripe_customer_id se for a primeira vez
    if (!profileData.stripe_customer_id) {
      await supabase
        .from('profiles')
        .update({ 
          stripe_customer_id: customer.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentUser.id);
    }

    // Criar sessão de checkout
    const session = await createCheckoutSession(
      customer.id,
      priceId,
      returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/planos`
    );

    // Retornar ID da sessão
    return NextResponse.json({ sessionId: session.id });

  } catch (error: any) {
    console.error('Erro ao criar checkout:', error);
    return NextResponse.json(
      { error: error.message || 'Falha ao criar sessão de pagamento' },
      { status: 500 }
    );
  }
} 