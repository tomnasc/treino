-- Função para executar SQL dinâmico com privilégios elevados
-- ATENÇÃO: Esta função deve ser usada apenas por administradores
-- pois permite a execução de qualquer comando SQL

CREATE OR REPLACE FUNCTION public.exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verificar se o usuário atual é administrador
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() AND 
    (
      -- Verificar se o usuário é admin baseado em role nos metadados
      -- ou se está usando uma chave de serviço
      user_metadata->>'role' = 'admin' OR
      user_metadata->>'provider' = 'service_role'
    )
  ) THEN
    RAISE EXCEPTION 'Somente administradores podem executar SQL dinâmico';
  END IF;

  -- Executar a consulta
  EXECUTE query;
END;
$$; 