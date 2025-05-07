"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ClientList } from "@/app/components/clients/client-list"
import { TrainerPendingRequests } from "@/app/components/clients/trainer-pending-requests"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Separator } from "@/app/components/ui/separator"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { ClientProfile } from "@/app/types/client.types"

export default function ClientsPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [clients, setClients] = useState<ClientProfile[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Salvar o ID do usuário para uso com solicitações pendentes
        setUserId(currentUser.id)
        
        // Verificar se o usuário é personal trainer
        if (currentUser.role !== "personal" && currentUser.role !== "admin") {
          router.push("/dashboard")
          toast({
            title: "Acesso negado",
            description: "Esta área é exclusiva para personal trainers.",
            variant: "destructive"
          })
          return
        }
        
        // Buscar clientes do personal trainer
        await fetchClients(currentUser.id)
        
      } catch (error) {
        console.error("Erro ao inicializar página:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar seus alunos. Tente novamente mais tarde.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [router])

  // Buscar clientes do personal trainer
  const fetchClients = async (personalId: string) => {
    try {
      // Buscar alunos vinculados ao personal (tanto ativos quanto pendentes)
      const { data, error } = await supabase
        .from("client_relationships")
        .select(`
          id,
          client_id,
          created_at,
          status,
          client:profiles!client_id(*)
        `)
        .eq("personal_id", personalId)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: false })
      
      if (error) {
        throw error
      }
      
      // Transformar dados para o formato necessário
      const clientsData: ClientProfile[] = []
      
      if (data?.length) {
        // Para cada cliente, vamos buscar dados adicionais
        for (const relationship of data) {
          if (relationship.client) {
            // Explicitamente converter o tipo do cliente
            const clientProfile = relationship.client as unknown as ClientProfile;
            
            // Buscar último treino do cliente
            const { data: latestWorkout } = await supabase
              .from("workout_history")
              .select("started_at")
              .eq("user_id", clientProfile.id)
              .order("started_at", { ascending: false })
              .limit(1)
              .single()
            
            // Buscar estatísticas dos treinos
            const { data: workoutStats } = await supabase
              .from("workout_history")
              .select("completed")
              .eq("user_id", clientProfile.id)
              
            // Adicionar informações adicionais ao perfil do cliente
            clientsData.push({
              ...clientProfile,
              last_workout_date: latestWorkout?.started_at || null,
              total_workouts: workoutStats?.length || 0,
              completed_workouts: workoutStats?.filter(w => w.completed).length || 0,
              relationship_status: relationship.status // adicionar status do relacionamento
            })
          }
        }
      }
      
      setClients(clientsData)
      
    } catch (error) {
      console.error("Erro ao buscar clientes:", error)
      throw error
    }
  }
  
  // Adicionar novo aluno
  const handleAddClient = async (email: string) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return
      
      // Verificar se o usuário existe
      const { data: userData, error: userError } = await supabase
        .from("profiles")
        .select("id, role, subscription_status")
        .eq("email", email)
        .maybeSingle()
      
      if (userError) {
        throw userError
      }
      
      if (!userData) {
        toast({
          title: "Usuário não encontrado",
          description: "Não encontramos um usuário com este email.",
          variant: "destructive"
        })
        return
      }
      
      // Verificar se o usuário é gratuito (não tem assinatura ativa)
      if (userData.role === 'free' || 
          (!userData.subscription_status || 
           (userData.subscription_status !== 'active' && 
            userData.subscription_status !== 'trialing'))) {
        toast({
          title: "Usuário com plano gratuito",
          description: "Usuários com plano gratuito não podem ser adicionados como clientes. O usuário precisa fazer upgrade para o plano Premium.",
          variant: "destructive"
        })
        return
      }
      
      // Verificar se já existe relacionamento
      const { data: existingRelationship, error: relationshipError } = await supabase
        .from("client_relationships")
        .select("id, status")
        .eq("personal_id", currentUser.id)
        .eq("client_id", userData.id)
        .maybeSingle()
      
      if (relationshipError) {
        throw relationshipError
      }
      
      if (existingRelationship) {
        if (existingRelationship.status === "active") {
          toast({
            title: "Aluno já cadastrado",
            description: "Este aluno já está vinculado à sua conta."
          })
          return
        } else if (existingRelationship.status === "pending") {
          toast({
            title: "Solicitação pendente",
            description: "Você já enviou uma solicitação para este aluno que está aguardando confirmação."
          })
          return
        } else {
          // Reativar relacionamento como pendente
          const { error: updateError } = await supabase
            .from("client_relationships")
            .update({ status: "pending" })
            .eq("id", existingRelationship.id)
          
          if (updateError) throw updateError
          
          toast({
            title: "Solicitação enviada",
            description: "Uma solicitação foi enviada para o aluno e aguarda confirmação."
          })
        }
      } else {
        // Criar novo relacionamento
        const { error: insertError } = await supabase
          .from("client_relationships")
          .insert({
            personal_id: currentUser.id,
            client_id: userData.id,
            status: "pending"
          })
        
        if (insertError) throw insertError
        
        toast({
          title: "Solicitação enviada",
          description: "Uma solicitação foi enviada para o aluno e aguarda confirmação."
        })
      }
      
      // Atualizar lista de clientes
      await fetchClients(currentUser.id)
      
    } catch (error) {
      console.error("Erro ao adicionar aluno:", error)
      toast({
        title: "Erro ao adicionar aluno",
        description: "Não foi possível adicionar o aluno. Tente novamente mais tarde.",
        variant: "destructive"
      })
    }
  }
  
  // Remover aluno
  const handleRemoveClient = async (clientId: string) => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return
      
      // Atualizar status do relacionamento para inativo
      const { error } = await supabase
        .from("client_relationships")
        .update({ status: "inactive" })
        .eq("personal_id", currentUser.id)
        .eq("client_id", clientId)
      
      if (error) throw error
      
      // Atualizar lista de clientes (removendo o cliente da lista)
      setClients(clients.filter(client => client.id !== clientId))
      
      toast({
        title: "Aluno removido",
        description: "O aluno foi removido da sua lista com sucesso."
      })
      
    } catch (error) {
      console.error("Erro ao remover aluno:", error)
      toast({
        title: "Erro ao remover aluno",
        description: "Não foi possível remover o aluno. Tente novamente mais tarde.",
        variant: "destructive"
      })
      throw error
    }
  }
  
  // Visualizar perfil do aluno
  const handleViewClient = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}`)
  }
  
  // Criar treino para o aluno
  const handleCreateWorkout = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}/workout/new`)
  }
  
  // Visualizar progresso do aluno
  const handleViewProgress = (clientId: string) => {
    router.push(`/dashboard/clients/${clientId}/progress`)
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Meus Alunos</h2>
        <p className="text-muted-foreground">
          Gerencie seus alunos, crie treinos personalizados e acompanhe o progresso
        </p>
      </div>
      
      {/* Mostrar solicitações pendentes enviadas pelo personal */}
      {userId && (
        <div className="mb-4">
          <TrainerPendingRequests 
            userId={userId} 
            onRequestCancelled={() => userId && fetchClients(userId)}
            compact={true}
          />
        </div>
      )}
      
      <Tabs defaultValue="alunos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alunos">Alunos</TabsTrigger>
          <TabsTrigger value="estatisticas">Estatísticas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="alunos">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Lista de Alunos</CardTitle>
              <CardDescription>
                Gerencie seus alunos, crie treinos e acompanhe o progresso deles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClientList 
                clients={clients}
                onAddClient={handleAddClient}
                onViewClient={handleViewClient}
                onCreateWorkout={handleCreateWorkout}
                onViewProgress={handleViewProgress}
                onRemoveClient={handleRemoveClient}
                isLoading={isLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="estatisticas">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas Gerais</CardTitle>
              <CardDescription>
                Visão geral do progresso de todos os seus alunos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total de Alunos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clients.length}</div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ativos na Semana
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {clients.filter(client => {
                        if (!client.last_workout_date) return false
                        const lastWorkout = new Date(client.last_workout_date)
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        return lastWorkout >= weekAgo
                      }).length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Premium
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {clients.filter(client => client.role === "premium").length}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Taxa de Conclusão
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {clients.reduce((total, client) => total + ((client.completed_workouts || 0) / Math.max(client.total_workouts || 1, 1)), 0) / Math.max(clients.length, 1)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 