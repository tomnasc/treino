import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/app/lib/stripe';
import { supabase } from '@/app/lib/supabase';

// Esta função precisa ser exportada como default para o Next.js tratar corretamente
export async function POST(request: Request) {
  const body = await request.text();
  const signature = headers().get('stripe-signature') as string;

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error: any) {
    console.error(`Webhook Error: ${error.message}`);
    return NextResponse.json(
      { error: `Webhook Error: ${error.message}` },
      { status: 400 }
    );
  }

  // Processar eventos do Stripe
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        await handleInvoicePaymentSucceeded(invoice);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Erro ao processar webhook:', error);
    return NextResponse.json(
      { error: 'Erro ao processar webhook' },
      { status: 500 }
    );
  }
}

async function handleCheckoutSessionCompleted(session: any) {
  // Verificar se é uma assinatura
  if (session.mode !== 'subscription') return;

  // Buscar informações da assinatura
  const subscription = await stripe.subscriptions.retrieve(session.subscription);
  const customerId = session.customer;

  // Encontrar usuário pelo customer_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId);

  if (error || !profiles.length) {
    console.error('Usuário não encontrado:', error || 'Customer ID não encontrado');
    return;
  }

  const userId = profiles[0].id;

  // Determinar o ID do plano (price)
  const priceId = subscription.items.data[0].price.id;

  // Atualizar informações da assinatura no banco de dados
  await supabase
    .from('profiles')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      subscription_price_id: priceId,
      role: 'premium',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

async function handleInvoicePaymentSucceeded(invoice: any) {
  // Se não for uma assinatura, ignorar
  if (!invoice.subscription) return;

  // Buscar informações da assinatura
  const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
  const customerId = invoice.customer;

  // Encontrar usuário pelo customer_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId);

  if (error || !profiles.length) {
    console.error('Usuário não encontrado:', error || 'Customer ID não encontrado');
    return;
  }

  const userId = profiles[0].id;

  // Atualizar status da assinatura
  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

async function handleSubscriptionUpdated(subscription: any) {
  const customerId = subscription.customer;

  // Encontrar usuário pelo customer_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId);

  if (error || !profiles.length) {
    console.error('Usuário não encontrado:', error || 'Customer ID não encontrado');
    return;
  }

  const userId = profiles[0].id;

  // Determinar o ID do plano (price)
  const priceId = subscription.items.data[0].price.id;

  // Atualizar informações da assinatura
  await supabase
    .from('profiles')
    .update({
      subscription_status: subscription.status,
      subscription_price_id: priceId,
      role: subscription.status === 'active' || subscription.status === 'trialing' ? 'premium' : 'free',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
}

async function handleSubscriptionDeleted(subscription: any) {
  const customerId = subscription.customer;

  // Encontrar usuário pelo customer_id
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId);

  if (error || !profiles.length) {
    console.error('Usuário não encontrado:', error || 'Customer ID não encontrado');
    return;
  }

  const userId = profiles[0].id;

  // Atualizar informações no banco quando a assinatura for cancelada
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'canceled',
      role: 'free',
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);
} 