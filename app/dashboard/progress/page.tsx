"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BarChart, LineChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Separator } from "@/app/components/ui/separator"
import { Badge } from "@/app/components/ui/badge"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { formatDuration } from "@/app/lib/utils"

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
  const [completedCount, setCompletedCount] = useState(0)

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
        const completedWorkouts = workoutData?.filter(w => w.completed) || []

        const completedCount = completedWorkouts.length
        const totalTime = workoutData?.reduce((acc, w) => acc + (w.duration || 0), 0) || 0
        const completedTime = completedWorkouts.reduce((acc, w) => acc + (w.duration || 0), 0)

        // Logs para debug
        console.log('DEBUG - Dados carregados:', { 
          workoutData, 
          totalCount, 
          completedWorkouts, 
          completedCount,
          totalTime,
          completedTime 
        })

        setTotalWorkouts(totalCount)
        setCompletionRate(totalCount > 0 ? (completedCount / totalCount) * 100 : 0)
        setTotalDuration(totalTime) // Tempo total em minutos
        setCompletedCount(completedCount)

        // Cálculo correto da duração média por treino CONCLUÍDO
        const calculatedAvgDuration = completedCount > 0 ? completedTime / completedCount : 0
        console.log('DEBUG - Média calculada:', calculatedAvgDuration)
        
        // Se a média calculada for muito diferente de 3303, considere isso um erro e use o valor calculado
        // Caso contrário, se a média for próxima de 3303 (o que é improvável para treinos reais), use o valor calculado
        if (Math.abs(calculatedAvgDuration - 3303) > 10) {
          setAvgDuration(calculatedAvgDuration)
        } else {
          console.error('DEBUG - Valor suspeito de 3303 detectado na média. Usando valor calculado:', calculatedAvgDuration)
          setAvgDuration(calculatedAvgDuration)
        }
        
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
        
        // Buscar estatísticas de exercícios
        const { data: exerciseHistoryData, error: exerciseHistoryError } = await supabase
          .from('exercise_history')
          .select(`
            id,
            workout_history_id,
            workout_exercise_id,
            workout_exercise:workout_exercises(
              id,
              exercise_id,
              exercise:exercises(id, name)
            ),
            actual_weight,
            sets_completed
          `)
          .in('workout_history_id', workoutData?.map(w => w.id) || [])
        
        if (exerciseHistoryError) {
          console.error("Erro ao buscar histórico de exercícios:", exerciseHistoryError)
        } else if (exerciseHistoryData) {
          // Agrupar e calcular estatísticas por exercício
          const exerciseStatsMap = new Map<string, ExerciseStat>()
          
          exerciseHistoryData.forEach(history => {
            if (!history.workout_exercise || 
                typeof history.workout_exercise !== 'object' || 
                !('exercise' in history.workout_exercise) || 
                !history.workout_exercise.exercise ||
                typeof history.workout_exercise.exercise !== 'object') {
              return
            }
            
            const exercise = history.workout_exercise.exercise as { id: string; name: string }
            const exerciseId = exercise.id
            const exerciseName = exercise.name
            
            if (!exerciseStatsMap.has(exerciseId)) {
              exerciseStatsMap.set(exerciseId, {
                exercise_id: exerciseId,
                exercise_name: exerciseName,
                workout_count: 0,
                set_count: 0,
                average_weight: 0,
                max_weight: 0
              })
            }
            
            const stat = exerciseStatsMap.get(exerciseId)!
            stat.workout_count++
            stat.set_count += history.sets_completed || 0
            
            // Processar pesos
            if (history.actual_weight && typeof history.actual_weight === 'string') {
              try {
                // Convertendo o formato de peso para uma lista de valores numéricos
                const weights = JSON.parse(history.actual_weight)
                  .map((w: string | number) => typeof w === 'string' ? parseFloat(w) : w)
                  .filter((w: number) => !isNaN(w)) // Filtrar valores não numéricos
                
                if (weights.length > 0) {
                  const avgWeight = weights.reduce((sum: number, w: number) => sum + w, 0) / weights.length
                  const maxWeight = Math.max(...weights)
                  
                  // Acumular para cálculo de média global
                  stat.average_weight += avgWeight
                  
                  // Atualizar peso máximo se necessário
                  if (maxWeight > stat.max_weight) {
                    stat.max_weight = maxWeight
                  }
                }
              } catch (e) {
                // Se não for JSON válido, tenta converter diretamente
                const weight = parseFloat(history.actual_weight)
                if (!isNaN(weight)) {
                  stat.average_weight += weight
                  if (weight > stat.max_weight) {
                    stat.max_weight = weight
                  }
                }
              }
            }
          })
          
          // Calcular médias e preparar resultado final
          const finalStats: ExerciseStat[] = []
          
          exerciseStatsMap.forEach(stat => {
            if (stat.workout_count > 0) {
              stat.average_weight = parseFloat((stat.average_weight / stat.workout_count).toFixed(1))
              finalStats.push(stat)
            }
          })
          
          // Ordenar por nome do exercício
          finalStats.sort((a, b) => a.exercise_name.localeCompare(b.exercise_name))
          
          setExerciseStats(finalStats)
        }
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

  useEffect(() => {
    console.log('DEBUG - Valores atuais:', { totalWorkouts, completionRate, totalDuration, avgDuration })
  }, [totalWorkouts, completionRate, totalDuration, avgDuration])

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
            <div className="text-2xl font-bold">
              {totalDuration < 60 
                ? `${totalDuration} minutos` 
                : formatDuration(totalDuration * 60)} {/* multiplicar por 60 para converter de minutos para segundos */}
            </div>
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
            <div className="text-2xl font-bold">
              {Math.round(avgDuration)} min
            </div>
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
              <CardTitle>Evolução Inteligente de Carga</CardTitle>
              <CardDescription>
                Progressões e ajustes de peso baseados na performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exerciseStats.length > 0 ? exerciseStats.map(stat => {
                  // Calcular evolução baseada nos dados disponíveis
                  const evolutionPercentage = stat.max_weight > 0 && stat.average_weight > 0 
                    ? Math.round(((stat.max_weight - stat.average_weight) / stat.average_weight) * 100)
                    : 0;
                  
                  const isEvolution = Math.abs(evolutionPercentage) >= 5;
                  const isPositive = evolutionPercentage > 0;
                  
                  return (
                    <div key={stat.exercise_id} className="flex items-center justify-between pb-4 border-b">
                      <div className="flex-1">
                        <h4 className="font-medium">{stat.exercise_name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {stat.workout_count} treinos, {stat.set_count} séries realizadas
                        </p>
                        {isEvolution && (
                          <div className="mt-1 flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                isPositive 
                                  ? "text-green-600 dark:text-green-400 border-green-600 dark:border-green-400" 
                                  : "text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400"
                              }`}
                            >
                              {isPositive ? '+' : ''}{evolutionPercentage}%
                            </Badge>
                            <span className={`text-xs ${isPositive ? 'text-green-600' : 'text-orange-600'}`}>
                              {isPositive ? 'Progressão detectada' : 'Ajuste inteligente'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold">{stat.average_weight} kg atual</span>
                        <span className="text-sm text-muted-foreground">
                          {stat.max_weight} kg máximo atingido
                        </span>
                        {!isEvolution && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Carga estável
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8">
                    <div className="text-muted-foreground mb-2">📊</div>
                    <p className="text-muted-foreground">
                      Execute treinos com pesos registrados para acompanhar evolução
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo por Exercício</CardTitle>
              <CardDescription>
                Estatísticas detalhadas de performance
              </CardDescription>
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