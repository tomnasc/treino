import { supabase } from '@/app/lib/supabase'

export interface RealWorkoutMetrics {
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  timesPerformed: number
  completionRate: number
  avgWeight: number
  latestWeight: number
  progressionTrend: 'progressing' | 'stagnant' | 'regressing'
  difficultyLevel: 'too_easy' | 'adequate' | 'too_hard'
  weightProgression: number[]
  performanceHistory: {
    date: string
    plannedSets: number
    actualSets: number
    plannedReps: string
    actualReps: string
    weight: number
    completionRate: number
  }[]
}

export interface RealProgressAnalysis {
  totalWorkoutsCompleted: number
  consistencyScore: number
  overallCompletionRate: number
  muscleGroupBalance: {
    [muscleGroup: string]: {
      frequency: number
      performance: number
      needsAttention: boolean
    }
  }
  performanceByExercise: RealWorkoutMetrics[]
  recommendations: {
    type: 'reduce_weight' | 'increase_weight' | 'add_volume' | 'reduce_volume' | 'balance_muscles'
    exercise: string
    reason: string
    suggestion: string
    priority: number
  }[]
}

export class RealWorkoutAnalysisService {
  static async analyzeUserRealData(userId: string): Promise<RealProgressAnalysis> {
    // 1. Buscar dados de treinos realizados
    const realWorkoutData = await this.getRealWorkoutData(userId)
    
    // 2. Calcular métricas de performance por exercício
    const exerciseMetrics = await this.calculateExerciseMetrics(userId)
    
    // 3. Analisar equilíbrio entre grupos musculares baseado em performance real
    const muscleGroupBalance = await this.analyzeMuscleGroupBalance(userId)
    
    // 4. Calcular score de consistência
    const consistencyScore = await this.calculateConsistencyScore(userId)
    
    // 5. Gerar recomendações baseadas em dados reais
    const recommendations = this.generateRealDataRecommendations(exerciseMetrics, muscleGroupBalance)
    
    return {
      totalWorkoutsCompleted: realWorkoutData.totalWorkouts,
      consistencyScore,
      overallCompletionRate: realWorkoutData.overallCompletionRate,
      muscleGroupBalance,
      performanceByExercise: exerciseMetrics,
      recommendations
    }
  }

  private static async getRealWorkoutData(userId: string) {
    const { data: workoutStats } = await supabase
      .from('workout_history')
      .select(`
        id,
        completed,
        started_at,
        duration,
        exercise_history(
          sets_completed,
          workout_exercises(sets)
        )
      `)
      .eq('user_id', userId)
      .eq('completed', true)
      .order('started_at', { ascending: false })

    if (!workoutStats?.length) {
      return { totalWorkouts: 0, overallCompletionRate: 0 }
    }

    // Calcular taxa de conclusão geral
    let totalPlannedSets = 0
    let totalCompletedSets = 0

    workoutStats.forEach(workout => {
      workout.exercise_history?.forEach((exercise: any) => {
        totalPlannedSets += exercise.workout_exercises?.sets || 0
        totalCompletedSets += exercise.sets_completed || 0
      })
    })

    return {
      totalWorkouts: workoutStats.length,
      overallCompletionRate: totalPlannedSets > 0 ? totalCompletedSets / totalPlannedSets : 0
    }
  }

  private static async calculateExerciseMetrics(userId: string): Promise<RealWorkoutMetrics[]> {
    // Usar método manual direto - função RPC não está disponível
    return await this.calculateExerciseMetricsManual(userId)
  }

