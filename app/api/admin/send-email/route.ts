import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

// Garantir que esta rota não seja armazenada em cache
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    // Obter os dados do corpo da requisição
    const { to, subject, body } = await request.json();
    
    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: 'Destinatário, assunto e corpo da mensagem são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Verificar ambiente
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Em ambiente de desenvolvimento, podemos simular o envio sem autenticação
    if (isDevelopment) {
      console.log('=== SIMULANDO ENVIO DE EMAIL (AMBIENTE DE DESENVOLVIMENTO) ===');
      console.log(`Para: ${to}`);
      console.log(`Assunto: ${subject}`);
      console.log(`Corpo: ${body}`);
      console.log('===============================================================');
      
      return NextResponse.json({
        success: true,
        message: 'Email simulado com sucesso (ambiente de desenvolvimento)',
        recipient: to,
        dev: true
      });
    }
    
    // Em produção, verificar autenticação
    const cookieStore = cookies();
    
    // Usar o RouteHandlerClient que gerencia automaticamente os cookies
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    // Verificar se o usuário está autenticado
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.error('Erro de sessão:', sessionError);
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Verificar se o usuário é administrador
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (profileError || !profileData || profileData.role !== 'admin') {
      console.error('Erro ao verificar permissões:', profileError);
      return NextResponse.json(
        { error: 'Permissão negada. Apenas administradores podem enviar emails.' },
        { status: 403 }
      );
    }
    
    try {
      // Registrar o email no banco de dados
      const { data: emailLog, error: logError } = await supabase
        .from('email_logs')
        .insert({
          sent_by: userId,
          recipient_email: to,
          subject: subject,
          body: body,
          status: 'enviando'
        })
        .select()
        .single();
      
      if (logError) {
        throw new Error(`Erro ao registrar email: ${logError.message}`);
      }
      
      const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
      
      // Verificar se temos chave de serviço em produção
      if (!hasServiceKey) {
        await supabase
          .from('email_logs')
          .update({ 
            status: 'erro: chave de serviço não configurada',
            updated_at: new Date().toISOString()
          })
          .eq('id', emailLog.id);
          
        throw new Error('Configuração de chave de serviço não encontrada. Verifique a variável SUPABASE_SERVICE_ROLE_KEY');
      }
      
      // Obter a chave de serviço do ambiente
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
      
      // Criar cliente admin para enviar o email
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Enviar email usando o método nativo do Supabase
      const { error: emailError } = await adminSupabase.auth.admin.inviteUserByEmail(to, {
        data: {
          custom_email_subject: subject,
          custom_email_content: body,
          is_admin_email: true
        }
      });
      
      if (emailError) {
        // Atualizar status para erro
        await supabase
          .from('email_logs')
          .update({ 
            status: `erro: ${emailError.message}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', emailLog.id);
          
        throw new Error(`Erro ao enviar email: ${emailError.message}`);
      }
      
      // Atualizar status para enviado
      await supabase
        .from('email_logs')
        .update({ 
          status: 'enviado',
          updated_at: new Date().toISOString()
        })
        .eq('id', emailLog.id);
      
      return NextResponse.json({
        success: true,
        message: 'Email enviado com sucesso',
        recipient: to,
        emailId: emailLog.id
      });
      
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      
      return NextResponse.json(
        { error: error.message || 'Erro ao enviar email' },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('Erro na API:', error);
    
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
} 