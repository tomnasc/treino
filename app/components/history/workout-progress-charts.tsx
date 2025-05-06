"use client"

import { useState, useMemo } from "react"
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subMonths, isAfter } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { formatDuration } from "@/app/lib/utils"
import { Workout } from "@/app/types/database.types"

interface WorkoutHistoryItem {
  id: string
  workout_id: string
  started_at: string
  finished_at: string | null
  duration: number | null
  completed: boolean
  workout: Workout
}

interface WorkoutProgressChartsProps {
  workoutHistory: WorkoutHistoryItem[]
}

export function WorkoutProgressCharts({ workoutHistory }: WorkoutProgressChartsProps) {
  const [timeFrame, setTimeFrame] = useState("30")
  
  // Filtrar dados com base no timeFrame
  const filteredData = useMemo(() => {
    if (!workoutHistory.length) return []
    
    const days = parseInt(timeFrame)
    const cutoffDate = subMonths(new Date(), days / 30)
    
    return workoutHistory.filter(item => 
      item.completed && 
      isAfter(new Date(item.started_at), cutoffDate)
    )
  }, [workoutHistory, timeFrame])
  
  // Dados para gráfico de treinos por dia da semana
  const workoutsByWeekday = useMemo(() => {
    const weekdayCounts = [
      { name: "Domingo", count: 0 },
      { name: "Segunda", count: 0 },
      { name: "Terça", count: 0 },
      { name: "Quarta", count: 0 },
      { name: "Quinta", count: 0 },
      { name: "Sexta", count: 0 },
      { name: "Sábado", count: 0 },
    ]
    
    filteredData.forEach(item => {
      const date = new Date(item.started_at)
      const weekday = date.getDay()
      weekdayCounts[weekday].count += 1
    })
    
    return weekdayCounts
  }, [filteredData])
  
  // Dados para gráfico de duração média dos treinos
  const workoutDurationByType = useMemo(() => {
    const durationByWorkout: Record<string, { count: number, totalDuration: number }> = {}
    
    filteredData.forEach(item => {
      if (!item.workout || !item.duration) return
      
      const workoutName = item.workout.name
      
      if (!durationByWorkout[workoutName]) {
        durationByWorkout[workoutName] = { count: 0, totalDuration: 0 }
      }
      
      durationByWorkout[workoutName].count += 1
      durationByWorkout[workoutName].totalDuration += item.duration
    })
    
    return Object.entries(durationByWorkout).map(([name, data]) => ({
      name,
      averageDuration: Math.round(data.totalDuration / data.count / 60), // Em minutos
    }))
  }, [filteredData])
  
  // Dados para gráfico de frequência de treinos ao longo do tempo
  const workoutFrequency = useMemo(() => {
    if (!filteredData.length) return []
    
    // Ordena por data
    const sortedData = [...filteredData].sort((a, b) => 
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    )
    
    // Agrupa por semana
    const weeklyData: Record<string, number> = {}
    
    sortedData.forEach(item => {
      const date = new Date(item.started_at)
      const weekStart = startOfWeek(date, { locale: ptBR })
      const weekKey = format(weekStart, 'yyyy-MM-dd')
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = 0
      }
      
      weeklyData[weekKey] += 1
    })
    
    // Converte para array para o gráfico
    return Object.entries(weeklyData).map(([weekKey, count]) => ({
      week: format(new Date(weekKey), 'dd/MM'),
      count,
    }))
  }, [filteredData])
  
  // Dados para gráfico de tipos de treino
  const workoutTypes = useMemo(() => {
    const typeCount: Record<string, number> = {}
    
    filteredData.forEach(item => {
      if (!item.workout) return
      
      const workoutName = item.workout.name
      
      if (!typeCount[workoutName]) {
        typeCount[workoutName] = 0
      }
      
      typeCount[workoutName] += 1
    })
    
    return Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5) // Top 5 treinos
  }, [filteredData])
  
  // Cores para o gráfico de pizza
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
  
  if (workoutHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sem dados suficientes</CardTitle>
          <CardDescription>
            Você precisa completar alguns treinos para visualizar estatísticas e relatórios.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Visualização de dados</h3>
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Gráfico de treinos por dia da semana */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Treinos por dia da semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workoutsByWeekday}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value} treinos`, 'Quantidade']}
                    labelFormatter={(value) => `${value}`}
                  />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Gráfico de duração média por tipo de treino */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Duração média por treino (minutos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={workoutDurationByType}
                  layout="vertical"
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }} 
                    width={100}
                    tickFormatter={(value) => 
                      value.length > 10 ? `${value.substring(0, 10)}...` : value
                    }
                  />
                  <Tooltip 
                    formatter={(value) => [`${value} minutos`, 'Duração média']}
                  />
                  <Bar dataKey="averageDuration" fill="#22C55E" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Gráfico de frequência de treinos */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Frequência de treinos (por semana)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={workoutFrequency}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => [`${value} treinos`, 'Quantidade']}
                    labelFormatter={(value) => `Semana: ${value}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="count" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Gráfico de tipos de treino (pizza) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tipos de treino mais frequentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex items-center justify-center">
              {workoutTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workoutTypes}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {workoutTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} treinos`, 'Quantidade']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-muted-foreground">
                  Dados insuficientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Resumo de estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo de atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
              <span className="text-2xl font-bold">{filteredData.length}</span>
              <span className="text-sm text-muted-foreground">Total de treinos</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
              <span className="text-2xl font-bold">
                {formatDuration(
                  filteredData.reduce((acc, item) => acc + (item.duration || 0), 0)
                )}
              </span>
              <span className="text-sm text-muted-foreground">Tempo total</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
              <span className="text-2xl font-bold">
                {workoutTypes.length > 0 ? workoutTypes[0].name : 'N/A'}
              </span>
              <span className="text-sm text-muted-foreground">Treino preferido</span>
            </div>
            <div className="flex flex-col items-center justify-center p-4 bg-muted rounded-lg">
              <span className="text-2xl font-bold">
                {Math.round(
                  filteredData.reduce((acc, item) => acc + (item.duration || 0), 0) / 
                  Math.max(filteredData.length, 1) / 
                  60
                )}min
              </span>
              <span className="text-sm text-muted-foreground">Duração média</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 