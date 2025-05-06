"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/app/lib/supabase"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Alert, AlertDescription } from "@/app/components/ui/alert"
import { getCurrentUser } from "@/app/lib/auth"

export function AdminCreator() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false)
  
  // Verificar se o usuário atual é administrador
  useEffect(() => {
    async function checkAdminStatus() {
      const currentUser = await getCurrentUser()
      if (currentUser?.role === "admin") {
        setCurrentUserIsAdmin(true)
      }
    }
    
    checkAdminStatus()
  }, [])
  
  const makeAdmin = async () => {
    if (!email) {
      setMessage({ type: "error", text: "Por favor, insira um email válido." })
      return
    }
    
    try {
      setIsLoading(true)
      setMessage(null)
      
      // 1. Verificar se o usuário existe
      const { data: userProfile, error: userError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()
      
      if (userError) {
        throw new Error(`Erro ao buscar usuário: ${userError.message}`)
      }
      
      if (!userProfile) {
        setMessage({ type: "error", text: "Usuário não encontrado com este email." })
        return
      }
      
      // 2. Atualizar o papel do usuário para "admin"
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: "admin" })
        .eq('id', userProfile.id)
      
      if (updateError) {
        throw new Error(`Erro ao atualizar usuário: ${updateError.message}`)
      }
      
      setMessage({ 
        type: "success", 
        text: `Usuário "${email}" foi transformado em administrador com sucesso!` 
      })
      setEmail("")
    } catch (error: any) {
      console.error("Erro ao definir administrador:", error)
      setMessage({ 
        type: "error", 
        text: error.message || "Ocorreu um erro ao definir o usuário como administrador." 
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Se o usuário atual não é administrador, mostrar mensagem de acesso negado
  if (!currentUserIsAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Restrito</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar esta funcionalidade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              Esta funcionalidade é disponível apenas para administradores do sistema.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Administradores</CardTitle>
        <CardDescription>
          Transforme um usuário existente em administrador do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Email do Usuário
            </label>
            <Input
              id="email"
              type="email"
              placeholder="exemplo@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          {message && (
            <Alert variant={message.type === "error" ? "destructive" : "default"}>
              <AlertDescription>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={makeAdmin} disabled={isLoading}>
          {isLoading ? "Processando..." : "Tornar Administrador"}
        </Button>
      </CardFooter>
    </Card>
  )
} 