import { supabase } from './supabase';

/**
 * Função para enviar emails através do Supabase usando as configurações SMTP já configuradas
 * Esta função utiliza a função rpc para chamar o serviço de email do Supabase
 */
export async function sendEmail({
  to,
  subject,
  body,
  fromName = 'Treino na Mão',
  isHtml = false
}: {
  to: string;
  subject: string;
  body: string;
  fromName?: string;
  isHtml?: boolean;
}) {
  try {
    // Usar a função rpc para enviar email via Supabase
    const { data, error } = await supabase.rpc('send_email', {
      p_to: to,
      p_subject: subject,
      p_body: body,
      p_from_name: fromName,
      p_is_html: isHtml
    });

    if (error) {
      console.error('Erro ao enviar email via Supabase:', error);
      throw error;
    }

    console.log('Email enviado com sucesso:', data);
    return { success: true };
  } catch (error) {
    console.error('Falha ao enviar email:', error);
    throw error;
  }
} 