import Stripe from 'stripe';
import { loadStripe } from '@stripe/stripe-js';

// Inicializar Stripe no lado do servidor
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// Inicializar Stripe no lado do cliente
export const getStripeClient = async () => {
  return loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
};

// Planos de assinatura disponíveis
export const subscriptionPlans = [
  {
    id: 'price_mensal',
    name: 'Plano Mensal',
    description: 'Acesso a todos os recursos premium por 1 mês',
    features: [
      'Geração ilimitada de treinos com IA',
      'Treinos personalizados exclusivos',
      'Análises avançadas de progresso',
      'Suporte prioritário',
      'Acesso aos serviços de personal trainer',
      'Sem limite de treinos cadastrados'
    ],
    price: 'R$ 6,97',
    interval: 'month',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MENSAL
  },
  {
    id: 'price_anual',
    name: 'Plano Anual',
    description: 'Economize com o plano anual',
    features: [
      'Geração ilimitada de treinos com IA',
      'Treinos personalizados exclusivos',
      'Análises avançadas de progresso',
      'Suporte prioritário',
      'Acesso aos serviços de personal trainer',
      'Sem limite de treinos cadastrados',
      'Economia significativa em relação ao plano mensal'
    ],
    price: 'R$ 66,90',
    interval: 'year',
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANUAL
  }
];

// Define as limitações dos usuários gratuitos para referência no frontend
export const freeUserLimitations = [
  'Limite de 3 treinos cadastrados',
  'Não pode ser cliente de personal trainers',
  'Funcionalidades avançadas de IA limitadas',
  'Suporte padrão'
];

// Criar sessão de checkout
export const createCheckoutSession = async (
  customerId: string, 
  priceId: string, 
  returnUrl: string
) => {
  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: {
        customerId
      }
    });
    
    return session;
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    throw error;
  }
};

// Obter detalhes da assinatura
export const getSubscription = async (subscriptionId: string) => {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    console.error('Erro ao buscar assinatura:', error);
    throw error;
  }
};

// Criar portal de gerenciamento de assinatura
export const createCustomerPortalSession = async (customerId: string, returnUrl: string) => {
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
    return session;
  } catch (error) {
    console.error('Erro ao criar sessão do portal:', error);
    throw error;
  }
};

// Criar ou atualizar customer do Stripe
export const createOrRetrieveCustomer = async (email: string, name?: string, customerId?: string) => {
  if (customerId) {
    return await stripe.customers.retrieve(customerId);
  }
  
  // Buscar customer por email para evitar duplicação
  const customers = await stripe.customers.list({ email });
  
  if (customers.data.length > 0) {
    return customers.data[0];
  }
  
  // Criar novo customer
  return await stripe.customers.create({
    email,
    name: name || email
  });
}; 