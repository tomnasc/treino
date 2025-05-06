"use client"

import { useState, useEffect } from "react"
import { UserCheck, UserX, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"
import { ClientRelationship } from "@/app/types/client.types"
import { Profile } from "@/app/types/database.types"

interface PendingTrainerRequestsProps {
  userId: string
  onRequestHandled?: () => void
}

export function PendingTrainerRequests({ userId, onRequestHandled }: PendingTrainerRequestsProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [pendingRequests, setPendingRequests] = useState<ClientRelationship[]>([])
  const [processingRequest, setProcessingRequest] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchPendingRequests()
  }, [userId])

  const fetchPendingRequests = async () => {
    try {
      setIsLoading(true)
      
      // Buscar solicitações pendentes onde o usuário é cliente
      const { data, error } = await supabase
        .from("client_relationships")
        .select(`
          *,
          personal:profiles!personal_id(*)
        `)
        .eq("client_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
      
      if (error) throw error
      
      setPendingRequests(data || [])
    } catch (error) {
      console.error("Erro ao buscar solicitações pendentes:", error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleRequest = async (relationshipId: string, accept: boolean) => {
    try {
      setProcessingRequest(relationshipId)
      
      if (accept) {
        // Aceitar solicitação
        const { error } = await supabase
          .from("client_relationships")
          .update({ status: "active" })
          .eq("id", relationshipId)
        
        if (error) throw error
        
        toast({
          title: "Solicitação aceita",
          description: "Você aceitou a solicitação do personal trainer."
        })
      } else {
        // Rejeitar solicitação
        const { error } = await supabase
          .from("client_relationships")
          .update({ status: "inactive" })
          .eq("id", relationshipId)
        
        if (error) throw error
        
        toast({
          title: "Solicitação rejeitada",
          description: "Você rejeitou a solicitação do personal trainer."
        })
      }
      
      // Atualizar a lista de solicitações
      await fetchPendingRequests()
      
      // Notificar componente pai se necessário
      if (onRequestHandled) onRequestHandled()
      
    } catch (error) {
      console.error("Erro ao processar solicitação:", error)
      toast({
        title: "Erro ao processar solicitação",
        description: "Ocorreu um erro ao tentar processar esta solicitação. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setProcessingRequest(null)
    }
  }
  
  // Obter iniciais do nome para avatar
  const getInitials = (name: string | null): string => {
    if (!name) return "PT"
    
    const nameParts = name.split(" ")
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase()
    
    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase()
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  if (pendingRequests.length === 0) {
    return null
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações de Personal Trainer</CardTitle>
        <CardDescription>
          Personais que gostariam de adicionar você como aluno
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {pendingRequests.map((request) => {
            const personal = request.personal as Profile
            
            return (
              <li key={request.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={personal?.avatar_url || ""} />
                    <AvatarFallback>{getInitials(personal?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{personal?.full_name || "Personal Trainer"}</h4>
                    <p className="text-sm text-muted-foreground">{personal?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solicitação enviada em {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleRequest(request.id, false)}
                    disabled={!!processingRequest}
                  >
                    {processingRequest === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <UserX className="h-4 w-4 mr-1" />
                    )}
                    Recusar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRequest(request.id, true)}
                    disabled={!!processingRequest}
                  >
                    {processingRequest === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <UserCheck className="h-4 w-4 mr-1" />
                    )}
                    Aceitar
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
} 