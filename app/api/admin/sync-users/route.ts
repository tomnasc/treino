import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { createClient } from '@supabase/supabase-js'

// Criar um cliente Supabase com a Service Role Key para ter permissões de admin
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export async function POST(req: NextRequest) {
  try {
    // Verificar se é um admin ou ambiente de desenvolvimento
    const authHeader = req.headers.get('authorization')
    
    if (!authHeader && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    // Verificar se a chave de serviço está configurada
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Configuração incompleta', 
          message: 'A chave SUPABASE_SERVICE_ROLE_KEY não está configurada. Adicione-a ao arquivo .env.local' 
        },
        { status: 500 }
      )
    }

    // Ler o script SQL do arquivo
    const scriptPath = path.join(process.cwd(), 'temp', 'create_user_trigger.sql')
    const sqlScript = fs.readFileSync(scriptPath, 'utf8')

    // Executar o script SQL
    const { error } = await supabaseAdmin.rpc('exec_sql', { query: sqlScript })

    if (error) {
      console.error('Erro ao executar script SQL:', error)
      return NextResponse.json(
        { 
          error: 'Falha ao sincronizar usuários', 
          details: error.message 
        },
        { status: 500 }
      )
    }

    // Buscar usuários que foram sincronizados
    const { data: syncedUsers, error: countError } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
    
    if (countError) {
      console.error('Erro ao contar usuários sincronizados:', countError)
    }

    return NextResponse.json({
      success: true,
      message: 'Trigger de criação de usuários configurado com sucesso',
      syncedUsers: syncedUsers || []
    })

  } catch (error: any) {
    console.error('Erro na sincronização de usuários:', error)
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor', 
        message: error.message 
      },
      { status: 500 }
    )
  }
} 