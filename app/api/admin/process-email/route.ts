import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Criar cliente Supabase com cookies para autenticação
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const cookieStore = cookies();
    
    // Criar cliente autenticado com cookies para verificar o usuário atual
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      },
      global: {
        fetch: fetch.bind(globalThis)
      },
      // @ts-ignore - O tipo cookies existe mas não está no tipo base
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        }
      }
    });
    
    // Verificar se o usuário está autenticado e é admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('Erro de autenticação:', authError);
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 401 }
      );
    }
    
    // Verificar se o usuário é administrador
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    
    if (profileError || !profileData || profileData.role !== 'admin') {
      console.error('Erro ao verificar permissões:', profileError);
      return NextResponse.json(
        { error: 'Permissão negada. Apenas administradores podem processar emails.' },
        { status: 403 }
      );
    }
    
    // Extrair ID do email
    const { emailId } = await request.json();
    
    if (!emailId) {
      return NextResponse.json(
        { error: 'ID do email não fornecido' },
        { status: 400 }
      );
    }
    
    // Verificar se o email existe
    const { data: emailData, error: emailError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', emailId)
      .single();
    
    if (emailError || !emailData) {
      console.error('Erro ao buscar email:', emailError);
      return NextResponse.json(
        { error: 'Email não encontrado' },
        { status: 404 }
      );
    }
    
    try {
      // Atualizar o status para processando
      await supabase
        .from('email_logs')
        .update({ 
          status: 'processando',
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId);
      
      // Chamar o endpoint send-email com os dados do email
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Passar o cookie de autenticação
          'Cookie': cookieStore.toString()
        },
        body: JSON.stringify({
          to: emailData.recipient_email,
          subject: emailData.subject,
          body: emailData.body
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erro ao enviar email');
      }
      
      // Atualizar status para enviado
      await supabase
        .from('email_logs')
        .update({ 
          status: 'enviado',
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId);
      
      return NextResponse.json({
        success: true,
        message: 'Email enviado com sucesso',
        recipient: emailData.recipient_email,
        subject: emailData.subject
      });
    } catch (error: any) {
      console.error('Erro ao enviar email:', error);
      
      // Atualizar o status para erro
      await supabase
        .from('email_logs')
        .update({ 
          status: `erro: ${error.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', emailId);
      
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