# Variáveis de Ambiente para Integração com Stripe

Para que o módulo de pagamentos funcione corretamente, você precisa configurar as seguintes variáveis de ambiente no arquivo `.env.local`:

```
# Stripe (Pagamentos)
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Preços do Stripe
NEXT_PUBLIC_STRIPE_PRICE_MENSAL=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_ANUAL=price_xxxxxxxxxxxxx

# URL da aplicação
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Configuração do Stripe

1. Crie uma conta no [Stripe](https://stripe.com)
2. No painel do Stripe, obtenha suas chaves de API:
   - Chave secreta (STRIPE_SECRET_KEY)
   - Chave publicável (NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)

3. Configure produtos e preços:
   - Crie um produto para o plano mensal
   - Crie um produto para o plano anual
   - Anote os IDs dos preços (format: price_xxxxx)

4. Configure o webhook:
   - Vá para Developers > Webhooks
   - Adicione um endpoint: `https://seu-site.com/api/stripe/webhook`
   - Eventos a monitorar:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Anote o segredo do webhook (STRIPE_WEBHOOK_SECRET)

## Teste local com Stripe CLI

Para testar pagamentos no ambiente de desenvolvimento:

1. Instale o [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Execute o encaminhamento de webhook:
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

O Stripe CLI fornecerá um webhook secret que você pode usar na variável STRIPE_WEBHOOK_SECRET. 