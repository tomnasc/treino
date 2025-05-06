"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Mail, Calendar, Dumbbell, BarChart3, Plus } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Separator } from "@/app/components/ui/separator"
import { Badge } from "@/app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { ClientProfile } from "@/app/types/client.types"
import { formatDuration } from "@/app/lib/utils"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.id
  
  const [isLoading, setIsLoading] = useState(true)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [workouts, setWorkouts] = useState<any[]>([])
  const [historyStats, setHistoryStats] = useState({
    total: 0,
    completed: 0,
    streak: 0,
    avgDuration: 0
  })
  
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
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
        
        // Verificar se o personal é responsável por este cliente
        const { data: relationship, error: relationshipError } = await supabase
          .from("client_relationships")
          .select("*")
          .eq("personal_id", currentUser.id)
          .eq("client_id", clientId)
          .eq("status", "active")
          .maybeSingle()
        
        if (relationshipError) {
          throw relationshipError
        }
        
        if (!relationship) {
          router.push("/dashboard/clients")
          toast({
            title: "Cliente não encontrado",
            description: "Este cliente não está vinculado ao seu perfil ou foi removido.",
            variant: "destructive"
          })
          return
        }
        
        // Buscar perfil do cliente
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", clientId)
          .single()
        
        if (profileError) {
          throw profileError
        }
        
        const clientData: ClientProfile = profileData
        
        // Buscar treinos do cliente
        const { data: workoutsData, error: workoutsError } = await supabase
          .from("workouts")
          .select(`
            *,
            workout_exercises(
              *,
              exercise:exercises(*)
            )
          `)
          .eq("created_by", currentUser.id)
          .order("created_at", { ascending: false })
        
        if (workoutsError) {
          throw workoutsError
        }
        
        setWorkouts(workoutsData || [])
        
        // Buscar estatísticas do histórico de treinos
        const { data: historyData, error: historyError } = await supabase
          .from("workout_history")
          .select("*")
          .eq("user_id", clientId)
          .order("started_at", { ascending: false })
        
        if (historyError) {
          throw historyError
        }
        
        // Processar estatísticas
        let totalDuration = 0
        let completedCount = 0
        
        if (historyData && historyData.length > 0) {
          completedCount = historyData.filter(item => item.completed).length
          totalDuration = historyData.reduce((total, item) => total + (item.duration || 0), 0)
          
          // Adicionar data do último treino ao perfil do cliente
          clientData.last_workout_date = historyData[0].started_at
        }
        
        setClient(clientData)
        setHistoryStats({
          total: historyData?.length || 0,
          completed: completedCount,
          streak: calculateStreak(historyData || []),
          avgDuration: historyData && historyData.length > 0 
            ? Math.round(totalDuration / historyData.length) 
            : 0
        })
        
      } catch (error) {
        console.error("Erro ao inicializar página:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do cliente. Tente novamente mais tarde.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [router, clientId])
  
  // Calcular sequência atual de treinos
  function calculateStreak(history: any[]): number {
    if (!history.length) return 0
    
    // Ordenar por data (mais recente primeiro)
    const sortedHistory = [...history].sort((a, b) => 
      new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
    )
    
    let streak = 0
    let lastDate: Date | null = null
    
    for (const item of sortedHistory) {
      if (!item.completed) continue
      
      const date = new Date(item.started_at)
      date.setHours(0, 0, 0, 0)
      
      if (!lastDate) {
        lastDate = date
        streak = 1
        continue
      }
      
      const prevDate = new Date(lastDate)
      prevDate.setDate(prevDate.getDate() - 1)
      
      if (date.getTime() === prevDate.getTime()) {
        streak++
        lastDate = date
      } else {
        break
      }
    }
    
    return streak
  }
  
  // Obter as iniciais do nome para o avatar
  function getInitials(name: string | null): string {
    if (!name) return "U"
    
    const nameParts = name.split(" ")
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase()
    
    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase()
  }
  
  // Criar novo treino para o cliente
  function handleCreateWorkout() {
    router.push(`/dashboard/clients/${clientId}/workout/new`)
  }
  
  // Ver progresso do cliente
  function handleViewProgress() {
    router.push(`/dashboard/clients/${clientId}/progress`)
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <User className="h-16 w-16 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Cliente não encontrado</h3>
        <p className="text-sm text-muted-foreground mt-2 mb-6">
          Não foi possível carregar os dados deste cliente.
        </p>
        <Button onClick={() => router.push("/dashboard/clients")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para lista de alunos
        </Button>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/clients")}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Perfil do Aluno</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={client.avatar_url || ""} />
              <AvatarFallback>{getInitials(client.full_name)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{client.full_name || "Sem nome"}</CardTitle>
              <CardDescription>{client.email}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center">
                <Badge className="mr-2" variant={client.role === "premium" ? "default" : "outline"}>
                  {client.role === "premium" ? "Premium" : "Básico"}
                </Badge>
                {client.last_workout_date && (
                  <span className="text-xs text-muted-foreground">
                    Último treino: {format(new Date(client.last_workout_date), "dd/MM/yyyy", { locale: ptBR })}
                  </span>
                )}
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Total de treinos</div>
                    <div className="text-xl font-bold">{historyStats.total}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Treinos concluídos</div>
                    <div className="text-xl font-bold">{historyStats.completed}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Sequência atual</div>
                    <div className="text-xl font-bold">{historyStats.streak} dias</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Duração média</div>
                    <div className="text-xl font-bold">{formatDuration(historyStats.avgDuration)}</div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2">
                <Button onClick={handleCreateWorkout}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Treino
                </Button>
                <Button variant="outline" onClick={handleViewProgress}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Ver Progresso
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <div className="md:col-span-2">
          <Tabs defaultValue="treinos" className="space-y-4">
            <TabsList>
              <TabsTrigger value="treinos">
                <Dumbbell className="mr-2 h-4 w-4" />
                Treinos
              </TabsTrigger>
              <TabsTrigger value="historico">
                <Calendar className="mr-2 h-4 w-4" />
                Histórico
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="treinos">
              <Card>
                <CardHeader>
                  <CardTitle>Treinos do Aluno</CardTitle>
                  <CardDescription>
                    Treinos que você criou para este aluno
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {workouts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                      <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium">Nenhum treino encontrado</h3>
                      <p className="text-sm text-muted-foreground mt-2 mb-6">
                        Você ainda não criou treinos para este aluno.
                      </p>
                      <Button onClick={handleCreateWorkout}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Treino
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {workouts.map((workout) => (
                        <div
                          key={workout.id}
                          className="cursor-pointer rounded-md border p-4 transition-colors hover:bg-muted/50"
                          onClick={() => router.push(`/dashboard/workouts/${workout.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold">{workout.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {workout.description || "Sem descrição"}
                              </p>
                            </div>
                            <div className="flex items-center">
                              <Badge variant="outline" className="ml-2">
                                {workout.workout_exercises?.length || 0} exercícios
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="historico">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Treinos</CardTitle>
                  <CardDescription>
                    Histórico dos treinos realizados pelo aluno
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <div className="p-8 text-center">
                      <Button onClick={handleViewProgress}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Ver Histórico Detalhado
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
} 