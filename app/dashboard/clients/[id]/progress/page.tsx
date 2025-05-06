"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Calendar, BarChart3, CheckCircle, XCircle, Dumbbell } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Badge } from "@/app/components/ui/badge"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { ClientProfile } from "@/app/types/client.types"
import { formatDuration } from "@/app/lib/utils"
import { format, parseISO, startOfMonth, endOfMonth, getMonth, getYear } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts"

// Cores personalizadas para os gráficos
const COLORS = {
  primary: "#4f46e5",
  secondary: "#2dd4bf",
  success: "#16a34a",
  danger: "#dc2626",
  warning: "#ca8a04",
  background: "#e5e7eb",
}

export default function ClientProgressPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.id
  
  const [isLoading, setIsLoading] = useState(true)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([])
  const [exerciseHistory, setExerciseHistory] = useState<any[]>([])
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [completionRate, setCompletionRate] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [exerciseCount, setExerciseCount] = useState(0)
  
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
        
        setClient(profileData)
        
        // Buscar histórico de treinos
        const { data: historyData, error: historyError } = await supabase
          .from("workout_history")
          .select(`
            *,
            workout:workouts(*)
          `)
          .eq("user_id", clientId)
          .order("started_at", { ascending: false })
        
        if (historyError) {
          throw historyError
        }
        
        setWorkoutHistory(historyData || [])
        
        // Processar estatísticas gerais
        if (historyData && historyData.length > 0) {
          const completed = historyData.filter(w => w.completed).length
          setCompletionRate(Math.round((completed / historyData.length) * 100))
          
          const totalTime = historyData.reduce((acc, w) => acc + (w.duration || 0), 0)
          setTotalDuration(totalTime)
          
          // Buscar histórico de exercícios
          const { data: exerciseHistoryData, error: exerciseHistoryError } = await supabase
            .from("exercise_history")
            .select(`
              *,
              workout_exercise:workout_exercises(
                *,
                exercise:exercises(*)
              )
            `)
            .in("workout_history_id", historyData.map(w => w.id))
          
          if (exerciseHistoryError) {
            throw exerciseHistoryError
          }
          
          setExerciseHistory(exerciseHistoryData || [])
          setExerciseCount(exerciseHistoryData?.length || 0)
          
          // Processar estatísticas mensais
          const monthlyData = processMonthlyStats(historyData)
          setMonthlyStats(monthlyData)
        }
        
      } catch (error) {
        console.error("Erro ao inicializar página:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados do progresso. Tente novamente mais tarde.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [router, clientId])
  
  // Processar estatísticas mensais
  function processMonthlyStats(historyData: any[]) {
    const monthlyMap = new Map()
    
    historyData.forEach(workout => {
      const date = parseISO(workout.started_at)
      const monthYear = format(date, "yyyy-MM")
      
      if (!monthlyMap.has(monthYear)) {
        monthlyMap.set(monthYear, {
          month: format(date, "MMM", { locale: ptBR }),
          monthYear,
          total: 0,
          completed: 0,
          totalDuration: 0,
          avgDuration: 0
        })
      }
      
      const monthData = monthlyMap.get(monthYear)
      monthData.total += 1
      
      if (workout.completed) {
        monthData.completed += 1
      }
      
      monthData.totalDuration += workout.duration || 0
      monthData.avgDuration = Math.round(monthData.totalDuration / monthData.total)
    })
    
    // Converter para array e ordenar
    return Array.from(monthlyMap.values())
      .sort((a, b) => a.monthYear.localeCompare(b.monthYear))
      .slice(-6) // Últimos 6 meses
  }
  
  // Calcular progresso de peso/carga para um exercício
  function calculateWeightProgress(exerciseId: string) {
    const exerciseData = exerciseHistory
      .filter(history => history.workout_exercise.exercise.id === exerciseId)
      .sort((a, b) => {
        const dateA = new Date(a.workout_history.started_at).getTime()
        const dateB = new Date(b.workout_history.started_at).getTime()
        return dateA - dateB
      })
    
    if (exerciseData.length < 2) return { progress: 0, value: 0 }
    
    const firstWeight = parseWeight(exerciseData[0].actual_weight || "0")
    const lastWeight = parseWeight(exerciseData[exerciseData.length - 1].actual_weight || "0")
    const progress = lastWeight - firstWeight
    
    return { progress, value: lastWeight }
  }
  
  // Converter peso de string para número
  function parseWeight(weightString: string): number {
    const numericValue = parseFloat(weightString.replace(/[^\d.]/g, "")) || 0
    return numericValue
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
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">
          Progresso de {client.full_name || "Aluno"}
        </h2>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conclusão
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {workoutHistory.filter(w => w.completed).length} de {workoutHistory.length} treinos concluídos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Total
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Tempo total de treino
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Exercícios
            </CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exerciseCount}</div>
            <p className="text-xs text-muted-foreground">
              Total de exercícios realizados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Média por Treino
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workoutHistory.length 
                ? formatDuration(Math.round(totalDuration / workoutHistory.length))
                : "0min"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Duração média por treino
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="estatisticas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="estatisticas">
            <BarChart3 className="mr-2 h-4 w-4" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="historico">
            <Calendar className="mr-2 h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="estatisticas">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Treinos por Mês</CardTitle>
                <CardDescription>
                  Número de treinos concluídos e não concluídos por mês
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  {monthlyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyStats}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis allowDecimals={false} />
                        <Tooltip formatter={(value) => [`${value} treinos`, ""]} />
                        <Legend />
                        <Bar name="Concluídos" dataKey="completed" fill={COLORS.success} />
                        <Bar 
                          name="Não concluídos" 
                          dataKey={(data) => data.total - data.completed} 
                          fill={COLORS.danger} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Sem dados suficientes para gerar o gráfico
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Duração Média</CardTitle>
                <CardDescription>
                  Duração média dos treinos por mês (em minutos)
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[300px]">
                  {monthlyStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyStats}
                        margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`${value} min`, ""]} />
                        <Legend />
                        <Line 
                          name="Duração Média" 
                          type="monotone" 
                          dataKey="avgDuration" 
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        Sem dados suficientes para gerar o gráfico
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="historico">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Treinos</CardTitle>
              <CardDescription>
                Últimos treinos realizados pelo aluno
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workoutHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64">
                  <Calendar className="h-16 w-16 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Nenhum treino registrado</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    O aluno ainda não possui histórico de treinos.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {workoutHistory.map(history => (
                    <div 
                      key={history.id} 
                      className="border rounded-md p-4"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center">
                            <h3 className="font-semibold">
                              {history.workout?.name || "Treino"}
                            </h3>
                            <Badge 
                              variant={history.completed ? "success" : "destructive"}
                              className="ml-2"
                            >
                              {history.completed ? "Concluído" : "Incompleto"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(history.started_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                            {history.duration && ` • ${formatDuration(history.duration)}`}
                          </p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => router.push(`/dashboard/train/history/${history.id}`)}
                        >
                          Ver detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 