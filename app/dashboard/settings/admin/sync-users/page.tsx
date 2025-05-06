"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, RefreshCw, User, UserCheck, AlertTriangle } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import Link from "next/link"

export default function SyncUsersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [authUsers, setAuthUsers] = useState<number>(0)
  const [profileUsers, setProfileUsers] = useState<number>(0)
  const [syncResult, setSyncResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkAccess() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }

        // Verificar se o usuário é administrador
        if (currentUser.role !== 'admin') {
          setIsAuthorized(false)
          setError("Você não tem permissão para acessar esta página.")
          setIsLoading(false)
          return
        }

        setIsAuthorized(true)
        await loadUserCounts()
      } catch (err) {
        console.error("Erro ao verificar acesso:", err)
        setError("Erro ao verificar permissões de acesso.")
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [router])

  async function loadUserCounts() {
    try {
      // Contar usuários em auth.users
      const { count: authCount, error: authError } = await supabase
        .rpc('count_auth_users')

      if (authError) throw authError
      setAuthUsers(authCount || 0)

      // Contar usuários em public.profiles
      const { count: profileCount, error: profileError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })

      if (profileError) throw profileError
      setProfileUsers(profileCount || 0)
    } catch (err: any) {
      console.error("Erro ao carregar contagem de usuários:", err)
      setError(`Erro ao carregar contagem de usuários: ${err.message}`)
    }
  }

  async function handleSyncUsers() {
    try {
      setIsSyncing(true)
      setError(null)
      setSyncResult(null)

      const response = await fetch('/api/admin/sync-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao sincronizar usuários')
      }

      setSyncResult(result)
      await loadUserCounts() // Recarregar contagens após sincronização
    } catch (err: any) {
      console.error("Erro na sincronização:", err)
      setError(`Falha na sincronização: ${err.message}`)
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" asChild>
              <Link href="/dashboard/settings/admin">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Voltar</span>
              </Link>
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">Sincronização de Usuários</h2>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            {error || "Você não tem permissão para acessar esta página."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/settings/admin">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Sincronização de Usuários</h2>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Estado Atual</CardTitle>
          <CardDescription>
            Informações sobre o estado de sincronização entre usuários e perfis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Usuários autenticados:</span>
              <span className="font-semibold">{authUsers}</span>
            </div>
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              <span>Perfis criados:</span>
              <span className="font-semibold">{profileUsers}</span>
            </div>
          </div>

          {authUsers > profileUsers && (
            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Usuários não sincronizados</AlertTitle>
              <AlertDescription>
                Existem {authUsers - profileUsers} usuários que não possuem perfil na plataforma.
                Clique em "Sincronizar Usuários" para criar os perfis faltantes.
              </AlertDescription>
            </Alert>
          )}

          {syncResult && (
            <Alert variant="success">
              <AlertTitle>Sincronização Concluída</AlertTitle>
              <AlertDescription>
                {syncResult.message}
                {syncResult.syncedUsers && (
                  <div className="mt-2">
                    <p>Usuários sincronizados: {syncResult.syncedUsers.length}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={loadUserCounts}
            disabled={isSyncing}
          >
            Atualizar Contagem
          </Button>
          <Button 
            onClick={handleSyncUsers}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sincronizar Usuários
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 