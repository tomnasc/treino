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
// Importar cada componente do recharts individualmente para evitar problemas de inicialização
import { ResponsiveContainer } from "recharts"
import { RadarChart } from "recharts"
import { Radar } from "recharts"
import { PolarGrid } from "recharts"
import { PolarAngleAxis } from "recharts"
import { PolarRadiusAxis } from "recharts"
import { LineChart } from "recharts"
import { Line } from "recharts"
import { BarChart } from "recharts"
import { Bar } from "recharts"
import { XAxis } from "recharts"
import { YAxis } from "recharts"
import { CartesianGrid } from "recharts"
import { Tooltip } from "recharts"
import { Legend } from "recharts"
import { ArrowUpRight, ArrowDownRight, Clock, Calendar, BarChart3, TrendingUp, Award, Target, Brain, Activity, Gauge } from "lucide-react"
import { Badge } from "@/app/components/ui/badge"
import { Progress } from "@/app/components/ui/progress"
import { Separator } from "@/app/components/ui/separator"
import { Button } from "@/app/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Alert, AlertDescription } from "@/app/components/ui/alert"
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
  workout_exercise_id: string
  exercise_id?: string
  sets_completed: number
  actual_weight: string | null
  exercise: Exercise
}

interface PerformanceAnalysisProps {
  userId: string
}

// Interfaces para análise IA
interface WorkoutAnalysis {
  total_workouts: number
  total_exercises: number
  avg_sets: number
  avg_reps: number
  avg_rest: number
  muscle_groups_trained: string[]
  days_since_last: number
  training_frequency: number
  workout_consistency: string
  experience_level: string
}

interface MuscleImbalance {
  muscle_group: string
  exercise_frequency: number
  imbalance_type: string
  recommendation: string
}

interface UserProfile {
  fitness_goals: string
  activity_level: string
  injuries_limitations: string
  weight: number
  height: number
  age: number
  body_fat_percentage: number
  muscle_mass: number
  gender: string
  bmi: number
}

type TrendDirection = "up" | "down" | "neutral";

// Funções auxiliares
const subDays = (date: Date, days: number) => {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000)
}

const startOfWeek = (date: Date, options: { locale: Locale }) => {
  return subDays(date, date.getDay())
}

