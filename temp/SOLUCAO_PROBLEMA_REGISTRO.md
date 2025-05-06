# Solução do Problema de Registro de Usuários

## Problema identificado

Quando um usuário se registrava no sistema, ele era criado na tabela `auth.users` (gerenciada pelo Supabase), mas não era criado automaticamente um perfil correspondente na tabela `public.profiles`. Isso causava problemas de login e acesso às funcionalidades do sistema.

## Causa

O Supabase normalmente cria automaticamente um trigger para sincronizar usuários entre `auth.users` e `public.profiles`, mas em alguns casos esse trigger pode não existir ou não funcionar corretamente.

## Solução implementada

### 1. Trigger no Banco de Dados
Criamos um trigger no banco de dados que vai monitorar a tabela `auth.users` e criar automaticamente um registro na tabela `public.profiles` quando um novo usuário for criado:

```sql
-- Script: create_user_trigger.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Inserir o novo usuário na tabela profiles
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.user_metadata->>'full_name', 
    NEW.user_metadata->>'avatar_url', 
    'free', -- role padrão para novos usuários
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para executar a função após inserção na tabela auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 2. Função RPC para Criar Perfis
Criamos uma função RPC para facilitar a criação de perfis diretamente via SQL:

```sql
-- Script: create_user_profile_function.sql
CREATE OR REPLACE FUNCTION public.create_user_profile(
  user_id uuid,
  user_email text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Inserir o perfil do usuário
  INSERT INTO public.profiles (
    id,
    email,
    role,
    created_at
  ) VALUES (
    user_id,
    user_email,
    'free',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;
```

### 3. Modificação na Função de Registro
Modificamos a função `signUp` em `app/lib/auth.ts` para garantir que um perfil seja criado através de nossa função auxiliar `createProfileForUser`, que tenta várias abordagens:

1. Primeiro, tenta criar o perfil usando a função RPC que criamos
2. Se falhar, tenta fazer uma inserção direta com anotação para ignorar o erro de tipo

### 4. API para Sincronização de Usuários
Criamos uma API para administradores em `/api/admin/sync-users` que permite:
- Executar o script SQL para criar o trigger
- Sincronizar usuários existentes que não tenham perfil

### 5. Interface de Administração
Criamos uma interface de administração em `/dashboard/settings/admin/sync-users` que permite:
- Ver a contagem de usuários em `auth.users` vs `public.profiles`
- Executar a sincronização para criar perfis para usuários existentes

## Como aplicar a solução

1. Adicione a variável `SUPABASE_SERVICE_ROLE_KEY` ao arquivo `.env.local` (veja instruções em `temp/config-service-role.md`)
2. Execute o script SQL `temp/create_user_trigger.sql` no painel SQL do Supabase
3. Execute o script SQL `temp/create_user_profile_function.sql` no painel SQL do Supabase 
4. Execute o script SQL `temp/exec_sql_function.sql` no painel SQL do Supabase
5. Execute o script SQL `temp/count_auth_users_function.sql` no painel SQL do Supabase
6. Acesse a interface de administração `/dashboard/settings/admin/sync-users` para sincronizar usuários existentes

## Prevenção de problemas futuros

A solução é robusta e previne problemas futuros de três maneiras:

1. O trigger no banco de dados garante que novos usuários sempre tenham um perfil
2. A função de registro foi modificada para criar perfis mesmo se o trigger falhar
3. A interface de administração permite sincronizar usuários se ocorrer algum problema

## Observações Importantes

1. **Mudanças na estrutura do Supabase**: Este código foi adaptado para a versão atual do Supabase, onde o campo que armazena os metadados do usuário é `user_metadata` (não `raw_user_meta_data` como em versões anteriores).

2. **Permissões de administrador**: A verificação de permissões de administrador também foi ajustada para usar o campo correto: `user_metadata->>'role' = 'admin'`.

3. **Compatibilidade**: Se você estiver usando uma versão diferente do Supabase, pode ser necessário adaptar os nomes dos campos nos scripts SQL.

Isso garante uma experiência de usuário sem interrupções e facilita a administração do sistema. 