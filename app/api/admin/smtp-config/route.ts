import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { Database } from '@/app/types/database.types'

// Garantir que esta rota não seja armazenada em cache
export const dynamic = 'force-dynamic'

// GET para obter as configurações SMTP atuais (apenas para administradores)
export async function GET(request: NextRequest) {
  try {
    console.log("API de obtenção de configurações SMTP iniciada")
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Verificar a sessão atual para autenticação de maneira simplificada
    const { data: { session } } = await supabase.auth.getSession()
    
    // Verificar se existe uma sessão
    if (!session) {
      console.log("Sessão não encontrada, verificando token no cabeçalho")
      
      // Tentar autenticar via token no cabeçalho
      const authHeader = request.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
      }
      
      const token = authHeader.split(' ')[1]
      
      // Verificar o token
      const { data: userData, error: tokenError } = await supabase.auth.getUser(token)
      if (tokenError || !userData.user) {
        console.error("Token inválido:", tokenError)
        return NextResponse.json({ error: "Token inválido" }, { status: 401 })
      }
      
      console.log("Usuário autenticado via token:", userData.user.id)
    } else {
      console.log("Usuário autenticado via sessão:", session.user.id)
    }
    
    // Buscar configurações SMTP diretamente
    const { data: smtpConfig, error: configError } = await supabase
      .from('system_config')
      .select('*')
      .in('key', ['smtp_server', 'smtp_port', 'smtp_user', 'smtp_from'])
      
    if (configError) {
      console.error("Erro ao buscar configurações:", configError)
      return NextResponse.json(
        { error: "Erro ao buscar configurações SMTP: " + configError.message },
        { status: 500 }
      )
    }
    
    // Formatar os dados para fácil uso no frontend
    const formattedConfig = smtpConfig.reduce((acc, item) => {
      acc[item.key] = item.value
      return acc
    }, {} as Record<string, string>)
    
    return NextResponse.json({
      success: true,
      config: formattedConfig
    })
  } catch (error: any) {
    console.error("Erro ao obter configurações SMTP:", error)
    return NextResponse.json(
      { error: "Erro ao obter configurações SMTP: " + error.message },
      { status: 500 }
    )
  }
}

// POST para atualizar as configurações SMTP (apenas para administradores)
export async function POST(request: NextRequest) {
  try {
    console.log("API de atualização de configurações SMTP iniciada")
    
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database>({ cookies: () => cookieStore })
    
    // Verificar a sessão atual para autenticação de maneira simplificada
    const { data: { session } } = await supabase.auth.getSession()
    
    // Verificar se existe uma sessão
    if (!session) {
      console.log("Sessão não encontrada, verificando token no cabeçalho")
      
      // Tentar autenticar via token no cabeçalho
      const authHeader = request.headers.get('Authorization')
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
      }
      
      const token = authHeader.split(' ')[1]
      
      // Verificar o token
      const { data: userData, error: tokenError } = await supabase.auth.getUser(token)
      if (tokenError || !userData.user) {
        console.error("Token inválido:", tokenError)
        return NextResponse.json({ error: "Token inválido" }, { status: 401 })
      }
      
      console.log("Usuário autenticado via token:", userData.user.id)
    } else {
      console.log("Usuário autenticado via sessão:", session.user.id)
    }
    
    // Obter dados do corpo da requisição
    const { smtp_server, smtp_port, smtp_user, smtp_pass, smtp_from } = await request.json()
    
    // Validar dados
    if (!smtp_server || !smtp_port || !smtp_user || !smtp_from) {
      return NextResponse.json(
        { error: "Todos os campos SMTP são obrigatórios, exceto a senha se não for alterada." },
        { status: 400 }
      )
    }
    
    console.log("Atualizando configurações SMTP")
    
    // Atualizar cada configuração individualmente
    const updatePromises = [
      supabase
        .from('system_config')
        .update({ value: smtp_server, updated_at: new Date().toISOString() })
        .eq('key', 'smtp_server'),
      
      supabase
        .from('system_config')
        .update({ value: smtp_port, updated_at: new Date().toISOString() })
        .eq('key', 'smtp_port'),
      
      supabase
        .from('system_config')
        .update({ value: smtp_user, updated_at: new Date().toISOString() })
        .eq('key', 'smtp_user'),
      
      supabase
        .from('system_config')
        .update({ value: smtp_from, updated_at: new Date().toISOString() })
        .eq('key', 'smtp_from')
    ]
    
    // Atualizar senha apenas se fornecida
    if (smtp_pass) {
      updatePromises.push(
        supabase
          .from('system_config')
          .update({ value: smtp_pass, updated_at: new Date().toISOString() })
          .eq('key', 'smtp_pass')
      )
    }
    
    // Executar todas as atualizações
    const results = await Promise.all(updatePromises)
    
    // Verificar se alguma atualização falhou
    const errors = results
      .map(result => result.error)
      .filter(error => error !== null)
    
    if (errors.length > 0) {
      console.error("Erros ao atualizar configurações:", errors)
      return NextResponse.json(
        { 
          error: "Alguns erros ocorreram ao atualizar as configurações SMTP", 
          details: errors.map(e => e?.message) 
        },
        { status: 500 }
      )
    }
    
    console.log("Configurações SMTP atualizadas com sucesso")
    
    return NextResponse.json({
      success: true,
      message: "Configurações SMTP atualizadas com sucesso."
    })
  } catch (error: any) {
    console.error("Erro ao atualizar configurações SMTP:", error)
    return NextResponse.json(
      { error: "Erro ao atualizar configurações SMTP: " + error.message },
      { status: 500 }
    )
  }
} 