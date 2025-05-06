-- Função para criar perfil de usuário
-- Esta função evita problemas de tipagem entre TypeScript e SQL
-- Particularmente com o campo role

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