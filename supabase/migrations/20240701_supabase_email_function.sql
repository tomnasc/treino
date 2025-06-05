-- Função para enviar emails usando o sistema nativo do Supabase
CREATE OR REPLACE FUNCTION public.test_supabase_email(
  p_to TEXT,
  p_subject TEXT,
  p_message TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_email_id UUID;
BEGIN
  -- Registrar o email na tabela de logs
  INSERT INTO public.email_logs (
    recipient_email, 
    subject, 
    body, 
    status
  ) VALUES (
    p_to, 
    p_subject, 
    p_message, 
    'enviado via supabase'
  ) RETURNING id INTO v_email_id;
  
  -- Usar a função interna do supabase para enviar o email
  PERFORM extensions.http((
    'POST',
    CONCAT(current_setting('request.headers')::json->>'x-forwarded-host', '/auth/v1/otp'),
    ARRAY[CONCAT('apikey:', current_setting('supabase_api_key'))::text],
    'application/json',
    json_build_object(
      'email', p_to,
      'type', 'email',
      'email_subject', p_subject,
      'email_content', p_message
    )::text
  )::extensions.http_request);
  
  -- Atualizar status após o envio
  UPDATE public.email_logs 
  SET status = 'processado via sistema supabase', updated_at = NOW()
  WHERE id = v_email_id;
  
  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, atualizar o status
  IF v_email_id IS NOT NULL THEN
    UPDATE public.email_logs 
    SET status = CONCAT('erro: ', SQLERRM), updated_at = NOW()
    WHERE id = v_email_id;
  END IF;
  
  -- Lançar o erro para o chamador
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Conceder permissões para o uso da função
GRANT EXECUTE ON FUNCTION public.test_supabase_email TO authenticated;
GRANT EXECUTE ON FUNCTION public.test_supabase_email TO service_role; 