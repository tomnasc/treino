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
  
  // Se o usuário estiver autenticado
  if (session) {
    // Verificar se o usuário está suspenso
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_suspended')
      .eq('id', session.user.id)
      .single()
    
    // Se o usuário estiver suspenso e não estiver em uma página pública ou de logout
    if (profile?.is_suspended === true) {
      const url = req.nextUrl.clone()
      const path = url.pathname
      
      // Lista de rotas permitidas para usuários suspensos
      const allowedRoutes = [
        '/login', 
        '/register', 
        '/reset-password',
        '/api/auth'
      ]
      
      // Verificar se a rota atual é permitida
      const isAllowedRoute = allowedRoutes.some(route => path.startsWith(route))
      
      // Se não for uma rota permitida, redirecionar para login com mensagem
      if (!isAllowedRoute) {
        // Fazer logout e redirecionar para login com parâmetro de suspensão
        await supabase.auth.signOut()
        
        const redirectUrl = new URL('/login', req.url)
        redirectUrl.searchParams.set('suspended', 'true')
        return NextResponse.redirect(redirectUrl)
      }
    }
    
    // Aumentar a vida útil do cookie se o usuário tiver uma sessão válida
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