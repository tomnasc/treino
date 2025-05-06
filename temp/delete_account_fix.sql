-- Script para corrigir problemas de exclusão de contas de usuário

-- 1. Adicionar trigger para excluir usuário da tabela auth.users quando o perfil for excluído
CREATE OR REPLACE FUNCTION public.handle_delete_user()
RETURNS TRIGGER AS $$
DECLARE
  is_admin BOOLEAN;
BEGIN
  -- Verificar se o usuário atual é administrador ou o próprio usuário
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND (
      -- Usuário tem permissão para excluir a si mesmo
      id = OLD.id OR 
      -- Ou é um administrador (role = 'service_role')
      raw_app_meta_data->>'provider' = 'service_role'
    )
  ) INTO is_admin;

  IF is_admin THEN
    -- Só administradores ou o próprio usuário podem excluir
    -- Chamar API do Supabase para excluir o usuário via procedure de sistema
    -- Observe que esta função só funciona quando chamada por um administrador
    PERFORM auth.admin_delete_user(OLD.id);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover o trigger se já existir
DROP TRIGGER IF EXISTS on_profile_delete ON public.profiles;

-- Criar trigger para exclusão de usuário quando o perfil for excluído
CREATE TRIGGER on_profile_delete
BEFORE DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_delete_user();

-- 2. Garantir que todas as tabelas relacionadas tenham FOREIGN KEY com ON DELETE CASCADE

-- Verificar e adicionar relacionamento em cascata para client_relationships
ALTER TABLE IF EXISTS public.client_relationships 
DROP CONSTRAINT IF EXISTS client_relationships_client_id_fkey,
ADD CONSTRAINT client_relationships_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.client_relationships 
DROP CONSTRAINT IF EXISTS client_relationships_personal_id_fkey,
ADD CONSTRAINT client_relationships_personal_id_fkey 
FOREIGN KEY (personal_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Configurações de usuário
ALTER TABLE IF EXISTS public.user_settings 
DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey,
ADD CONSTRAINT user_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Configurações de IA
ALTER TABLE IF EXISTS public.ai_settings 
DROP CONSTRAINT IF EXISTS ai_settings_user_id_fkey,
ADD CONSTRAINT ai_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Histórico de treinos
ALTER TABLE IF EXISTS public.workout_history 
DROP CONSTRAINT IF EXISTS workout_history_user_id_fkey,
ADD CONSTRAINT workout_history_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Treinos
ALTER TABLE IF EXISTS public.workouts 
DROP CONSTRAINT IF EXISTS workouts_created_by_fkey,
ADD CONSTRAINT workouts_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Adicionar políticas RLS para permitir exclusão de dados

-- Política para permitir ao usuário excluir seu próprio perfil
CREATE POLICY IF NOT EXISTS "Usuários podem excluir seus próprios perfis"
ON public.profiles FOR DELETE TO authenticated
USING (id = auth.uid());

-- Política para permitir exclusão em workout_history
CREATE POLICY IF NOT EXISTS "Usuários podem excluir seu próprio histórico de treinos"
ON public.workout_history FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Política para permitir exclusão em workouts
CREATE POLICY IF NOT EXISTS "Usuários podem excluir seus próprios treinos"
ON public.workouts FOR DELETE TO authenticated
USING (created_by = auth.uid());

-- Política para permitir exclusão em client_relationships
CREATE POLICY IF NOT EXISTS "Usuários podem excluir suas próprias relações de cliente"
ON public.client_relationships FOR DELETE TO authenticated
USING (client_id = auth.uid() OR personal_id = auth.uid());

-- Política para permitir exclusão em user_settings
CREATE POLICY IF NOT EXISTS "Usuários podem excluir suas próprias configurações"
ON public.user_settings FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Política para permitir exclusão em ai_settings
CREATE POLICY IF NOT EXISTS "Usuários podem excluir suas próprias configurações de IA"
ON public.ai_settings FOR DELETE TO authenticated
USING (user_id = auth.uid()); 