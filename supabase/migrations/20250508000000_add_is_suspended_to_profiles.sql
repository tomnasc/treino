-- Adicionar campo is_suspended à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Criar ou atualizar a função de contagem de usuários Auth
CREATE OR REPLACE FUNCTION public.count_auth_users()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  count INTEGER;
BEGIN
  -- Esta função precisa ser executada com privilégios elevados 
  -- pelo usuário postgres ou service_role
  SELECT COUNT(*) INTO count FROM auth.users;
  RETURN count;
EXCEPTION
  WHEN insufficient_privilege THEN
    RETURN -1; -- Indica erro de privilégio
END;
$$;

-- Garantir que apenas usuários autenticados possam suspender outros usuários
CREATE OR REPLACE FUNCTION check_user_suspension_permission()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se há mudança no campo is_suspended
  IF OLD.is_suspended IS DISTINCT FROM NEW.is_suspended THEN
    -- Apenas administradores podem suspender outros usuários
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Apenas administradores podem suspender usuários';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar ou substituir o trigger
DROP TRIGGER IF EXISTS check_suspension_permission ON public.profiles;
CREATE TRIGGER check_suspension_permission
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION check_user_suspension_permission();

-- Atualizar ou criar a política RLS para prevenir login de usuários suspensos
CREATE POLICY "Usuários suspensos não podem fazer login"
ON auth.users
FOR SELECT
TO authenticated
USING (
  NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.users.id
    AND profiles.is_suspended = TRUE
  )
); 