"use client"

import { useState, useEffect } from "react"
import { UserMinus, Loader2, Clock, ExternalLink } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/app/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"
import { ClientRelationship } from "@/app/types/client.types"
import { Profile } from "@/app/types/database.types"

interface TrainerPendingRequestsProps {
  userId: string
  onRequestCancelled?: () => void
  compact?: boolean
}

export function TrainerPendingRequests({ 
  userId, 
  onRequestCancelled,
  compact = false 
}: TrainerPendingRequestsProps) {
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
      
      // Buscar solicitações pendentes onde o usuário é treinador
      const { data, error } = await supabase
        .from("client_relationships")
        .select(`
          *,
          client:profiles!client_id(*)
        `)
        .eq("personal_id", userId)
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
  
  const cancelRequest = async (relationshipId: string) => {
    try {
      setProcessingRequest(relationshipId)
      
      // Cancelar solicitação (excluir)
      const { error } = await supabase
        .from("client_relationships")
        .delete()
        .eq("id", relationshipId)
      
      if (error) throw error
      
      toast({
        title: "Solicitação cancelada",
        description: "A solicitação foi cancelada com sucesso."
      })
      
      // Atualizar a lista de solicitações
      await fetchPendingRequests()
      
      // Notificar componente pai se necessário
      if (onRequestCancelled) onRequestCancelled()
      
    } catch (error) {
      console.error("Erro ao cancelar solicitação:", error)
      toast({
        title: "Erro ao cancelar solicitação",
        description: "Ocorreu um erro ao tentar cancelar esta solicitação. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setProcessingRequest(null)
    }
  }
  
  // Obter iniciais do nome para avatar
  const getInitials = (name: string | null): string => {
    if (!name) return "U"
    
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
  
  // Versão compacta para dashboard
  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Solicitações pendentes ({pendingRequests.length})</CardTitle>
          <CardDescription>
            Solicitações enviadas aguardando confirmação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {pendingRequests.slice(0, 3).map((request) => {
              const client = request.client as Profile
              
              return (
                <li key={request.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={client?.avatar_url || ""} />
                      <AvatarFallback className="text-xs">{getInitials(client?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <span className="font-medium">{client?.full_name || "Aluno"}</span>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {format(new Date(request.created_at), "dd/MM", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => cancelRequest(request.id)}
                    disabled={!!processingRequest}
                  >
                    {processingRequest === request.id ? 
                      <Loader2 className="h-3 w-3 animate-spin" /> : 
                      "Cancelar"
                    }
                  </Button>
                </li>
              )
            })}
            
            {pendingRequests.length > 3 && (
              <li className="text-xs text-center pt-1">
                <span className="text-muted-foreground">
                  +{pendingRequests.length - 3} outras solicitações pendentes
                </span>
              </li>
            )}
          </ul>
        </CardContent>
        <CardFooter className="pt-0 pb-3">
          <Link 
            href="/dashboard/clients/pending-requests" 
            className="text-xs text-primary flex items-center w-full justify-center hover:underline"
          >
            <span>Ver todas as solicitações</span>
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </CardFooter>
      </Card>
    )
  }
  
  // Versão completa
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações Pendentes</CardTitle>
        <CardDescription>
          Solicitações enviadas aos alunos que ainda não foram confirmadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {pendingRequests.map((request) => {
            const client = request.client as Profile
            
            return (
              <li key={request.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={client?.avatar_url || ""} />
                    <AvatarFallback>{getInitials(client?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-medium">{client?.full_name || "Aluno"}</h4>
                    <p className="text-sm text-muted-foreground">{client?.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Solicitação enviada em {format(new Date(request.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10"
                  onClick={() => cancelRequest(request.id)}
                  disabled={!!processingRequest}
                >
                  {processingRequest === request.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <UserMinus className="h-4 w-4 mr-1" />
                  )}
                  Cancelar solicitação
                </Button>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
} 