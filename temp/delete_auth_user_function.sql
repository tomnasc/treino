-- Criar função RPC para exclusão de usuário de auth.users
CREATE OR REPLACE FUNCTION public.delete_auth_user(user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Esta função só deve funcionar para o próprio usuário ou administrador
  IF (auth.uid() = user_id OR 
     EXISTS(SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'admin')) THEN
    
    -- Tentar excluir o usuário da tabela auth.users utilizando procedure interna
    -- Esta operação só terá sucesso se chamada por um usuário com privilégios
    PERFORM auth.admin_delete_user(user_id);
    
  ELSE
    RAISE EXCEPTION 'Permissão negada. Somente o próprio usuário ou um administrador pode realizar esta operação.';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 