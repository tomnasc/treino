-- Criar tabela para registrar logs de emails enviados
CREATE TABLE IF NOT EXISTS public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by UUID NOT NULL REFERENCES public.profiles(id),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent', -- 'sent', 'failed', etc.
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Adicionar políticas RLS
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Política para permitir apenas que administradores visualizem todos os logs
CREATE POLICY "Admins podem ver todos os logs de email" 
ON public.email_logs 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Política para permitir apenas que administradores insiram logs
CREATE POLICY "Admins podem inserir logs de email" 
ON public.email_logs 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Adicionar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS email_logs_sent_by_idx ON public.email_logs(sent_by);
CREATE INDEX IF NOT EXISTS email_logs_recipient_email_idx ON public.email_logs(recipient_email);
CREATE INDEX IF NOT EXISTS email_logs_sent_at_idx ON public.email_logs(sent_at); 