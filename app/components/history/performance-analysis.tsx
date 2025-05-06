"use client"

import { useState, useMemo, useEffect } from "react"
import { format, subMonths, subWeeks, differenceInDays, differenceInWeeks, Locale } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/app/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from "recharts"
import { ArrowUpRight, ArrowDownRight, Clock, Calendar, BarChart3, TrendingUp, Award, Target } from "lucide-react"
import { Badge } from "@/app/components/ui/badge"
import { Progress } from "@/app/components/ui/progress"
import { Separator } from "@/app/components/ui/separator"
import { Button } from "@/app/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Workout, Exercise, MuscleGroup } from "@/app/types/database.types"
import { supabase } from "@/app/lib/supabase"

interface WorkoutHistoryItem {
  id: string
  workout_id: string
  user_id: string
  started_at: string
  finished_at: string | null
  duration: number | null
  completed: boolean
  workout: Workout
}

interface ExerciseHistoryItem {
  id: string
  workout_history_id: string
  exercise_id: string
  sets_completed: number
  max_weight: number | null
  exercise: Exercise
}

interface PerformanceAnalysisProps {
  userId: string
}

type TrendDirection = "up" | "down" | "neutral";

// Gráfico de radar para equilibrio de grupos musculares
const RadarChartComponent = ({ data }: { data: any[] }) => {
  // Verificar se há dados suficientes para mostrar o gráfico
  if (!data || data.length === 0 || data.every(item => item.value === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Sem dados suficientes para análise</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="group" />
        <PolarRadiusAxis />
        <Radar
          name="Equilíbrio"
          dataKey="value"
          stroke="#8884d8"
          fill="#8884d8"
          fillOpacity={0.6}
        />
      </RadarChart>
    </ResponsiveContainer>
  )
}

// Componente que exibe as principais métricas
const MetricCard = ({ title, value, trend, icon: Icon, description }: { 
  title: string, 
  value: string | number, 
  trend?: { direction: "up" | "down" | "neutral", value: string }, 
  icon: React.ElementType,
  description: string
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center">
          <div className="text-2xl font-bold mr-2">{value}</div>
          {trend && (
            <Badge variant="outline" className={
              trend.direction === "up" 
                ? "bg-green-500/10 text-green-500" 
                : trend.direction === "down" 
                  ? "bg-destructive/10 text-destructive" 
                  : "bg-gray-500/10 text-gray-500"
            }>
              {trend.direction === "up" && <ArrowUpRight className="h-3 w-3 mr-1" />}
              {trend.direction === "down" && <ArrowDownRight className="h-3 w-3 mr-1" />}
              {trend.value}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
      </CardContent>
    </Card>
  )
}

// Timeline de progresso
const ProgressTimeline = ({ 
  timeline, 
  title
}: { 
  timeline: { date: string, event: string, achievement?: string }[], 
  title: string 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative ml-3">
          {timeline.map((item, index) => (
            <div key={index} className="mb-6 ml-6">
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                <Award className="h-3 w-3 text-background" />
              </span>
              <div className="flex flex-col space-y-1">
                <time className="text-xs text-muted-foreground">
                  {item.date}
                </time>
                <h3 className="text-sm font-medium">
                  {item.event}
                </h3>
                {item.achievement && (
                  <p className="text-xs text-muted-foreground">{item.achievement}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function PerformanceAnalysis({ userId }: PerformanceAnalysisProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [timeFrame, setTimeFrame] = useState("90")
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([])
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryItem[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  
  // Buscar dados do histórico
  useEffect(() => {
    async function fetchPerformanceData() {
      try {
        setIsLoading(true)
        
        // Buscar histórico de treinos
        const { data: historyData, error: historyError } = await supabase
          .from("workout_history")
          .select(`
            *,
            workout:workouts(*)
          `)
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          
        if (historyError) throw historyError
        
        setWorkoutHistory(historyData || [])
        
        // Se não tiver histórico de treinos, não precisa seguir com as demais consultas
        if (!historyData || historyData.length === 0) {
          setIsLoading(false)
          return
        }
        
        // Buscar histórico de exercícios
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercise_history")
          .select(`
            *,
            exercise_id
          `)
          .in("workout_history_id", historyData.map(item => item.id))
          
        if (exercisesError) throw exercisesError
        
        // Buscar informações de exercícios separadamente
        let exercisesWithDetails = [];
        if (exercisesData && exercisesData.length > 0) {
          const exerciseIds = exercisesData.map(item => item.exercise_id);
          
          const { data: exerciseDetails, error: exerciseDetailsError } = await supabase
            .from("exercises")
            .select(`
              *,
              muscle_group_id
            `)
            .in("id", exerciseIds)
            
          if (exerciseDetailsError) throw exerciseDetailsError
          
          // Combinar as informações
          exercisesWithDetails = exercisesData.map(item => {
            const exercise = exerciseDetails?.find(ex => ex.id === item.exercise_id);
            return {
              ...item,
              exercise
            };
          });
        }
        
        setExerciseHistory(exercisesWithDetails || [])
        
        // Buscar grupos musculares
        const { data: groupsData, error: groupsError } = await supabase
          .from("muscle_groups")
          .select("*")
          
        if (groupsError) throw groupsError
        
        setMuscleGroups(groupsData || [])
        
        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao buscar dados de desempenho:", error)
        setIsLoading(false)
      }
    }
    
    fetchPerformanceData()
  }, [userId])
  
  // Filtrar dados com base no timeFrame
  const filteredWorkoutHistory = useMemo(() => {
    if (!workoutHistory.length) return []
    
    const days = parseInt(timeFrame)
    const cutoffDate = subDays(new Date(), days)
    
    return workoutHistory.filter(item => 
      item.completed && 
      new Date(item.started_at) >= cutoffDate
    )
  }, [workoutHistory, timeFrame])
  
  // Calcular consistência (% de semanas com pelo menos X treinos)
  const consistencyMetrics = useMemo(() => {
    if (!filteredWorkoutHistory.length) return { rate: 0, trend: "neutral" as TrendDirection, trendValue: "0%" }
    
    const days = parseInt(timeFrame)
    const totalWeeks = Math.ceil(days / 7)
    
    // Agrupar treinos por semana
    const weeklyWorkouts: Record<string, number> = {}
    
    filteredWorkoutHistory.forEach(item => {
      const date = new Date(item.started_at)
      const weekStart = startOfWeek(date, { locale: ptBR })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      
      if (!weeklyWorkouts[weekKey]) {
        weeklyWorkouts[weekKey] = 0
      }
      
      weeklyWorkouts[weekKey] += 1
    })
    
    // Calcular semanas consistentes (com pelo menos 2 treinos)
    const consistentWeeks = Object.values(weeklyWorkouts).filter(count => count >= 2).length
    const consistencyRate = Math.round((consistentWeeks / totalWeeks) * 100)
    
    // Comparar com período anterior para tendência
    const previousCutoffStart = subDays(new Date(), days * 2)
    const previousCutoffEnd = subDays(new Date(), days)
    
    const previousWorkouts = workoutHistory.filter(item => 
      item.completed && 
      new Date(item.started_at) >= previousCutoffStart &&
      new Date(item.started_at) < previousCutoffEnd
    )
    
    // Calcular consistência do período anterior
    const previousWeeklyWorkouts: Record<string, number> = {}
    
    previousWorkouts.forEach(item => {
      const date = new Date(item.started_at)
      const weekStart = startOfWeek(date, { locale: ptBR })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      
      if (!previousWeeklyWorkouts[weekKey]) {
        previousWeeklyWorkouts[weekKey] = 0
      }
      
      previousWeeklyWorkouts[weekKey] += 1
    })
    
    const previousConsistentWeeks = Object.values(previousWeeklyWorkouts).filter(count => count >= 2).length
    const previousConsistencyRate = Math.round((previousConsistentWeeks / totalWeeks) * 100)
    
    const difference = consistencyRate - previousConsistencyRate
    
    return { 
      rate: consistencyRate, 
      trend: (difference > 0 ? "up" : difference < 0 ? "down" : "neutral") as TrendDirection,
      trendValue: `${Math.abs(difference)}%`
    }
  }, [filteredWorkoutHistory, timeFrame])
  
  // Calcular progresso de carga nos principais exercícios
  const strengthProgress = useMemo(() => {
    if (!exerciseHistory.length) return []
    
    // Agrupar por exercício
    const exerciseData: Record<string, { name: string, weights: { date: string, weight: number }[] }> = {}
    
    exerciseHistory.forEach(item => {
      if (!item.exercise || !item.max_weight) return
      
      const exerciseId = item.exercise_id
      const workoutDate = workoutHistory.find(w => w.id === item.workout_history_id)?.started_at
      
      if (!workoutDate) return
      
      if (!exerciseData[exerciseId]) {
        exerciseData[exerciseId] = { 
          name: item.exercise.name, 
          weights: [] 
        }
      }
      
      exerciseData[exerciseId].weights.push({ 
        date: format(new Date(workoutDate), 'dd/MM/yyyy'),
        weight: item.max_weight
      })
    })
    
    // Ordenar por data e pegar máximo para cada mês
    const processedData = Object.values(exerciseData).map(exercise => {
      // Ordenar por data
      const sortedWeights = exercise.weights.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      // Pegar apenas o primeiro e último registro para calcular progresso
      const firstWeight = sortedWeights[0]?.weight || 0
      const lastWeight = sortedWeights[sortedWeights.length - 1]?.weight || 0
      
      const progressPercentage = firstWeight > 0 
        ? Math.round(((lastWeight - firstWeight) / firstWeight) * 100) 
        : 0
      
      return {
        name: exercise.name,
        firstWeight,
        lastWeight,
        progressPercentage,
        data: sortedWeights
      }
    })
    
    // Ordenar por maior progresso
    return processedData
      .filter(ex => ex.progressPercentage > 0)
      .sort((a, b) => b.progressPercentage - a.progressPercentage)
      .slice(0, 5)
  }, [exerciseHistory, workoutHistory])
  
  // Gerar dados de equilíbrio muscular
  const muscleBalanceData = useMemo(() => {
    if (!exerciseHistory.length || !muscleGroups.length) return []
    
    // Criar mapa de exercício para grupo muscular
    const exerciseToGroup: Record<string, string> = {}
    
    // Contar treinos por grupo muscular
    const groupCounts: Record<string, number> = {}
    
    muscleGroups.forEach(group => {
      groupCounts[group.id] = 0
    })
    
    // Contar apenas exercícios válidos com grupo muscular definido
    exerciseHistory.forEach(item => {
      if (!item.exercise || !item.exercise.muscle_group_id) return
      
      const groupId = item.exercise.muscle_group_id
      
      if (groupCounts[groupId] !== undefined) {
        groupCounts[groupId] += 1
      }
    })
    
    // Verificar se há dados válidos
    const hasMuscleData = Object.values(groupCounts).some(count => count > 0)
    if (!hasMuscleData) return []
    
    // Normalizar valores para o gráfico de radar (0-100)
    const maxCount = Math.max(...Object.values(groupCounts))
    
    return muscleGroups.map(group => ({
      group: group.name,
      value: maxCount > 0 ? Math.round((groupCounts[group.id] / maxCount) * 100) : 0
    }))
  }, [exerciseHistory, muscleGroups])
  
  // Gerar linha do tempo de progresso
  const progressTimeline = useMemo(() => {
    if (!workoutHistory.length) return []
    
    const timeline: { date: string, event: string, achievement?: string }[] = []
    
    // Primeiro treino
    const firstWorkout = [...workoutHistory]
      .filter(w => w.completed)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())[0]
    
    if (firstWorkout) {
      timeline.push({
        date: format(new Date(firstWorkout.started_at), 'dd/MM/yyyy'),
        event: "Primeiro treino registrado",
        achievement: `${firstWorkout.workout?.name}`
      })
    }
    
    // Maior série de treinos consecutivos
    const streaks: { start: Date, end: Date, count: number }[] = []
    let currentStreak = { start: new Date(), end: new Date(), count: 0 }
    
    const sortedWorkouts = [...workoutHistory]
      .filter(w => w.completed)
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
    
    sortedWorkouts.forEach((workout, index) => {
      const currentDate = new Date(workout.started_at)
      
      if (index === 0) {
        currentStreak = { start: currentDate, end: currentDate, count: 1 }
      } else {
        const prevDate = new Date(sortedWorkouts[index - 1].started_at)
        const dayDiff = differenceInDays(currentDate, prevDate)
        
        if (dayDiff <= 3) { // Considerando treinos contínuos se até 3 dias entre eles
          currentStreak.end = currentDate
          currentStreak.count++
        } else {
          streaks.push({...currentStreak})
          currentStreak = { start: currentDate, end: currentDate, count: 1 }
        }
      }
      
      if (index === sortedWorkouts.length - 1) {
        streaks.push({...currentStreak})
      }
    })
    
    const longestStreak = streaks.sort((a, b) => b.count - a.count)[0]
    
    if (longestStreak && longestStreak.count >= 3) {
      timeline.push({
        date: format(longestStreak.end, 'dd/MM/yyyy'),
        event: `Sequência de ${longestStreak.count} treinos`,
        achievement: `De ${format(longestStreak.start, 'dd/MM')} a ${format(longestStreak.end, 'dd/MM')}`
      })
    }
    
    // Progresso de peso
    const significantProgress = strengthProgress[0]
    
    if (significantProgress && significantProgress.progressPercentage >= 20) {
      timeline.push({
        date: significantProgress.data[significantProgress.data.length - 1].date,
        event: `Progresso em ${significantProgress.name}`,
        achievement: `Aumento de ${significantProgress.progressPercentage}% na carga`
      })
    }
    
    // Treino mais recente
    const latestWorkout = sortedWorkouts[sortedWorkouts.length - 1]
    
    if (latestWorkout && timeline.length < 5) {
      const isRecent = differenceInDays(new Date(), new Date(latestWorkout.started_at)) <= 7
      
      if (isRecent) {
        timeline.push({
          date: format(new Date(latestWorkout.started_at), 'dd/MM/yyyy'),
          event: "Treino mais recente",
          achievement: `${latestWorkout.workout?.name}`
        })
      }
    }
    
    return timeline
  }, [workoutHistory, strengthProgress])
  
  // Funções auxiliares
  const subDays = (date: Date, days: number) => {
    return new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
  }
  
  const startOfWeek = (date: Date, options: { locale: Locale }) => {
    return subDays(date, date.getDay())
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }
  
  if (workoutHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem dados suficientes</CardTitle>
          <CardDescription>
            Você precisa completar alguns treinos para visualizar sua análise de desempenho.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" onClick={() => window.location.href = "/dashboard/workouts"}>
            Ver treinos disponíveis
          </Button>
        </CardFooter>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Análise de desempenho</h3>
        <div className="flex items-center space-x-2">
          <Select
            value={timeFrame}
            onValueChange={setTimeFrame}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Último mês</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard 
          title="Consistência"
          value={`${consistencyMetrics.rate}%`}
          trend={{ 
            direction: consistencyMetrics.trend, 
            value: consistencyMetrics.trendValue 
          }}
          icon={Calendar}
          description="Semanas com pelo menos 2 treinos"
        />
        <MetricCard 
          title="Treinos concluídos"
          value={filteredWorkoutHistory.length}
          icon={BarChart3}
          description={`No período selecionado`}
        />
        <MetricCard 
          title="Carga progressiva"
          value={strengthProgress.length > 0 ? `+${strengthProgress[0]?.progressPercentage || 0}%` : "0%"}
          icon={TrendingUp}
          description={strengthProgress.length > 0 ? `Em ${strengthProgress[0]?.name}` : "Nenhum progresso registrado"}
        />
        <MetricCard 
          title="Foco"
          value={muscleBalanceData.find(d => d.value === 100)?.group || "N/A"}
          icon={Target}
          description="Grupo muscular mais treinado"
        />
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Equilíbrio muscular</CardTitle>
            <CardDescription>
              Distribuição dos seus treinos por grupo muscular
            </CardDescription>
          </CardHeader>
          <CardContent>
            {muscleBalanceData.length > 0 ? (
              <RadarChartComponent data={muscleBalanceData} />
            ) : (
              <p className="text-center text-muted-foreground py-12">
                Sem dados suficientes para análise
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Progresso de carga</CardTitle>
            <CardDescription>
              Evolução nos principais exercícios
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {strengthProgress.length > 0 ? (
                strengthProgress.slice(0, 3).map((exercise, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium">{exercise.name}</span>
                      <span className="text-sm text-muted-foreground">+{exercise.progressPercentage}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{exercise.firstWeight}kg</span>
                      <Progress value={100} className="h-2" />
                      <span className="text-xs font-medium">{exercise.lastWeight}kg</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-12">
                  Sem dados suficientes para análise
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timeline">Timeline de progresso</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendações</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline">
          <ProgressTimeline 
            timeline={progressTimeline} 
            title="Sua jornada de fitness" 
          />
        </TabsContent>
        
        <TabsContent value="recommendations">
          <Card>
            <CardHeader>
              <CardTitle>Recomendações personalizadas</CardTitle>
              <CardDescription>
                Baseadas no seu histórico de treinos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {muscleBalanceData.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Equilibre seus treinos</h3>
                    <p className="text-sm text-muted-foreground">
                      {`Você tem focado mais em ${muscleBalanceData.find(d => d.value === 100)?.group}. 
                      Considere incluir mais exercícios para 
                      ${muscleBalanceData.filter(d => d.value < 50).map(d => d.group).join(', ') || 'outros grupos musculares'}.`}
                    </p>
                  </div>
                )}
                
                {consistencyMetrics.rate < 70 && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Melhore sua consistência</h3>
                    <p className="text-sm text-muted-foreground">
                      Tente estabelecer uma rotina com pelo menos 2-3 treinos por semana para melhores resultados.
                    </p>
                  </div>
                )}
                
                {strengthProgress.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="text-sm font-medium">Continue a progressão de carga</h3>
                    <p className="text-sm text-muted-foreground">
                      Você tem mostrado bom progresso em {strengthProgress[0]?.name}. 
                      Continue aumentando as cargas gradualmente para continuar evoluindo.
                    </p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <h3 className="text-sm font-medium">Experimente novas modalidades</h3>
                  <p className="text-sm text-muted-foreground">
                    Adicionar variedade ao seu programa de treino pode ajudar a manter a motivação e 
                    trabalhar diferentes grupos musculares.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 