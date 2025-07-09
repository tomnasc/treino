"use client"

import { useState, useEffect } from "react"
import { Loader2, Target, Plus, X, ArrowRightLeft, Check, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Badge } from "@/app/components/ui/badge"
import { Alert, AlertDescription } from "@/app/components/ui/alert"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"

interface Exercise {
  id: string
  name: string
  muscle_group?: {
    id: string
    name: string
  } | null
}

interface WorkoutExercise {
  id: string
  exercise_id: string
  sets: number
  reps: string
  rest_time: number | null
  order_position: number
  exercise: Exercise
}

interface Workout {
  id: string
  name: string
  description: string | null
  exercises: WorkoutExercise[]
}

interface WorkoutRecommendation {
  workout: Workout
  actions: {
    keep: WorkoutExercise[]
    remove: Array<{
      exercise: WorkoutExercise
      reason: string
    }>
    replace: Array<{
      original: WorkoutExercise
      replacement: Exercise
      reason: string
    }>
    add: Array<{
      exercise: Exercise
      sets: number
      reps: string
      rest_time: number
      reason: string
    }>
  }
  priority: 'high' | 'medium' | 'low'
  summary: string
}

interface SimpleWorkoutRecommendationsProps {
  userId: string
}

export function SimpleWorkoutRecommendations({ userId }: SimpleWorkoutRecommendationsProps) {
  const { toast } = useToast()
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [recommendations, setRecommendations] = useState<WorkoutRecommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [muscleImbalances, setMuscleImbalances] = useState<any[]>([])

  useEffect(() => {
    loadWorkouts()
  }, [userId])

  useEffect(() => {
    if (workouts.length > 0) {
      detectMuscleImbalances()
    }
  }, [workouts])

  const loadWorkouts = async () => {
    try {
      setIsLoading(true)
      
      // Carregar treinos do usuário com exercícios
      const { data: workoutsData, error } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          description,
          workout_exercises!inner (
            id,
            exercise_id,
            sets,
            reps,
            rest_time,
            order_position,
            exercise:exercises (
              id,
              name,
              muscle_group:muscle_groups (
                id,
                name
              )
            )
          )
        `)
        .eq('created_by', userId)
        .order('name')

      if (error) throw error

      // Reorganizar os dados
      const processedWorkouts = workoutsData?.map((workout: any) => ({
        id: workout.id,
        name: workout.name,
        description: workout.description,
        exercises: workout.workout_exercises
          .sort((a: any, b: any) => a.order_position - b.order_position)
          .map((we: any) => ({
            id: we.id,
            exercise_id: we.exercise_id,
            sets: we.sets,
            reps: we.reps,
            rest_time: we.rest_time,
            order_position: we.order_position,
            exercise: {
              id: we.exercise.id,
              name: we.exercise.name,
              muscle_group: we.exercise.muscle_group || null
            }
          }))
      })) || []

      setWorkouts(processedWorkouts)
    } catch (error) {
      console.error('Erro ao carregar treinos:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar seus treinos.',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const detectMuscleImbalances = async () => {
    try {
      if (workouts.length === 0) return

      // Analisar desequilíbrios baseado nos treinos carregados
      const muscleGroupCounts: Record<string, number> = {}
      
      // Contar exercícios por grupo muscular
      workouts.forEach(workout => {
        workout.exercises.forEach(exercise => {
          const muscleGroup = exercise.exercise.muscle_group?.name
          if (muscleGroup) {
            muscleGroupCounts[muscleGroup] = (muscleGroupCounts[muscleGroup] || 0) + 1
          }
        })
      })

      // Identificar desequilíbrios
      const imbalances = []
      const totalExercises = Object.values(muscleGroupCounts).reduce((sum, count) => sum + count, 0)
      const averageCount = totalExercises / Object.keys(muscleGroupCounts).length

      for (const [muscleGroup, count] of Object.entries(muscleGroupCounts)) {
        if (count > averageCount * 1.5) {
          imbalances.push({
            muscle_group_name: muscleGroup,
            imbalance_type: 'overtrained',
            exercise_count: count,
            recommended_count: Math.round(averageCount)
          })
        } else if (count < averageCount * 0.5) {
          imbalances.push({
            muscle_group_name: muscleGroup,
            imbalance_type: 'undertrained',
            exercise_count: count,
            recommended_count: Math.round(averageCount)
          })
        }
      }

      // Verificar grupos musculares que não estão presentes
      const commonMuscleGroups = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Glúteos', 'Panturrilhas', 'Abdômen']
      
      commonMuscleGroups.forEach(group => {
        if (!muscleGroupCounts[group]) {
          imbalances.push({
            muscle_group_name: group,
            imbalance_type: 'undertrained',
            exercise_count: 0,
            recommended_count: 2
          })
        }
      })

      setMuscleImbalances(imbalances)
      console.log('✅ Desequilíbrios detectados:', imbalances)
    } catch (error) {
      console.error('Erro ao detectar desequilíbrios:', error)
    }
  }

  const generateRecommendations = async () => {
    try {
      setIsGenerating(true)
      
      console.log('🔍 Iniciando análise dos treinos...')
      console.log('📊 Treinos disponíveis:', workouts.length)
      console.log('⚖️ Desequilíbrios detectados:', muscleImbalances.length)
      
      // Simular análise dos treinos para gerar recomendações
      const newRecommendations: WorkoutRecommendation[] = []
      
      // Analisar treinos
      for (const workout of workouts) {
        console.log(`🏋️ Analisando treino: ${workout.name}`)
        const recommendation = await analyzeWorkout(workout)
        if (recommendation) {
          console.log(`✅ Recomendação gerada para ${workout.name}:`, recommendation)
          newRecommendations.push(recommendation)
        } else {
          console.log(`❌ Nenhuma recomendação gerada para ${workout.name}`)
        }
      }
      
      console.log('🎯 Total de recomendações geradas:', newRecommendations.length)
      setRecommendations(newRecommendations)
      
      toast({
        title: 'Análise concluída!',
        description: `Analisamos ${workouts.length} treinos e geramos ${newRecommendations.length} recomendações específicas.`,
      })
    } catch (error) {
      console.error('❌ Erro ao gerar recomendações:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível analisar seus treinos.',
        variant: 'destructive'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const analyzeWorkout = async (workout: Workout): Promise<WorkoutRecommendation | null> => {
    console.log(`🔍 Analisando treino: ${workout.name}`)
    
    // Análise baseada nos desequilíbrios musculares detectados
    const muscleGroups = workout.exercises.map((ex: any) => ex.exercise.muscle_group?.name).filter(Boolean)
    const muscleGroupCounts = muscleGroups.reduce((acc, group) => {
      if (group) acc[group] = (acc[group] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log(`📊 Grupos musculares no treino ${workout.name}:`, muscleGroupCounts)

    const actions = {
      keep: [] as WorkoutExercise[],
      remove: [] as Array<{ exercise: WorkoutExercise; reason: string }>,
      replace: [] as Array<{ original: WorkoutExercise; replacement: Exercise; reason: string }>,
      add: [] as Array<{ exercise: Exercise; sets: number; reps: string; rest_time: number; reason: string }>
    }

    // Lógica simplificada baseada nos desequilíbrios
    const overtrainedGroups = muscleImbalances
      .filter(imb => imb.imbalance_type === 'overtrained')
      .map(imb => imb.muscle_group_name)
    
    const undertrainedGroups = muscleImbalances
      .filter(imb => imb.imbalance_type === 'undertrained')
      .map(imb => imb.muscle_group_name)

    console.log(`⚖️ Grupos sobretreinados:`, overtrainedGroups)
    console.log(`⚖️ Grupos subtreinados:`, undertrainedGroups)

    for (const exercise of workout.exercises) {
      const muscleGroup = (exercise as any).exercise.muscle_group?.name

      if (overtrainedGroups.includes(muscleGroup)) {
        // Grupo sobretreinado - considerar remoção ou substituição
        if (muscleGroupCounts[muscleGroup!] > 2) {
          actions.remove.push({
            exercise,
            reason: `${muscleGroup} está sobretreinado (${muscleGroupCounts[muscleGroup!]} exercícios)`
          })
        } else {
          actions.keep.push(exercise)
        }
      } else {
        // Manter exercício
        actions.keep.push(exercise)
      }
    }

    // Adicionar exercícios para grupos subtreinados mais comuns
    const priorityUndertrainedGroups = undertrainedGroups.filter(group => 
      ['Tríceps', 'Bíceps', 'Panturrilhas', 'Abdômen'].includes(group)
    )

    for (const undertrainedGroup of priorityUndertrainedGroups) {
      if (!muscleGroups.includes(undertrainedGroup)) {
        // Buscar exercício para este grupo muscular
        const { data: suggestedExercises } = await supabase
          .from('exercises')
          .select(`
            id, 
            name,
            muscle_group:muscle_groups(id, name)
          `)
          .eq('muscle_groups.name', undertrainedGroup)
          .eq('is_public', true)
          .limit(1)

        console.log(`🔍 Exercícios sugeridos para ${undertrainedGroup}:`, suggestedExercises)

        if (suggestedExercises?.[0]) {
          actions.add.push({
            exercise: {
              id: suggestedExercises[0].id,
              name: suggestedExercises[0].name,
              muscle_group: Array.isArray(suggestedExercises[0].muscle_group) 
                ? suggestedExercises[0].muscle_group[0] 
                : suggestedExercises[0].muscle_group
            },
            sets: 3,
            reps: "10-12",
            rest_time: 75,
            reason: `Adicionar ${undertrainedGroup} (grupo subtreinado)`
          })
        }
      }
    }

    // Determinar prioridade
    const totalChanges = actions.remove.length + actions.replace.length + actions.add.length
    let priority: 'high' | 'medium' | 'low' = 'low'
    
    if (totalChanges >= 3) priority = 'high'
    else if (totalChanges >= 1) priority = 'medium'

    console.log(`📈 Total de mudanças para ${workout.name}:`, totalChanges)
    console.log(`⚡ Prioridade:`, priority)

    if (totalChanges === 0) {
      console.log(`✅ Treino ${workout.name} está equilibrado`)
      return null
    }

    return {
      workout,
      actions,
      priority,
      summary: `${totalChanges} ajustes recomendados para melhor equilíbrio muscular`
    }
  }

  const executeRemoveExercise = async (workoutId: string, exerciseData: any) => {
    try {
      console.log('❌ Executando remoção de exercício:', exerciseData)

      // Remover exercício do treino
      const { error } = await supabase
        .from('workout_exercises')
        .delete()
        .eq('id', exerciseData.exercise.id)

      if (error) throw error

      toast({
        title: 'Exercício removido!',
        description: `${exerciseData.exercise.exercise?.name || exerciseData.exercise.name} foi removido do treino.`,
      })

      // Recarregar dados
      await loadWorkouts()
      setRecommendations([]) // Limpar recomendações para re-análise
    } catch (error) {
      console.error('Erro ao remover exercício:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o exercício.',
        variant: 'destructive'
      })
    }
  }

  const executeAddExercise = async (workoutId: string, exerciseData: any) => {
    try {
      console.log('➕ Executando adição de exercício:', exerciseData)

      // Encontrar a próxima posição no treino
      const { data: existingExercises } = await supabase
        .from('workout_exercises')
        .select('order_position')
        .eq('workout_id', workoutId)
        .order('order_position', { ascending: false })
        .limit(1)

      const nextPosition = existingExercises?.[0]?.order_position ? existingExercises[0].order_position + 1 : 1

      // Adicionar exercício ao treino
      const { error } = await supabase
        .from('workout_exercises')
        .insert({
          workout_id: workoutId,
          exercise_id: exerciseData.exercise.id,
          sets: exerciseData.sets,
          reps: exerciseData.reps,
          rest_time: exerciseData.rest_time,
          order_position: nextPosition
        })

      if (error) throw error

      toast({
        title: 'Exercício adicionado!',
        description: `${exerciseData.exercise.name} foi adicionado ao treino.`,
      })

      // Recarregar dados
      await loadWorkouts()
      setRecommendations([]) // Limpar recomendações para re-análise
    } catch (error) {
      console.error('Erro ao adicionar exercício:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o exercício.',
        variant: 'destructive'
      })
    }
  }

  const executeReplaceExercise = async (workoutId: string, replaceData: any) => {
    try {
      // Substituir exercício mantendo a mesma posição
      const { error } = await supabase
        .from('workout_exercises')
        .update({
          exercise_id: replaceData.replacement.id,
        })
        .eq('id', replaceData.original.id)

      if (error) throw error

      toast({
        title: 'Exercício substituído!',
        description: `${replaceData.original.exercise.name} foi substituído por ${replaceData.replacement.name}.`,
      })

      // Recarregar dados
      await loadWorkouts()
      setRecommendations([]) // Limpar recomendações para re-análise
    } catch (error) {
      console.error('Erro ao substituir exercício:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível substituir o exercício.',
        variant: 'destructive'
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (workouts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nenhum treino encontrado</CardTitle>
          <CardDescription>
            Você precisa criar treinos antes de receber recomendações personalizadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.href = '/dashboard/workouts/new'}>
            Criar primeiro treino
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Análise dos Seus Treinos</h2>
          <p className="text-muted-foreground">
            Recomendações específicas para cada treino baseadas em desequilíbrios musculares
          </p>
        </div>
        <Button
          onClick={generateRecommendations}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Target className="h-4 w-4" />
          )}
          {isGenerating ? 'Analisando...' : 'Analisar Treinos'}
        </Button>
      </div>

      {/* Alerta sobre desequilíbrios */}
      {muscleImbalances.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Detectamos {muscleImbalances.length} desequilíbrios musculares nos seus treinos. 
            A análise levará isso em consideração.
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de treinos atuais */}
      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Seus Treinos Atuais</CardTitle>
            <CardDescription>
              {workouts.length} treino(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workouts.map((workout) => (
                <div key={workout.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg text-blue-600">
                    📋 {workout.name}
                  </h3>
                  {workout.description && (
                    <p className="text-sm text-muted-foreground mb-2">
                      {workout.description}
                    </p>
                  )}
                  <div className="space-y-1">
                    {workout.exercises.map((exercise, index) => (
                      <div key={exercise.id} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">{index + 1}.</span>
                        <span>{exercise.exercise.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {exercise.exercise.muscle_group?.name}
                        </Badge>
                        <span className="text-muted-foreground">
                          {exercise.sets}x{exercise.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendações */}
      {recommendations.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xl font-semibold">Recomendações Específicas</h3>
          
          {recommendations.map((rec, index) => (
            <Card key={`${rec.workout.id}-${index}`} className={`border-l-4 ${
              rec.priority === 'high' ? 'border-red-500' : 
              rec.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'
            }`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    📋 {rec.workout.name}
                    <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                      Prioridade {rec.priority}
                    </Badge>
                  </CardTitle>
                </div>
                <CardDescription>{rec.summary}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* Manter exercícios */}
                {rec.actions.keep.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      Manter ({rec.actions.keep.length})
                    </h4>
                    <div className="space-y-1 ml-6">
                      {rec.actions.keep.map((exercise) => (
                        <div key={exercise.id} className="text-sm">
                          ✅ {exercise.exercise.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Remover exercícios */}
                {rec.actions.remove.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-600 mb-2 flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Remover ({rec.actions.remove.length})
                    </h4>
                    <div className="space-y-1 ml-6">
                      {rec.actions.remove.map((item, index) => (
                        <div key={index} className="text-sm">
                          <div>❌ {item.exercise.exercise.name}</div>
                          <div className="text-xs text-muted-foreground ml-4">
                            Motivo: {item.reason}
                          </div>
                                                     <Button
                             size="sm"
                             variant="outline"
                             className="mt-1 ml-4"
                             onClick={() => executeRemoveExercise(rec.workout.id, item)}
                           >
                             Remover Agora
                           </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Substituir exercícios */}
                {rec.actions.replace.length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-600 mb-2 flex items-center gap-2">
                      <ArrowRightLeft className="h-4 w-4" />
                      Substituir ({rec.actions.replace.length})
                    </h4>
                    <div className="space-y-1 ml-6">
                      {rec.actions.replace.map((item, index) => (
                        <div key={index} className="text-sm">
                          <div>🔄 {item.original.exercise.name} → {item.replacement.name}</div>
                          <div className="text-xs text-muted-foreground ml-4">
                            Motivo: {item.reason}
                          </div>
                                                     <Button
                             size="sm"
                             variant="outline"
                             className="mt-1 ml-4"
                             onClick={() => executeReplaceExercise(rec.workout.id, item)}
                           >
                             Substituir Agora
                           </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Adicionar exercícios */}
                {rec.actions.add.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-600 mb-2 flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar ({rec.actions.add.length})
                    </h4>
                    <div className="space-y-1 ml-6">
                      {rec.actions.add.map((item, index) => (
                        <div key={index} className="text-sm">
                          <div>➕ {item.exercise.name} ({item.sets}x{item.reps})</div>
                          <div className="text-xs text-muted-foreground ml-4">
                            Motivo: {item.reason}
                          </div>
                                                     <Button
                             size="sm"
                             variant="outline"
                             className="mt-1 ml-4"
                             onClick={() => executeAddExercise(rec.workout.id, item)}
                           >
                             Adicionar Agora
                           </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
} 