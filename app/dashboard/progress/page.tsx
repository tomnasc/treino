"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Separator } from "@/app/components/ui/separator"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"

type WorkoutStat = {
  workout_id: string
  workout_name: string
  completed_count: number
  completion_rate: number
  average_duration: number
}

type ExerciseStat = {
  exercise_id: string
  exercise_name: string
  workout_count: number
  set_count: number
  average_weight: number
  max_weight: number
}

type MonthlyStats = {
  month: string
  workouts_completed: number
  total_duration: number
  average_duration: number
}

export default function ProgressPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [workoutStats, setWorkoutStats] = useState<WorkoutStat[]>([])
  const [exerciseStats, setExerciseStats] = useState<ExerciseStat[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [completionRate, setCompletionRate] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [avgDuration, setAvgDuration] = useState(0)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Buscar estatísticas de treinos
        const { data: workoutData, error: workoutError } = await supabase
          .from("workout_history")
          .select(`
            id,
            workout_id,
            workout:workouts(name),
            completed,
            duration,
            started_at
          `)
          .eq("user_id", currentUser.id)
          .order("started_at", { ascending: false })
        
        if (workoutError) throw workoutError
        
        // Calcular estatísticas gerais
        const totalCount = workoutData?.length || 0
        const completedCount = workoutData?.filter(w => w.completed).length || 0
        const totalTime = workoutData?.reduce((acc, w) => acc + (w.duration || 0), 0) || 0
        
        setTotalWorkouts(totalCount)
        setCompletionRate(totalCount > 0 ? (completedCount / totalCount) * 100 : 0)
        setTotalDuration(totalTime)
        setAvgDuration(totalCount > 0 ? totalTime / totalCount : 0)
        
        // Agrupar por treino
        const workoutStatsMap = new Map<string, WorkoutStat>()
        
        workoutData?.forEach(w => {
          const workoutId = w.workout_id
          const workoutName = w.workout && typeof w.workout === 'object' && 'name' in w.workout ? 
                              (w.workout.name as string) : 
                              "Treino sem nome"
          
          if (!workoutStatsMap.has(workoutId)) {
            workoutStatsMap.set(workoutId, {
              workout_id: workoutId,
              workout_name: workoutName,
              completed_count: 0,
              completion_rate: 0,
              average_duration: 0
            })
          }
          
          const stat = workoutStatsMap.get(workoutId)!
          if (w.completed) stat.completed_count++
          stat.average_duration += w.duration || 0
        })
        
        // Calcular taxas e médias
        workoutStatsMap.forEach((stat, id) => {
          const workoutCount = workoutData?.filter(w => w.workout_id === id).length || 0
          stat.completion_rate = workoutCount > 0 ? (stat.completed_count / workoutCount) * 100 : 0
          stat.average_duration = workoutCount > 0 ? stat.average_duration / workoutCount : 0
        })
        
        setWorkoutStats(Array.from(workoutStatsMap.values()))
        
        // Calcular estatísticas mensais
        const monthlyMap = new Map<string, MonthlyStats>()
        
        workoutData?.forEach(w => {
          if (!w.started_at) return
          
          const date = new Date(w.started_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(date)
          
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, {
              month: monthLabel,
              workouts_completed: 0,
              total_duration: 0,
              average_duration: 0
            })
          }
          
          const stat = monthlyMap.get(monthKey)!
          if (w.completed) stat.workouts_completed++
          stat.total_duration += w.duration || 0
        })
        
        // Calcular médias
        monthlyMap.forEach(stat => {
          stat.average_duration = stat.workouts_completed > 0 ? stat.total_duration / stat.workouts_completed : 0
        })
        
        // Ordenar por mês
        const sortedMonthly = Array.from(monthlyMap.entries())
          .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
          .map(([_, stat]) => stat)
        
        setMonthlyStats(sortedMonthly)
        
        // Buscar estatísticas de exercícios (mock para exemplo)
        // Em uma implementação real, você buscaria os dados do seu banco
        setExerciseStats([
          {
            exercise_id: "1",
            exercise_name: "Supino",
            workout_count: 10,
            set_count: 30,
            average_weight: 60,
            max_weight: 80
          },
          {
            exercise_id: "2",
            exercise_name: "Agachamento",
            workout_count: 8,
            set_count: 24,
            average_weight: 80,
            max_weight: 100
          },
          {
            exercise_id: "3",
            exercise_name: "Levantamento Terra",
            workout_count: 6,
            set_count: 18,
            average_weight: 100,
            max_weight: 120
          }
        ])
        
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar seus dados de progresso. Tente novamente mais tarde.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [router, toast])

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Progresso</h2>
        <p className="text-muted-foreground">
          Acompanhe sua evolução e progresso ao longo do tempo
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Treinos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWorkouts}</div>
            <p className="text-xs text-muted-foreground">
              Treinos realizados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conclusão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Treinos concluídos
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tempo Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(totalDuration / 60)} horas</div>
            <p className="text-xs text-muted-foreground">
              Tempo treinando
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Duração Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.floor(avgDuration)} min</div>
            <p className="text-xs text-muted-foreground">
              Tempo médio por treino
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">Progresso Mensal</TabsTrigger>
          <TabsTrigger value="workouts">Treinos</TabsTrigger>
          <TabsTrigger value="exercises">Exercícios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso Mensal</CardTitle>
              <CardDescription>
                Visualização da sua evolução ao longo dos meses
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {monthlyStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyStats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="workouts_completed" 
                      name="Treinos Concluídos" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="average_duration" 
                      name="Duração Média (min)" 
                      stroke="#82ca9d" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">
                    Sem dados suficientes para exibir estatísticas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="workouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas dos Treinos</CardTitle>
              <CardDescription>
                Análise detalhada por treino
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {workoutStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={workoutStats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="workout_name" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left"
                      dataKey="completed_count" 
                      name="Treinos Concluídos" 
                      fill="#8884d8" 
                    />
                    <Bar 
                      yAxisId="right"
                      dataKey="average_duration" 
                      name="Duração Média (min)" 
                      fill="#82ca9d" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">
                    Sem dados suficientes para exibir estatísticas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Lista de Treinos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {workoutStats.length > 0 ? workoutStats.map(stat => (
                  <div key={stat.workout_id} className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h4 className="font-medium">{stat.workout_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {stat.completed_count} treinos concluídos
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">{stat.completion_rate.toFixed(1)}%</span>
                      <span className="text-sm text-muted-foreground">
                        {Math.floor(stat.average_duration)} min em média
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-muted-foreground">
                    Nenhum treino realizado ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="exercises" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progresso por Exercício</CardTitle>
              <CardDescription>
                Evolução em exercícios específicos
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {exerciseStats.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={exerciseStats}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="exercise_name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="average_weight" name="Peso Médio (kg)" fill="#8884d8" />
                    <Bar dataKey="max_weight" name="Peso Máximo (kg)" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <p className="text-muted-foreground">
                    Sem dados suficientes para exibir estatísticas
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Lista de Exercícios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exerciseStats.length > 0 ? exerciseStats.map(stat => (
                  <div key={stat.exercise_id} className="flex items-center justify-between pb-4 border-b">
                    <div>
                      <h4 className="font-medium">{stat.exercise_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {stat.workout_count} treinos, {stat.set_count} séries
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-semibold">{stat.max_weight} kg máximo</span>
                      <span className="text-sm text-muted-foreground">
                        {stat.average_weight} kg em média
                      </span>
                    </div>
                  </div>
                )) : (
                  <p className="text-muted-foreground">
                    Nenhum exercício realizado ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 