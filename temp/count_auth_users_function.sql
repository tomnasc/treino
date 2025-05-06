-- Função para contar usuários na tabela auth.users
-- Esta função deve ser executada com privilégios elevados (service_role)

CREATE OR REPLACE FUNCTION public.count_auth_users()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_count integer;
BEGIN
    -- Contar usuários confirmados na tabela auth.users
    SELECT COUNT(*) 
    INTO user_count 
    FROM auth.users 
    WHERE confirmed_at IS NOT NULL;
    
    RETURN user_count;
END;
$$; 