// Gráfico de radar inteligente para equilibrio muscular
// Componente de barras horizontais para equilíbrio muscular
const MuscleBalanceChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Sem dados suficientes para análise</p>
          <p className="text-sm text-muted-foreground mt-1">
            Complete alguns treinos para ver o equilíbrio muscular
          </p>
        </div>
      </div>
    )
  }

  // Calcular o valor máximo para normalizar as barras
  const maxValue = Math.max(...data.map(item => item.value))

  return (
    <div className="space-y-4">
      {data.map((item, index) => {
        const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0
        const isHighUsage = percentage > 70
        const isMediumUsage = percentage > 40 && percentage <= 70
        const isLowUsage = percentage <= 40

        return (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-0 flex-1">
                  {item.group}
                </span>
                <div className={`w-2 h-2 rounded-full ${
                  isHighUsage ? 'bg-green-500' : 
                  isMediumUsage ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`} />
              </div>
              <span className="text-xs text-muted-foreground font-mono">
                {item.value} exercícios
              </span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${
                    isHighUsage ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                    isMediumUsage ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                    'bg-gradient-to-r from-red-400 to-red-600'
                  }`}
                  style={{ width: `${Math.max(percentage, 5)}%` }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
          </div>
        )
      })}
      
      {/* Legenda */}
      <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <p className="text-xs font-medium text-muted-foreground mb-2">Interpretação:</p>
        <div className="grid grid-cols-1 gap-2 text-xs">
                     <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-green-500 rounded-full" />
             <span>Bem treinado (&gt;70%)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-yellow-500 rounded-full" />
             <span>Moderadamente treinado (40-70%)</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-red-500 rounded-full" />
             <span>Pouco treinado (&lt;40%)</span>
           </div>
        </div>
      </div>
    </div>
  )
}

// Componente de métrica inteligente
const MetricCard = ({ title, value, trend, icon: Icon, description, aiInsight }: { 
  title: string, 
  value: string | number, 
  trend?: { direction: "up" | "down" | "neutral", value: string }, 
  icon: React.ElementType,
  description: string,
  aiInsight?: string
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
                ? "bg-green-500/10 text-green-500 dark:bg-green-500/20 dark:text-green-400" 
                : trend.direction === "down" 
                  ? "bg-destructive/10 text-destructive dark:bg-red-500/20 dark:text-red-400" 
                  : "bg-gray-500/10 text-gray-500 dark:bg-gray-500/20 dark:text-gray-400"
            }>
              {trend.direction === "up" && <ArrowUpRight className="h-3 w-3 mr-1" />}
              {trend.direction === "down" && <ArrowDownRight className="h-3 w-3 mr-1" />}
              {trend.value}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-2">
          {description}
        </p>
        {aiInsight && (
          <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded-md mt-2">
            <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center">
              <Brain className="w-3 h-3 mr-1 text-blue-600 dark:text-blue-400" />
              {aiInsight}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Alerta de desequilíbrio muscular
const MuscleImbalanceAlert = ({ imbalances }: { imbalances: MuscleImbalance[] }) => {
  if (imbalances.length === 0) return null

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
      <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertDescription>
        <div className="space-y-2">
          <p className="font-medium text-orange-800 dark:text-orange-100">Desequilíbrios detectados:</p>
          {imbalances.map((imbalance, idx) => (
            <div key={idx} className="text-sm text-orange-700 dark:text-orange-200">
              <strong>{imbalance.muscle_group}</strong> <span className="text-orange-600 dark:text-orange-400">({imbalance.imbalance_type})</span>: {imbalance.recommendation}
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  )
}

export function PerformanceAnalysis({ userId }: PerformanceAnalysisProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [timeFrame, setTimeFrame] = useState("90")
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([])
  const [exerciseHistory, setExerciseHistory] = useState<ExerciseHistoryItem[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  
  // Estados para análise IA
  const [workoutAnalysis, setWorkoutAnalysis] = useState<WorkoutAnalysis | null>(null)
  const [muscleImbalances, setMuscleImbalances] = useState<MuscleImbalance[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [aiInsights, setAiInsights] = useState<string[]>([])
  
  // Buscar dados com análise IA
  useEffect(() => {
    async function fetchPerformanceData() {
      try {
        setIsLoading(true)
        
        // 1. ANÁLISE IA - Padrões de treino
        const { data: analysisData, error: analysisError } = await supabase
          .rpc('analyze_user_workout_patterns', { p_user_id: userId })
        
        if (analysisError) {
          console.error('Erro na análise IA:', analysisError)
        } else if (analysisData) {
          setWorkoutAnalysis(analysisData)
        }

        // 2. ANÁLISE IA - Desequilíbrios musculares
        const { data: imbalancesData, error: imbalancesError } = await supabase
          .rpc('detect_muscle_imbalances', { p_user_id: userId })
        
        if (imbalancesError) {
          console.error('Erro na detecção de desequilíbrios:', imbalancesError)
        } else if (imbalancesData) {
          setMuscleImbalances(imbalancesData)
        }

        // 3. PERFIL FÍSICO do usuário
        const { data: profile, error: profileError } = await supabase
          .from('physical_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (profileError) {
          console.error('Erro ao buscar perfil:', profileError)
        } else if (profile) {
          const bmi = profile.weight / Math.pow(profile.height / 100, 2)
          setUserProfile({
            ...profile,
            age: new Date().getFullYear() - new Date(profile.birth_date).getFullYear(),
            bmi: Math.round(bmi * 10) / 10
          })
        }
        
        // 4. DADOS HISTÓRICOS (para gráficos detalhados)
        const { data: historyData, error: historyError } = await supabase
          .from("workout_history")
          .select(`
            *,
            workout:workouts(*)
          `)
          .eq("user_id", userId)
          .order("started_at", { ascending: false })
          
        if (historyError) {
          console.error('Erro no histórico:', historyError)
        } else {
          setWorkoutHistory(historyData || [])
        }
        
        // 5. HISTÓRICO DE EXERCÍCIOS
        if (historyData && historyData.length > 0) {
          const { data: exercisesData, error: exercisesError } = await supabase
            .from("exercise_history")
            .select(`
              *,
              workout_exercise_id,
              workout_exercise:workout_exercises(
                id,
                exercise_id,
                exercise:exercises(
                  id, 
                  name,
                  muscle_group_id
                )
              )
            `)
            .in("workout_history_id", historyData.map(item => item.id))
            
          if (exercisesError) {
            console.error('Erro no histórico de exercícios:', exercisesError)
          } else {
            const exercisesWithDetails = exercisesData ? exercisesData.map(item => {
              if (!item.workout_exercise || 
                  typeof item.workout_exercise !== 'object' ||
                  !item.workout_exercise.exercise ||
                  typeof item.workout_exercise.exercise !== 'object') {
                return item;
              }
              
              const exercise = item.workout_exercise.exercise;
              const exercise_id = item.workout_exercise.exercise_id;
              
              return {
                ...item,
                exercise_id,
                exercise
              };
            }) : [];
            
            setExerciseHistory(exercisesWithDetails || [])
          }
        }
        
        // 6. GRUPOS MUSCULARES
        const { data: groupsData, error: groupsError } = await supabase
          .from("muscle_groups")
          .select("*")
          
        if (groupsError) {
          console.error('Erro nos grupos musculares:', groupsError)
        } else {
          setMuscleGroups(groupsData || [])
        }

        // 7. GERAR INSIGHTS IA
        const insights = generateAiInsights(analysisData, imbalancesData, profile)
        setAiInsights(insights)
        
        setIsLoading(false)
      } catch (error) {
        console.error("Erro geral ao buscar dados:", error)
        setIsLoading(false)
      }
    }
    
    fetchPerformanceData()
  }, [userId])

  // Gerar insights inteligentes
  const generateAiInsights = (
    analysis: WorkoutAnalysis | null, 
    imbalances: MuscleImbalance[], 
    profile: any
  ): string[] => {
    const insights: string[] = []
    
    if (!analysis) return insights

    // Insight de consistência
    if (analysis.workout_consistency === 'alta') {
      insights.push('Excelente consistência! Mantenha esse ritmo para resultados duradouros.')
    } else if (analysis.workout_consistency === 'média') {
      insights.push('Boa consistência. Tente treinar com mais regularidade para melhores resultados.')
    } else if (analysis.workout_consistency === 'baixa') {
      insights.push('Consistência baixa. Estabeleça uma rotina mais regular de treinos.')
    }

    // Insight de experiência
    if (analysis.experience_level === 'iniciante') {
      insights.push('Como iniciante, foque em aprender os movimentos corretamente.')
    } else if (analysis.experience_level === 'intermediário') {
      insights.push('Nível intermediário. Hora de aumentar a intensidade e variedade.')
    } else if (analysis.experience_level === 'avançado') {
      insights.push('Nível avançado. Considere técnicas especializadas e periodização.')
    }

    // Insight de desequilíbrios
    if (imbalances.length > 0) {
      insights.push(`Detectados ${imbalances.length} desequilíbrios musculares que precisam de atenção.`)
    } else {
      insights.push('Ótimo equilíbrio muscular entre os grupos treinados!')
    }

    // Insight de frequência
    if (analysis.training_frequency < 2) {
      insights.push('Frequência muito baixa. Tente treinar pelo menos 3x por semana.')
    } else if (analysis.training_frequency > 5) {
      insights.push('Frequência muito alta. Considere descansos para melhor recuperação.')
    }

    // Insight de objetivos (se tiver perfil)
    if (profile?.fitness_goals) {
      const goals = profile.fitness_goals.split(',')
      if (goals.includes('ganho_massa')) {
        insights.push('Para ganho de massa, foque em 4-6 séries com 8-12 repetições.')
      }
      if (goals.includes('definicao')) {
        insights.push('Para definição, combine treinos de força com cardio moderado.')
      }
    }

    return insights
  }

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

  // Gerar dados de equilíbrio muscular baseado na análise IA
  const muscleBalanceData = useMemo(() => {
    if (!workoutAnalysis || !workoutAnalysis.muscle_groups_trained.length) return []
    
    // Usar dados da análise IA para grupos treinados
    const trainedGroups = workoutAnalysis.muscle_groups_trained
    
    // Criar dados para o radar baseado nos grupos detectados pela IA
    const balanceData = trainedGroups.map(group => {
      // Encontrar se há desequilíbrio para este grupo
      const imbalance = muscleImbalances.find(imb => imb.muscle_group === group)
      
      // Calcular valor baseado na frequência (se disponível) ou valor padrão
      const value = imbalance ? imbalance.exercise_frequency * 10 : 50
      
      return {
        group: group,
        value: Math.min(value, 100) // Limitar a 100 para o gráfico
      }
    })
    
    return balanceData
  }, [workoutAnalysis, muscleImbalances])

  // Progresso baseado na análise IA
  const strengthProgress = useMemo(() => {
    if (!exerciseHistory.length) return []
    
    // Usar lógica existente mas com dados da IA
    const exerciseData: Record<string, { name: string, weights: { date: string, weight: number }[] }> = {}
    
    exerciseHistory.forEach(item => {
      // Verificar se tem exercício e peso válido
      if (!item.exercise || !item.actual_weight) return
      
      // Converter peso de string para número (lidar com vírgulas decimais)
      const weight = parseFloat(item.actual_weight.replace(',', '.'))
      if (isNaN(weight) || weight <= 0) return
      
      const exerciseId = item.exercise_id
      if (!exerciseId) return
      
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
        weight: weight
      })
    })
    
    const processedData = Object.values(exerciseData).map(exercise => {
      const sortedWeights = exercise.weights.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      )
      
      // Agrupar por data e pegar o peso máximo de cada data
      const dateGrouped = sortedWeights.reduce((acc, curr) => {
        if (!acc[curr.date] || acc[curr.date] < curr.weight) {
          acc[curr.date] = curr.weight
        }
        return acc
      }, {} as Record<string, number>)
      
      const maxWeightsByDate = Object.entries(dateGrouped).map(([date, weight]) => ({
        date,
        weight
      })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      
      const firstWeight = maxWeightsByDate[0]?.weight || 0
      const lastWeight = maxWeightsByDate[maxWeightsByDate.length - 1]?.weight || 0
      
      const progressPercentage = firstWeight > 0 
        ? Math.round(((lastWeight - firstWeight) / firstWeight) * 100) 
        : 0
      
      return {
        name: exercise.name,
        firstWeight,
        lastWeight,
        progressPercentage,
        data: maxWeightsByDate
      }
    })
    
    return processedData
      .filter(ex => ex.progressPercentage !== 0 && ex.data.length > 1) // Inclui tanto progressões quanto regressões
      .sort((a, b) => Math.abs(b.progressPercentage) - Math.abs(a.progressPercentage)) // Ordena por magnitude de mudança
      .slice(0, 8) // Mostra mais exercícios para incluir variações
  }, [exerciseHistory, workoutHistory])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Brain className="w-12 h-12 mx-auto mb-4 animate-pulse text-blue-500 dark:text-blue-400" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Analisando seu desempenho...</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">IA Personal Trainer processando dados</p>
        </div>
      </div>
    )
  }

  const noDataAvailable = !workoutAnalysis || workoutAnalysis.total_workouts === 0
  
  if (noDataAvailable) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <Brain className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2 flex items-center justify-center gap-2">
            <Brain className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Análise de Desempenho com IA
          </h3>
          <p className="text-muted-foreground mb-4">
            Sistema inteligente que analisa seus padrões de treino e oferece insights personalizados
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sem dados suficientes para análise</CardTitle>
            <CardDescription>
              Complete alguns treinos para que a IA possa analisar seu desempenho e gerar insights personalizados.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.href = "/dashboard/workouts"}>
              Começar a treinar
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com IA */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Análise de Desempenho com IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Dados personalizados sobre seu progresso e recomendações para melhorar seus resultados
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={timeFrame} onValueChange={setTimeFrame}>
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

      {/* Alertas de desequilíbrio */}
      <MuscleImbalanceAlert imbalances={muscleImbalances} />

      {/* Métricas principais com IA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Consistência"
          value={`${Math.round((workoutAnalysis?.training_frequency || 0) * 25)}%`}
          trend={{
            direction: workoutAnalysis?.workout_consistency === 'alta' ? 'up' : 
                     workoutAnalysis?.workout_consistency === 'baixa' ? 'down' : 'neutral',
            value: workoutAnalysis?.workout_consistency || 'normal'
          }}
          icon={Calendar}
          description="Semanas com pelo menos 2 treinos"
          aiInsight={workoutAnalysis?.workout_consistency === 'alta' ? 
            'Consistência excelente! Continue assim.' : 
            'Melhore a regularidade para melhores resultados.'}
        />
        
        <MetricCard
          title="Treinos concluídos"
          value={workoutAnalysis?.total_workouts || 0}
          icon={BarChart3}
          description="No período selecionado"
          aiInsight={`Nível ${workoutAnalysis?.experience_level}. ${
            workoutAnalysis?.experience_level === 'iniciante' ? 
            'Foque na técnica correta.' : 
            workoutAnalysis?.experience_level === 'intermediário' ? 
            'Aumente a intensidade gradualmente.' : 
            'Considere técnicas avançadas.'
          }`}
        />
        
        <MetricCard
          title="Evolução de carga"
          value={strengthProgress.length > 0 ? 
            `${strengthProgress[0].progressPercentage > 0 ? '+' : ''}${strengthProgress[0].progressPercentage}%` : 
            "0%"}
          trend={strengthProgress.length > 0 ? {
            direction: strengthProgress[0].progressPercentage > 0 ? 'up' : 
                      strengthProgress[0].progressPercentage < 0 ? 'down' : 'neutral',
            value: strengthProgress.length > 0 ? `${Math.abs(strengthProgress[0].progressPercentage)}%` : '0%'
          } : undefined}
          icon={TrendingUp}
          description="Mudanças inteligentes de peso"
          aiInsight={strengthProgress.length > 0 ? 
            (strengthProgress[0].progressPercentage > 0 ? 
              'Progresso detectado! Continue evoluindo.' : 
              'Ajuste inteligente de carga detectado.') : 
            'Registre pesos para acompanhar evolução.'}
        />
        
        <MetricCard
          title="Foco"
          value={workoutAnalysis?.muscle_groups_trained?.[0] || "Variado"}
          icon={Target}
          description="Grupo muscular mais treinado"
          aiInsight={muscleImbalances.length > 0 ? 
            `${muscleImbalances.length} desequilíbrios detectados` : 
            'Bom equilíbrio muscular!'}
        />
      </div>

      {/* Insights da IA */}
      {aiInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              Insights da IA Personal Trainer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiInsights.map((insight, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800 dark:text-blue-200">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equilíbrio muscular com dados da IA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-500 dark:text-green-400" />
              Equilíbrio muscular
            </CardTitle>
            <CardDescription>
              Distribuição dos seus treinos por grupo muscular (baseado na análise IA)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MuscleBalanceChart data={muscleBalanceData} />
            {workoutAnalysis && (
              <div className="mt-4 space-y-3">
                <div className="text-sm text-muted-foreground">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 dark:bg-blue-400 rounded-full"></div>
                    <span className="font-medium">Frequência de treino por grupo</span>
                  </div>
                  <p>
                    <strong>Grupos treinados ({workoutAnalysis.muscle_groups_trained.length}):</strong> {workoutAnalysis.muscle_groups_trained.join(', ')}
                  </p>
                  <p>
                    <strong>Frequência média:</strong> {workoutAnalysis.training_frequency}x por semana
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evolução de carga */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              Evolução de carga
            </CardTitle>
            <CardDescription>
              Mudanças nos principais exercícios (progressões e ajustes)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {strengthProgress.length > 0 ? (
              <div className="space-y-4">
                {strengthProgress.map((exercise, idx) => {
                  const isPositive = exercise.progressPercentage > 0;
                  const isSignificantChange = Math.abs(exercise.progressPercentage) >= 5;
                  
                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{exercise.name}</span>
                        <Badge 
                          variant="outline" 
                          className={`${
                            isPositive 
                              ? "text-green-600 dark:text-green-400 border-green-600 dark:border-green-400" 
                              : "text-orange-600 dark:text-orange-400 border-orange-600 dark:border-orange-400"
                          }`}
                        >
                          {isPositive ? '+' : ''}{exercise.progressPercentage}%
                        </Badge>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{exercise.firstWeight}kg → {exercise.lastWeight}kg</span>
                        <span className={`${isPositive ? 'text-green-600' : 'text-orange-600'} font-medium`}>
                          {isPositive ? 'Progressão' : 'Ajuste'}
                          {isSignificantChange && (
                            <span className="ml-1">
                              {Math.abs(exercise.progressPercentage) >= 15 ? '🔥' : 
                               Math.abs(exercise.progressPercentage) >= 10 ? '⚡' : '📈'}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="relative">
                        <Progress 
                          value={Math.min(Math.abs(exercise.progressPercentage), 100)} 
                          className={`h-2 ${isPositive ? '' : 'opacity-75'}`}
                        />
                        {!isPositive && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-xs text-orange-600 dark:text-orange-400 font-medium bg-background px-1 rounded">
                              Redução inteligente
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Gauge className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Registre pesos nos exercícios para acompanhar sua evolução
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Seção de Recomendações IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            Recomendações Personalizadas
          </CardTitle>
          <CardDescription>
            Sugestões baseadas na análise do seu desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">
              Acesse recomendações personalizadas
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Vá para a seção de Recomendações para ver sugestões específicas de melhorias
            </p>
            <Button onClick={() => window.location.href = '/dashboard/recommendations'} variant="outline">
              Ver Recomendações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 