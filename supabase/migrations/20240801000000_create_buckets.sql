-- Criar buckets para armazenamento de arquivos
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('feedback-attachments', 'feedback-attachments', false),
  ('trainer-certifications', 'trainer-certifications', false)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso para o bucket feedback-attachments
CREATE POLICY "Usuários autenticados podem inserir anexos de feedback" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'feedback-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuários podem ler seus próprios anexos de feedback" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'feedback-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Administradores podem ler todos os anexos de feedback" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (
    bucket_id = 'feedback-attachments' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Criar políticas de acesso para o bucket trainer-certifications
CREATE POLICY "Usuários autenticados podem inserir certificados" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'trainer-certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Usuários podem ler seus próprios certificados" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (bucket_id = 'trainer-certifications' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Administradores podem ler todos os certificados" 
  ON storage.objects FOR SELECT 
  TO authenticated 
  USING (
    bucket_id = 'trainer-certifications' AND 
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  ); 