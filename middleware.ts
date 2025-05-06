import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { Database } from './app/types/database.types'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  // Criar cliente do Supabase para o middleware
  const supabase = createMiddlewareClient<Database>({ req, res })
  
  // Atualizar os cookies de autenticação para cada requisição
  const { data: { session } } = await supabase.auth.getSession()
  
  // Aumentar a vida útil do cookie se o usuário tiver uma sessão válida
  if (session) {
    // Remover a verificação de 'delete' para permitir que a sessão seja renovada mesmo para rotas de exclusão
    await supabase.auth.refreshSession()
  }
  
  return res
}

// Aplica o middleware a todas as rotas que precisam de autenticação
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|api/auth|login|register|sounds|screenshots).*)',
  ],
} 