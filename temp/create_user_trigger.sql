-- Script para adicionar trigger de criação automática de perfil
-- Este trigger vai criar um registro na tabela public.profiles sempre que um usuário for criado em auth.users

-- Função que será executada quando um usuário for criado
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

-- Remover o trigger se já existir
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar o trigger para executar a função após inserção na tabela auth.users
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Verificar usuários que estão em auth.users mas não em public.profiles e criar perfis para eles
DO $$
DECLARE
  auth_user RECORD;
BEGIN
  FOR auth_user IN 
    SELECT au.id, au.email, au.user_metadata->>'full_name' as full_name, au.user_metadata->>'avatar_url' as avatar_url
    FROM auth.users au
    LEFT JOIN public.profiles p ON au.id = p.id
    WHERE p.id IS NULL
  LOOP
    INSERT INTO public.profiles (id, email, full_name, avatar_url, role, created_at)
    VALUES (
      auth_user.id, 
      auth_user.email,
      auth_user.full_name, 
      auth_user.avatar_url, 
      'free',
      NOW()
    );
  END LOOP;
END
$$; 