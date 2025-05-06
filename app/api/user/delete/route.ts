import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { Database } from '@/app/types/database.types'

// Garantir que esta rota não seja armazenada em cache
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function POST(request: Request) {
  const cookieStore = cookies()
  
  try {
    console.log("API de exclusão iniciada, verificando cookies...")
    
    // Inicializar o cliente Supabase com cookies do servidor
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Verificar a sessão atual para autenticação
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Erro ao obter sessão:', sessionError)
      return NextResponse.json(
        { error: 'Erro ao verificar autenticação: ' + sessionError.message },
        { status: 500 }
      )
    }
    
    // Imprimir os cookies para depuração
    console.log("Cookies disponíveis:", cookieStore.getAll().map(c => c.name).join(', '))
    
    let userId = sessionData?.session?.user.id
    let userEmail = sessionData?.session?.user.email

    // Se não tiver sessão, tentar obter do cabeçalho de Authorization
    if (!userId || !userEmail) {
      console.log('Sessão não encontrada nos cookies, verificando cabeçalho de autorização')
      
      const authHeader = request.headers.get('Authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1]
        console.log('Token de acesso encontrado no cabeçalho')
        
        // Verificar o token usando a API do Supabase
        const { data: userData, error: tokenError } = await supabase.auth.getUser(token)
        
        if (tokenError) {
          console.error('Erro ao verificar token:', tokenError)
          return NextResponse.json(
            { error: 'Token de acesso inválido: ' + tokenError.message },
            { status: 401 }
          )
        }
        
        if (userData && userData.user) {
          userId = userData.user.id
          userEmail = userData.user.email
          console.log('Usuário autenticado via token:', userId)
        }
      }
    }
    
    if (!userId || !userEmail) {
      console.error('Não foi possível autenticar o usuário por nenhum método')
      
      // Tentar obter o usuário diretamente dos cookies para diagnóstico
      try {
        const supabaseSession = cookieStore.get('supabase-auth-token')
        console.log("Token de autenticação encontrado:", !!supabaseSession)
      } catch (e) {
        console.error("Erro ao ler cookie de sessão:", e)
      }
      
      return NextResponse.json(
        { error: 'Não autorizado. Usuário não autenticado.' },
        { status: 401 }
      )
    }
    
    console.log("Usuário autenticado:", userId)
    
    // Obter dados do corpo da requisição
    const body = await request.json().catch(() => ({}))
    const { confirmEmail } = body
    
    if (!confirmEmail) {
      return NextResponse.json(
        { error: 'Email de confirmação é obrigatório.' },
        { status: 400 }
      )
    }
    
    // Verificar se o email de confirmação coincide com o email do usuário
    if (confirmEmail !== userEmail) {
      return NextResponse.json(
        { error: 'Email de confirmação não coincide com o email do usuário.' },
        { status: 400 }
      )
    }
    
    console.log("Iniciando exclusão de dados para usuário:", userId)
    
    // Sequência de exclusão para evitar problemas de chave estrangeira
    try {
      // 1. Primeiro buscar dados necessários para exclusão cruzada
      const { data: workoutHistories } = await supabase
        .from('workout_history')
        .select('id')
        .eq('user_id', userId);
      
      const historyIds = workoutHistories?.map(h => h.id) || [];
      console.log(`Encontrados ${historyIds.length} registros de histórico de treinos`);
      
      const { data: workouts } = await supabase
        .from('workouts')
        .select('id')
        .eq('created_by', userId);
      
      const workoutIds = workouts?.map(w => w.id) || [];
      console.log(`Encontrados ${workoutIds.length} treinos`);
      
      // 2. Excluir registros relacionados na ordem correta
      
      // Limpar histórico de exercícios
      if (historyIds.length > 0) {
        console.log('Excluindo histórico de exercícios...');
        await supabase
          .from('exercise_history')
          .delete()
          .in('workout_history_id', historyIds);
      }
      
      // Limpar histórico de treinos
      console.log('Excluindo histórico de treinos...');
      await supabase
        .from('workout_history')
        .delete()
        .eq('user_id', userId);
      
      // Limpar exercícios dos treinos
      if (workoutIds.length > 0) {
        console.log('Excluindo exercícios dos treinos...');
        await supabase
          .from('workout_exercises')
          .delete()
          .in('workout_id', workoutIds);
      }
      
      // Limpar treinos
      console.log('Excluindo treinos...');
      await supabase
        .from('workouts')
        .delete()
        .eq('created_by', userId);
      
      // Limpar configurações de IA
      console.log('Excluindo configurações de IA...');
      await supabase
        .from('ai_settings')
        .delete()
        .eq('user_id', userId);
      
      // Limpar relações com clientes/personal
      console.log('Excluindo relações de cliente...');
      await supabase
        .from('client_relationships')
        .delete()
        .or(`personal_id.eq.${userId},client_id.eq.${userId}`);
      
      // Limpar configurações do usuário
      console.log('Excluindo configurações do usuário...');
      await supabase
        .from('user_settings')
        .delete()
        .eq('user_id', userId);
      
      // Por último, excluir o perfil
      console.log('Excluindo perfil do usuário...');
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (profileError) {
        console.error('Erro ao excluir perfil:', profileError);
        return NextResponse.json(
          { error: `Erro ao excluir perfil: ${profileError.message}` },
          { status: 500 }
        );
      }
      
      // Tentar excluir o usuário da tabela auth.users
      let authUserDeleted = false;
      
      // 1. Primeiro, tentar com a chave de serviço (se disponível)
      try {
        console.log('Tentando excluir usuário do Auth com permissões de serviço...');
        
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
        
        if (supabaseServiceKey) {
          // Criar cliente administrativo
          const adminClient = createClient(supabaseUrl, supabaseServiceKey);
          
          // Excluir o usuário usando o cliente administrativo
          const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
          
          if (!deleteError) {
            console.log('Usuário excluído com sucesso do sistema de autenticação');
            authUserDeleted = true;
          } else {
            console.warn('Erro ao tentar excluir com permissões de serviço:', deleteError);
          }
        } else {
          console.warn('Chave de serviço não disponível no ambiente');
        }
      } catch (serviceError) {
        console.warn('Erro ao tentar usar permissões de serviço:', serviceError);
      }
      
      // 2. Se não conseguiu com a chave de serviço, tentar com o trigger SQL
      if (!authUserDeleted) {
        try {
          console.log('Tentando excluir usuário via SQL...');
          
          // Executar SQL para acionar o trigger que tentará excluir o usuário auth
          const { error: sqlError } = await supabase.rpc('delete_auth_user', { user_id: userId });
          
          if (!sqlError) {
            console.log('SQL para exclusão executado com sucesso');
            authUserDeleted = true;
          } else {
            console.warn('Erro ao executar SQL de exclusão:', sqlError);
          }
        } catch (sqlError) {
          console.warn('Erro ao tentar SQL:', sqlError);
        }
      }
      
      // 3. Informar o resultado, mas não falhar se apenas a exclusão do auth falhar
      if (!authUserDeleted) {
        console.warn('Não foi possível excluir o usuário do sistema de autenticação. ' +
          'As tabelas de dados foram limpas, mas o usuário ainda existe na tabela auth.users. ' +
          'Um administrador precisará excluir manualmente ou executar o SQL fornecido.');
      }
      
      console.log("Exclusão de dados concluída com sucesso");
      return NextResponse.json({ 
        success: true,
        authUserDeleted: authUserDeleted
      });
    } catch (error: any) {
      console.error('Erro ao excluir dados do usuário:', error);
      
      return NextResponse.json(
        { error: `Erro na exclusão: ${error.message}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Erro ao processar solicitação de exclusão de conta:', error)
    
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir conta' },
      { status: 500 }
    )
  }
} 