  private static async calculateExerciseMetricsManual(userId: string): Promise<RealWorkoutMetrics[]> {
    const { data: exerciseHistory } = await supabase
      .from('workout_history')
      .select(`
        started_at,
        exercise_history(
          sets_completed,
          actual_reps,
          actual_weight,
          workout_exercises(
            sets,
            reps,
            weight,
            exercises(
              id,
              name,
              muscle_groups(name)
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('completed', true)
      .order('started_at', { ascending: false })

    if (!exerciseHistory?.length) return []

    // Processar dados manualmente
    const exerciseMap = new Map<string, any[]>()

    exerciseHistory.forEach(workout => {
      workout.exercise_history?.forEach((exercise: any) => {
        const exerciseId = exercise.workout_exercises?.exercises?.id
        if (!exerciseId) return

        if (!exerciseMap.has(exerciseId)) {
          exerciseMap.set(exerciseId, [])
        }

        exerciseMap.get(exerciseId)!.push({
          date: workout.started_at,
          plannedSets: exercise.workout_exercises?.sets || 0,
          actualSets: exercise.sets_completed || 0,
          plannedReps: exercise.workout_exercises?.reps || '0',
          actualReps: exercise.actual_reps || '0',
          weight: this.parseWeight(exercise.actual_weight),
          exerciseName: exercise.workout_exercises?.exercises?.name || '',
          muscleGroup: exercise.workout_exercises?.exercises?.muscle_groups?.name || '',
          completionRate: (exercise.sets_completed || 0) / (exercise.workout_exercises?.sets || 1)
        })
      })
    })

    // Converter para métricas
    const metrics: RealWorkoutMetrics[] = []
    
    exerciseMap.forEach((history, exerciseId) => {
      if (history.length === 0) return

      const latestExercise = history[0]
      const weights = history.map(h => h.weight).filter(w => w > 0)
      const completionRates = history.map(h => h.completionRate)
      
      const avgCompletionRate = completionRates.reduce((a, b) => a + b, 0) / completionRates.length
      const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0
      
      metrics.push({
        exerciseId,
        exerciseName: latestExercise.exerciseName,
        muscleGroup: latestExercise.muscleGroup,
        timesPerformed: history.length,
        completionRate: avgCompletionRate,
        avgWeight,
        latestWeight: weights[0] || 0,
        progressionTrend: this.calculateProgressionTrend(weights),
        difficultyLevel: this.calculateDifficultyLevel(avgCompletionRate),
        weightProgression: weights.reverse(),
        performanceHistory: history.slice(0, 10).map(h => ({
          date: h.date,
          plannedSets: h.plannedSets,
          actualSets: h.actualSets,
          plannedReps: h.plannedReps,
          actualReps: h.actualReps,
          weight: h.weight,
          completionRate: h.completionRate
        }))
      })
    })

    return metrics.sort((a, b) => b.timesPerformed - a.timesPerformed)
  }

  private static processExerciseMetrics(exercise: any): RealWorkoutMetrics {
    const weights = exercise.weight_history || []
    const completionRate = exercise.avg_completion_rate || 0

    return {
      exerciseId: exercise.exercise_id,
      exerciseName: exercise.exercise_name,
      muscleGroup: exercise.muscle_group,
      timesPerformed: exercise.times_performed,
      completionRate,
      avgWeight: exercise.avg_weight || 0,
      latestWeight: exercise.latest_weight || 0,
      progressionTrend: this.calculateProgressionTrend(weights),
      difficultyLevel: this.calculateDifficultyLevel(completionRate),
      weightProgression: weights,
      performanceHistory: exercise.performance_history || []
    }
  }

  private static calculateProgressionTrend(weights: number[]): 'progressing' | 'stagnant' | 'regressing' {
    if (weights.length < 2) return 'stagnant'
    
    const recent = weights.slice(-3)
    const earlier = weights.slice(0, Math.max(1, weights.length - 3))
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length
    
    if (recentAvg > earlierAvg * 1.05) return 'progressing'
    if (recentAvg < earlierAvg * 0.95) return 'regressing'
    return 'stagnant'
  }

  private static calculateDifficultyLevel(completionRate: number): 'too_easy' | 'adequate' | 'too_hard' {
    if (completionRate > 0.95) return 'too_easy'
    if (completionRate < 0.70) return 'too_hard'
    return 'adequate'
  }

  private static async analyzeMuscleGroupBalance(userId: string) {
    const { data: muscleGroupData } = await supabase
      .from('workout_history')
      .select(`
        exercise_history(
          sets_completed,
          workout_exercises(
            sets,
            exercises(
              muscle_groups(name)
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('completed', true)

    const muscleGroupStats: { [key: string]: { frequency: number, performance: number, needsAttention: boolean } } = {}

    muscleGroupData?.forEach(workout => {
      workout.exercise_history?.forEach((exercise: any) => {
        const muscleGroup = exercise.workout_exercises?.exercises?.muscle_groups?.name
        if (!muscleGroup) return

        if (!muscleGroupStats[muscleGroup]) {
          muscleGroupStats[muscleGroup] = { frequency: 0, performance: 0, needsAttention: false }
        }

        muscleGroupStats[muscleGroup].frequency += 1
        const completionRate = (exercise.sets_completed || 0) / (exercise.workout_exercises?.sets || 1)
        muscleGroupStats[muscleGroup].performance += completionRate
      })
    })

    // Calcular médias e identificar grupos que precisam de atenção
    Object.keys(muscleGroupStats).forEach(muscleGroup => {
      const stats = muscleGroupStats[muscleGroup]
      stats.performance = stats.performance / stats.frequency
      
      // Identificar grupos com baixa frequência ou performance
      const avgFrequency = Object.values(muscleGroupStats).reduce((sum, s) => sum + s.frequency, 0) / Object.keys(muscleGroupStats).length
      stats.needsAttention = stats.frequency < avgFrequency * 0.7 || stats.performance < 0.75
    })

    return muscleGroupStats
  }

  private static async calculateConsistencyScore(userId: string): Promise<number> {
    const { data: workouts } = await supabase
      .from('workout_history')
      .select('started_at, completed')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(30) // Últimas 30 sessões

    if (!workouts?.length) return 0

    const completedWorkouts = workouts.filter(w => w.completed).length
    return (completedWorkouts / workouts.length) * 100
  }

  private static generateRealDataRecommendations(
    exerciseMetrics: RealWorkoutMetrics[],
    muscleGroupBalance: any
  ) {
    const recommendations: any[] = []

    // Recomendações baseadas na dificuldade dos exercícios
    exerciseMetrics.forEach(exercise => {
      if (exercise.difficultyLevel === 'too_hard') {
        recommendations.push({
          type: 'reduce_weight',
          exercise: exercise.exerciseName,
          reason: `Taxa de conclusão de ${Math.round(exercise.completionRate * 100)}% indica que a carga está muito pesada`,
          suggestion: `Reduzir carga para ${Math.round(exercise.latestWeight * 0.85)}kg e focar na execução correta`,
          priority: 9
        })
      } else if (exercise.difficultyLevel === 'too_easy') {
        recommendations.push({
          type: 'increase_weight',
          exercise: exercise.exerciseName,
          reason: `Taxa de conclusão de ${Math.round(exercise.completionRate * 100)}% indica que pode aumentar a intensidade`,
          suggestion: `Aumentar carga para ${Math.round(exercise.latestWeight * 1.1)}kg ou adicionar mais séries`,
          priority: 7
        })
      }

      // Recomendações baseadas na progressão
      if (exercise.progressionTrend === 'stagnant' && exercise.timesPerformed > 3) {
        recommendations.push({
          type: 'add_volume',
          exercise: exercise.exerciseName,
          reason: 'Exercício está estagnado há várias sessões',
          suggestion: 'Variar o treino: alterar rep range, adicionar técnicas avançadas ou substituir exercício',
          priority: 6
        })
      }
    })

    // Recomendações baseadas no equilíbrio muscular
    Object.entries(muscleGroupBalance).forEach(([muscleGroup, stats]: [string, any]) => {
      if (stats.needsAttention) {
        recommendations.push({
          type: 'balance_muscles',
          exercise: `Exercícios para ${muscleGroup}`,
          reason: `Grupo muscular com baixa frequência (${stats.frequency} vezes) ou performance (${Math.round(stats.performance * 100)}%)`,
          suggestion: `Adicionar mais exercícios específicos para ${muscleGroup} ou revisar técnica de execução`,
          priority: 8
        })
      }
    })

    return recommendations.sort((a, b) => b.priority - a.priority).slice(0, 10)
  }

  private static parseWeight(weightStr: string | null): number {
    if (!weightStr) return 0
    return parseFloat(weightStr.replace(',', '.')) || 0
  }
} 