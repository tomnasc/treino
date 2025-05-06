# Configuração da Service Role Key do Supabase

Para que a sincronização de usuários funcione corretamente, você precisa configurar a variável de ambiente `SUPABASE_SERVICE_ROLE_KEY` no seu arquivo `.env.local`.

## O que é a Service Role Key?

A Service Role Key é uma chave de API com privilégios elevados que permite realizar operações administrativas no Supabase, como acessar a tabela `auth.users` e criar ou excluir usuários. Ela não deve ser exposta publicamente.

## Como obter a Service Role Key

1. Acesse o painel de controle do Supabase (https://app.supabase.io)
2. Selecione seu projeto
3. Vá para `Configurações` (Settings) > `API`
4. Role a página para baixo até a seção `Project API keys`
5. Copie o valor do campo `service_role` - este é o valor que você precisa

## Configuração

Adicione a seguinte linha ao seu arquivo `.env.local`:

```
SUPABASE_SERVICE_ROLE_KEY=sua-chave-de-service-role
```

⚠️ **ATENÇÃO**: Esta chave fornece acesso total ao seu banco de dados, então:
- Nunca exponha esta chave em código do lado do cliente
- Nunca compartilhe esta chave
- Nunca faça commit desta chave no controle de versão (Git)

## Uso

A chave de serviço é usada em contextos do lado do servidor, como:

1. API de sincronização de usuários (`/api/admin/sync-users`)
2. Operações de exclusão de conta de usuário
3. Outras operações administrativas que exigem acesso direto à API de administração do Supabase

Depois de configurar a chave, reinicie o servidor de desenvolvimento para que as alterações entrem em vigor. 