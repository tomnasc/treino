import { supabase } from '@/app/lib/supabase'

export interface WorkoutAdjustment {
  id: string
  type: 'modify_exercise' | 'add_exercise' | 'remove_exercise' | 'replace_exercise' | 'adjust_parameters'
  priority: 'low' | 'medium' | 'high' | 'critical'
  workout_id: string
  workout_name: string
  target_exercise_id?: string
  target_exercise_name?: string
  replacement_exercise_id?: string
  replacement_exercise_name?: string
  new_exercise_id?: string
  new_exercise_name?: string
  
  // Ajustes de parâmetros
  parameter_changes?: {
    sets?: { current: number; suggested: number; reason: string }
    reps?: { current: string; suggested: string; reason: string }
    weight?: { current: string; suggested: string; reason: string }
    rest_time?: { current: number; suggested: number; reason: string }
  }
  
  reason: string
  detailed_explanation: string
  expected_benefit: string
  source: 'performance_analysis' | 'muscle_imbalance' | 'goal_alignment' | 'progression_stagnation'
  
  // Dados específicos para justificar a sugestão
  analysis_data?: {
    completion_rate?: number
    avg_weight?: number
    progression_trend?: string
    muscle_group_usage?: number
    imbalance_severity?: string
  }
  
  implementation_difficulty: 'easy' | 'moderate' | 'advanced'
  estimated_impact: number // 1-10
  reversible: boolean
  
  created_at: Date
}

export interface WorkoutAdjustmentSummary {
  total_adjustments: number
  by_priority: Record<string, number>
  by_type: Record<string, number>
  by_source: Record<string, number>
  high_impact_count: number
  avg_estimated_impact: number
  workouts_affected: number
}

export class WorkoutAdjustmentService {
  /**
   * Gera sugestões de ajustes para todos os treinos do usuário
   */
  static async generateWorkoutAdjustments(userId: string): Promise<WorkoutAdjustment[]> {
    try {
      console.log('🔧 Iniciando geração de ajustes de treino para usuário:', userId)
      
      // 1. Obter treinos do usuário
      const userWorkouts = await this.getUserWorkouts(userId)
      
      if (userWorkouts.length === 0) {
        console.log('Usuário não possui treinos para ajustar')
        return []
      }

      // 2. Obter dados de análise de performance (usando funções do banco)
      const performanceData = await this.getPerformanceAnalysis(userId)
      const muscleImbalances = await this.getMuscleImbalances(userId)
      const userProfile = await this.getUserProfile(userId)

      // 3. Gerar ajustes
      const adjustments: WorkoutAdjustment[] = []
      
      // Ajustes baseados em análise de performance
      if (performanceData?.total_workouts > 0) {
        const performanceAdjustments = await this.generatePerformanceBasedAdjustments(
          userWorkouts, 
          performanceData,
          userId
        )
        adjustments.push(...performanceAdjustments)
      }

      // Ajustes baseados em desequilíbrios musculares
      if (muscleImbalances?.length > 0) {
        const imbalanceAdjustments = await this.generateImbalanceBasedAdjustments(
          userWorkouts,
          muscleImbalances,
          userId
        )
        adjustments.push(...imbalanceAdjustments)
      }

      // Ajustes baseados em objetivos
      if (userProfile) {
        const goalAdjustments = await this.generateGoalBasedAdjustments(
          userWorkouts,
          userProfile,
          userId
        )
        adjustments.push(...goalAdjustments)
      }

      // 4. Remover duplicatas e ordenar por prioridade
      const uniqueAdjustments = this.removeDuplicateAdjustments(adjustments)
      const sortedAdjustments = this.sortAdjustmentsByPriority(uniqueAdjustments)

      console.log(`✅ Gerados ${sortedAdjustments.length} ajustes de treino`)
      return sortedAdjustments.slice(0, 20) // Limitar a 20 sugestões

    } catch (error) {
      console.error('❌ Erro ao gerar ajustes de treino:', error)
      return []
    }
  }

  /**
   * Obter treinos do usuário com exercícios
   */
  private static async getUserWorkouts(userId: string) {
    const { data, error } = await supabase
      .from('workouts')
      .select(`
        id,
        name,
        description,
        goal_id,
        workout_exercises (
          id,
          exercise_id,
          sets,
          reps,
          weight,
          rest_time,
          order_position,
          exercise_type,
          time,
          exercise:exercises (
            id,
            name,
            muscle_group_id,
            muscle_group:muscle_groups (
              id,
              name
            )
          )
        )
      `)
      .eq('created_by', userId)
      .eq('is_public', false)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Erro ao buscar treinos do usuário:', error)
      return []
    }

    return data || []
  }

  /**
   * Obter análise de performance usando função do banco
   */
  private static async getPerformanceAnalysis(userId: string) {
    try {
      const { data, error } = await supabase
        .rpc('analyze_user_workout_patterns', { p_user_id: userId })
      
      if (error) {
        console.error('Erro na análise de performance:', error)
        return null
      }
      
      return data
    } catch (error) {
      console.error('Erro ao buscar análise de performance:', error)
      return null
    }
  }

  /**
   * Obter desequilíbrios musculares usando função do banco
   */
  private static async getMuscleImbalances(userId: string) {
    try {
      const { data, error } = await supabase
        .rpc('detect_muscle_imbalances', { p_user_id: userId })
      
      if (error) {
        console.error('Erro na detecção de desequilíbrios:', error)
        return []
      }
      
      return data || []
    } catch (error) {
      console.error('Erro ao buscar desequilíbrios musculares:', error)
      return []
    }
  }

  /**
   * Obter perfil do usuário (físico + AI settings)
   */
  private static async getUserProfile(userId: string) {
    try {
      // Buscar perfil físico
      const { data: physicalProfile } = await supabase
        .from('physical_profiles')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Buscar configurações de IA
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select('*, goal:training_goals(*)')
        .eq('user_id', userId)
        .maybeSingle()

      return {
        physical_profile: physicalProfile,
        ai_settings: aiSettings
      }
    } catch (error) {
      console.error('Erro ao buscar perfil do usuário:', error)
      return null
    }
  }

  /**
   * Gerar ajustes baseados na análise de performance granular por série
   */
  private static async generatePerformanceBasedAdjustments(
    workouts: any[],
    performanceData: any,
    userId: string
  ): Promise<WorkoutAdjustment[]> {
    const adjustments: WorkoutAdjustment[] = []

    try {
      console.log('🔍 Iniciando análise granular de performance por série...')
      
      // Buscar histórico de exercícios dos últimos 30 dias com dados detalhados
      const { data: exerciseHistory } = await supabase
        .from('exercise_history')
        .select(`
          id,
          sets_completed,
          actual_reps,
          actual_weight,
          reps_history_json,
          created_at,
          workout_exercise:workout_exercises!inner(
            id,
            sets,
            reps,
            weight,
            rest_time,
            exercise_id,
            workouts!inner(
              id,
              name,
              created_by
            ),
            exercise:exercises(
              id,
              name
            )
          )
        `)
        .eq('workout_exercise.workouts.created_by', userId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50)

      if (!exerciseHistory || exerciseHistory.length === 0) {
        console.log('❌ Nenhum histórico de exercícios encontrado para análise')
        return adjustments
      }

      console.log(`📊 Analisando ${exerciseHistory.length} registros de histórico`)

      // Agrupar por workout_exercise para análise detalhada
      const exerciseAnalysis: Record<string, {
        workoutExercise: any,
        sessions: Array<{
          date: string,
          sets_completed: number,
          planned_sets: number,
          reps_per_set: number[],
          planned_reps_per_set: number,
          weight_used: number,
          planned_weight: number,
          completion_quality: number,
          fatigue_index: number
        }>
      }> = {}

      for (const history of exerciseHistory) {
        const we = Array.isArray(history.workout_exercise) ? history.workout_exercise[0] : history.workout_exercise
        if (!we) continue
        
        const exerciseId = we.id

        if (!exerciseAnalysis[exerciseId]) {
          exerciseAnalysis[exerciseId] = {
            workoutExercise: we,
            sessions: []
          }
        }

        // Analisar detalhadamente cada sessão
        const repsPerSet = Array.isArray(history.reps_history_json) ? history.reps_history_json : []
        const plannedRepsPerSet = parseInt((we.reps || '12').replace(/[^\d]/g, '')) || 12
        const plannedSets = we.sets || 3
        const weightUsed = parseFloat(history.actual_weight) || 0
        const plannedWeight = parseFloat(we.weight) || 0

        // Calcular qualidade da execução da sessão
        let qualityScore = 0
        
        // 1. Proporção de séries completadas (40% do score)
        const setsRatio = Math.min(history.sets_completed / plannedSets, 1)
        qualityScore += setsRatio * 0.4

        // 2. Qualidade das repetições por série (40% do score)
        if (repsPerSet.length > 0) {
          const repsQuality = repsPerSet.reduce((sum, reps) => {
            return sum + Math.min(reps / plannedRepsPerSet, 1)
          }, 0) / repsPerSet.length
          qualityScore += repsQuality * 0.4
        }

        // 3. Consistência entre séries - índice de fadiga (20% do score)
        let fatigueIndex = 0
        if (repsPerSet.length > 1) {
          const firstSet = repsPerSet[0]
          const lastSet = repsPerSet[repsPerSet.length - 1]
          fatigueIndex = Math.max(0, (firstSet - lastSet) / firstSet)
          const consistency = 1 - fatigueIndex
          qualityScore += consistency * 0.2
        } else {
          qualityScore += 0.2 // Bonus se só fez uma série mas completou
        }

        exerciseAnalysis[exerciseId].sessions.push({
          date: history.created_at,
          sets_completed: history.sets_completed,
          planned_sets: plannedSets,
          reps_per_set: repsPerSet,
          planned_reps_per_set: plannedRepsPerSet,
          weight_used: weightUsed,
          planned_weight: plannedWeight,
          completion_quality: qualityScore,
          fatigue_index: fatigueIndex
        })
      }

      // Gerar ajustes baseados na análise granular
      for (const [exerciseId, analysis] of Object.entries(exerciseAnalysis)) {
        if (analysis.sessions.length < 2) continue // Precisa de pelo menos 2 sessões

        const we = analysis.workoutExercise
        const exercise = Array.isArray(we.exercise) ? we.exercise[0] : we.exercise
        const workoutData = Array.isArray(we.workouts) ? we.workouts[0] : we.workouts
        const exerciseName = exercise?.name || 'Exercício'
        const workout = workouts.find(w => w.id === workoutData?.id)
        if (!workout) continue

        // Calcular métricas das sessões recentes (últimas 3)
        const recentSessions = analysis.sessions.slice(0, 3)
        const avgQuality = recentSessions.reduce((sum, s) => sum + s.completion_quality, 0) / recentSessions.length
        const avgSetsCompleted = recentSessions.reduce((sum, s) => sum + s.sets_completed, 0) / recentSessions.length
        const avgFatigue = recentSessions.reduce((sum, s) => sum + s.fatigue_index, 0) / recentSessions.length

        console.log(`🔍 ${exerciseName}: qualidade=${avgQuality.toFixed(2)}, séries=${avgSetsCompleted.toFixed(1)}/${recentSessions[0]?.planned_sets}, fadiga=${avgFatigue.toFixed(2)}`)

        // CASO 1: Exercício muito difícil (baixa qualidade de execução)
        if (avgQuality < 0.6) {
          let suggestion = ''
          let paramChanges: any = {}
          const lastSession = recentSessions[0]

          if (avgSetsCompleted < lastSession.planned_sets * 0.7) {
            // Não consegue completar nem 70% das séries - reduzir número de séries
            const newSets = Math.max(2, Math.floor(lastSession.planned_sets * 0.8))
            suggestion = `Reduzir de ${lastSession.planned_sets} para ${newSets} séries`
            paramChanges.sets = {
              current: lastSession.planned_sets,
              suggested: newSets,
              reason: `Completando apenas ${Math.round(avgSetsCompleted)} séries de ${lastSession.planned_sets} planejadas`
            }
          } else if (lastSession.weight_used > 0) {
            // Completando séries mas com baixa qualidade - reduzir peso
            const newWeight = Math.max(lastSession.weight_used * 0.85, 1)
            suggestion = `Reduzir peso de ${lastSession.weight_used}kg para ${newWeight.toFixed(1)}kg`
            paramChanges.weight = {
              current: lastSession.weight_used.toString(),
              suggested: newWeight.toFixed(1),
              reason: `Muitas repetições incompletas nas séries`
            }
          } else {
            // Exercício de peso corporal - reduzir repetições
            const newReps = Math.max(Math.floor(lastSession.planned_reps_per_set * 0.8), 6)
            suggestion = `Reduzir de ${lastSession.planned_reps_per_set} para ${newReps} repetições`
            paramChanges.reps = {
              current: lastSession.planned_reps_per_set.toString(),
              suggested: newReps.toString(),
              reason: `Não conseguindo completar as repetições planejadas`
            }
          }

          adjustments.push({
            id: `performance-difficult-${exerciseId}`,
            type: 'adjust_parameters',
            priority: avgQuality < 0.4 ? 'high' : 'medium',
            workout_id: workout.id,
            workout_name: workout.name,
            target_exercise_id: exerciseId,
            target_exercise_name: exerciseName,
            parameter_changes: paramChanges,
            reason: `⚠️ Exercício muito difícil`,
            detailed_explanation: `Qualidade de execução baixa (${Math.round(avgQuality * 100)}%). ${suggestion} para melhorar a técnica e reduzir risco de lesão.`,
            expected_benefit: 'Melhor execução técnica, maior volume efetivo e redução do risco de lesão',
            source: 'performance_analysis',
            analysis_data: {
              completion_rate: avgQuality * 100,
              avg_weight: lastSession.weight_used,
              progression_trend: 'struggling'
            },
            implementation_difficulty: 'easy',
            estimated_impact: 8,
            reversible: true,
            created_at: new Date()
          })
        }

        // CASO 2: Exercício muito fácil (execução consistentemente perfeita)
        else if (avgQuality > 0.9 && analysis.sessions.length >= 3) {
          const lastSession = recentSessions[0]
          
          // Verificar se está completando tudo facilmente por múltiplas sessões
          const consistentlyPerfect = recentSessions.every(s => 
            s.sets_completed === s.planned_sets && 
            s.reps_per_set.every(reps => reps >= s.planned_reps_per_set)
          )

          if (consistentlyPerfect) {
            let suggestion = ''
            let paramChanges: any = {}

            if (lastSession.weight_used > 0) {
              // Aumentar peso
              const newWeight = lastSession.weight_used * 1.05
              suggestion = `Aumentar peso de ${lastSession.weight_used}kg para ${newWeight.toFixed(1)}kg`
              paramChanges.weight = {
                current: lastSession.weight_used.toString(),
                suggested: newWeight.toFixed(1),
                reason: `Executando todas as séries e repetições facilmente`
              }
            } else {
              // Exercício de peso corporal - aumentar repetições
              const newReps = Math.min(lastSession.planned_reps_per_set + 2, 20)
              suggestion = `Aumentar de ${lastSession.planned_reps_per_set} para ${newReps} repetições`
              paramChanges.reps = {
                current: lastSession.planned_reps_per_set.toString(),
                suggested: newReps.toString(),
                reason: `Executando todas as repetições sem dificuldade`
              }
            }

            adjustments.push({
              id: `performance-easy-${exerciseId}`,
              type: 'adjust_parameters',
              priority: 'medium',
              workout_id: workout.id,
              workout_name: workout.name,
              target_exercise_id: exerciseId,
              target_exercise_name: exerciseName,
              parameter_changes: paramChanges,
              reason: `📈 Exercício muito fácil`,
              detailed_explanation: `Execução consistentemente perfeita (${Math.round(avgQuality * 100)}%). ${suggestion} para continuar progredindo.`,
              expected_benefit: 'Maior estímulo para crescimento muscular e ganho de força',
              source: 'performance_analysis',
              analysis_data: {
                completion_rate: avgQuality * 100,
                progression_trend: 'ready_for_progression'
              },
              implementation_difficulty: 'easy',
              estimated_impact: 7,
              reversible: true,
              created_at: new Date()
            })
          }
        }

        // CASO 3: Fadiga excessiva entre séries
        if (avgFatigue > 0.25) { // Mais de 25% de queda na última série
          const currentRestTime = we.rest_time || 60
          const newRestTime = Math.min(currentRestTime + 30, 180)

          adjustments.push({
            id: `performance-fatigue-${exerciseId}`,
            type: 'adjust_parameters',
            priority: 'medium',
            workout_id: workout.id,
            workout_name: workout.name,
            target_exercise_id: exerciseId,
            target_exercise_name: exerciseName,
            parameter_changes: {
              rest_time: {
                current: currentRestTime,
                suggested: newRestTime,
                reason: `Queda de ${Math.round(avgFatigue * 100)}% nas repetições entre primeira e última série`
              }
            },
            reason: `😴 Fadiga excessiva entre séries`,
            detailed_explanation: `Observada queda média de ${Math.round(avgFatigue * 100)}% nas repetições da última série. Aumentar tempo de descanso para ${newRestTime}s.`,
            expected_benefit: 'Melhor recuperação entre séries e manutenção da qualidade de execução',
            source: 'performance_analysis',
            analysis_data: {
              avg_weight: recentSessions[0]?.weight_used || 0,
              progression_trend: 'fatigue_pattern'
            },
            implementation_difficulty: 'easy',
            estimated_impact: 6,
            reversible: true,
            created_at: new Date()
          })
        }
      }

      console.log(`✅ Gerados ${adjustments.length} ajustes baseados em análise granular de performance`)
      return adjustments

    } catch (error) {
      console.error('❌ Erro ao gerar ajustes baseados em performance:', error)
      return adjustments
    }
  }

  /**
   * Gerar ajustes baseados em desequilíbrios musculares
   */
  private static async generateImbalanceBasedAdjustments(
    workouts: any[],
    muscleImbalances: any[],
    userId: string
  ): Promise<WorkoutAdjustment[]> {
    const adjustments: WorkoutAdjustment[] = []

    // Buscar exercícios disponíveis para sugestões
    const { data: availableExercises } = await supabase
      .from('exercises')
      .select('*, muscle_group:muscle_groups(*)')
      .eq('is_public', true)

    for (const imbalance of muscleImbalances) {
      const undertrainedMuscle = imbalance.muscle_group
      
      // Encontrar treinos que poderiam beneficiar-se da adição de exercícios para este grupo muscular
      for (const workout of workouts) {
        const hasExerciseForMuscle = workout.workout_exercises.some((we: any) => 
          we.exercise?.muscle_group?.name === undertrainedMuscle
        )

        if (!hasExerciseForMuscle) {
          // Sugerir adição de exercício para grupo muscular sub-treinado
          const suitableExercises = availableExercises?.filter(ex => 
            ex.muscle_group?.name === undertrainedMuscle
          ) || []

          if (suitableExercises.length > 0) {
            const suggestedExercise = suitableExercises[0] // Pegar o primeiro por simplicidade

            adjustments.push({
              id: `add-muscle-${workout.id}-${undertrainedMuscle}`,
              type: 'add_exercise',
              priority: imbalance.imbalance_type === 'grave' ? 'high' : 'medium',
              workout_id: workout.id,
              workout_name: workout.name,
              new_exercise_id: suggestedExercise.id,
              new_exercise_name: suggestedExercise.name,
              reason: `Desequilíbrio muscular detectado - ${undertrainedMuscle} sub-treinado`,
              detailed_explanation: `Foi detectado um desequilíbrio muscular onde ${undertrainedMuscle} está sendo sub-treinado. Adicionar ${suggestedExercise.name} ajudará a equilibrar o desenvolvimento.`,
              expected_benefit: 'Melhor equilíbrio muscular e redução do risco de lesões',
              source: 'muscle_imbalance',
              analysis_data: {
                muscle_group_usage: imbalance.exercise_frequency || 0,
                imbalance_severity: imbalance.imbalance_type || 'medium'
              },
              implementation_difficulty: 'moderate',
              estimated_impact: 8,
              reversible: true,
              created_at: new Date()
            })
          }
        }
      }
    }

    return adjustments
  }

  /**
   * Gerar ajustes baseados nos objetivos do usuário
   */
  private static async generateGoalBasedAdjustments(
    workouts: any[],
    userProfile: any,
    userId: string
  ): Promise<WorkoutAdjustment[]> {
    const adjustments: WorkoutAdjustment[] = []

    if (!userProfile?.ai_settings?.goal) {
      return adjustments
    }

    const goalName = userProfile.ai_settings.goal.name.toLowerCase()

    for (const workout of workouts) {
      // Ajustes baseados no objetivo de ganho de massa
      if (goalName.includes('massa') || goalName.includes('hipertrofia')) {
        for (const workoutExercise of workout.workout_exercises) {
          // Sugerir aumento de tempo de descanso para ganho de massa
          if (workoutExercise.rest_time && workoutExercise.rest_time < 90) {
            adjustments.push({
              id: `increase-rest-${workout.id}-${workoutExercise.id}`,
              type: 'adjust_parameters',
              priority: 'low',
              workout_id: workout.id,
              workout_name: workout.name,
              target_exercise_id: workoutExercise.id,
              target_exercise_name: workoutExercise.exercise.name,
              parameter_changes: {
                rest_time: {
                  current: workoutExercise.rest_time,
                  suggested: 120,
                  reason: 'Objetivo de ganho de massa requer mais descanso para recuperação completa'
                }
              },
              reason: 'Otimizar descanso para ganho de massa',
              detailed_explanation: `Para ganho de massa muscular, é recomendado descanso de 2-3 minutos entre séries para permitir recuperação completa.`,
              expected_benefit: 'Melhor recuperação e maior capacidade de carga',
              source: 'goal_alignment',
              implementation_difficulty: 'easy',
              estimated_impact: 6,
              reversible: true,
              created_at: new Date()
            })
          }
        }
      }

      // Ajustes baseados no objetivo de definição/perda de peso
      if (goalName.includes('definicao') || goalName.includes('perda') || goalName.includes('peso')) {
        for (const workoutExercise of workout.workout_exercises) {
          // Sugerir redução de tempo de descanso para definição
          if (workoutExercise.rest_time && workoutExercise.rest_time > 90) {
            adjustments.push({
              id: `reduce-rest-${workout.id}-${workoutExercise.id}`,
              type: 'adjust_parameters',
              priority: 'low',
              workout_id: workout.id,
              workout_name: workout.name,
              target_exercise_id: workoutExercise.id,
              target_exercise_name: workoutExercise.exercise.name,
              parameter_changes: {
                rest_time: {
                  current: workoutExercise.rest_time,
                  suggested: 60,
                  reason: 'Objetivo de definição beneficia-se de intervalos menores para maior gasto calórico'
                }
              },
              reason: 'Otimizar descanso para definição muscular',
              detailed_explanation: `Para definição muscular, intervalos menores (45-60s) mantêm o metabolismo elevado e aumentam o gasto calórico.`,
              expected_benefit: 'Maior gasto calórico e melhor condicionamento',
              source: 'goal_alignment',
              implementation_difficulty: 'easy',
              estimated_impact: 5,
              reversible: true,
              created_at: new Date()
            })
          }
        }
      }
    }

    return adjustments
  }

  /**
   * Remover ajustes duplicados baseados no ID
   */
  private static removeDuplicateAdjustments(adjustments: WorkoutAdjustment[]): WorkoutAdjustment[] {
    const seen = new Set<string>()
    return adjustments.filter(adj => {
      if (seen.has(adj.id)) {
        return false
      }
      seen.add(adj.id)
      return true
    })
  }

  /**
   * Ordenar ajustes por prioridade e impacto
   */
  private static sortAdjustmentsByPriority(adjustments: WorkoutAdjustment[]): WorkoutAdjustment[] {
    const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    
    return adjustments.sort((a, b) => {
      // Primeiro por prioridade
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Depois por impacto estimado
      return b.estimated_impact - a.estimated_impact
    })
  }

  /**
   * Gerar resumo dos ajustes
   */
  static generateAdjustmentSummary(adjustments: WorkoutAdjustment[]): WorkoutAdjustmentSummary {
    const summary: WorkoutAdjustmentSummary = {
      total_adjustments: adjustments.length,
      by_priority: {},
      by_type: {},
      by_source: {},
      high_impact_count: 0,
      avg_estimated_impact: 0,
      workouts_affected: 0
    }

    const uniqueWorkouts = new Set<string>()

    for (const adj of adjustments) {
      // Contadores por categoria
      summary.by_priority[adj.priority] = (summary.by_priority[adj.priority] || 0) + 1
      summary.by_type[adj.type] = (summary.by_type[adj.type] || 0) + 1
      summary.by_source[adj.source] = (summary.by_source[adj.source] || 0) + 1
      
      // Alto impacto
      if (adj.estimated_impact >= 7) {
        summary.high_impact_count++
      }
      
      // Treinos únicos afetados
      uniqueWorkouts.add(adj.workout_id)
    }

    summary.workouts_affected = uniqueWorkouts.size
    summary.avg_estimated_impact = adjustments.length > 0 
      ? adjustments.reduce((sum, adj) => sum + adj.estimated_impact, 0) / adjustments.length 
      : 0

    return summary
  }

  /**
   * Aplicar um ajuste ao treino (implementação básica)
   */
  static async applyAdjustment(adjustment: WorkoutAdjustment, userId: string): Promise<boolean> {
    try {
      switch (adjustment.type) {
        case 'adjust_parameters':
          return await this.applyParameterAdjustment(adjustment)
        
        case 'add_exercise':
          return await this.applyAddExercise(adjustment, userId)
        
        case 'remove_exercise':
          return await this.applyRemoveExercise(adjustment)
        
        case 'replace_exercise':
          return await this.applyReplaceExercise(adjustment)
        
        default:
          console.warn('Tipo de ajuste não implementado:', adjustment.type)
          return false
      }
    } catch (error) {
      console.error('Erro ao aplicar ajuste:', error)
      return false
    }
  }

  /**
   * Aplicar ajuste de parâmetros
   */
  private static async applyParameterAdjustment(adjustment: WorkoutAdjustment): Promise<boolean> {
    if (!adjustment.target_exercise_id || !adjustment.parameter_changes) {
      return false
    }

    const updateData: any = {}

    if (adjustment.parameter_changes.sets) {
      updateData.sets = adjustment.parameter_changes.sets.suggested
    }
    if (adjustment.parameter_changes.reps) {
      updateData.reps = adjustment.parameter_changes.reps.suggested
    }
    if (adjustment.parameter_changes.weight) {
      updateData.weight = adjustment.parameter_changes.weight.suggested
    }
    if (adjustment.parameter_changes.rest_time) {
      updateData.rest_time = adjustment.parameter_changes.rest_time.suggested
    }

    const { error } = await supabase
      .from('workout_exercises')
      .update(updateData)
      .eq('id', adjustment.target_exercise_id)

    return !error
  }

  /**
   * Aplicar adição de exercício
   */
  private static async applyAddExercise(adjustment: WorkoutAdjustment, userId: string): Promise<boolean> {
    if (!adjustment.new_exercise_id) {
      return false
    }

    // Verificar limite de exercícios para usuários gratuitos
    const { data: canAdd, error: limitError } = await supabase
      .rpc('check_free_user_exercise_limits', {
        workout_id: adjustment.workout_id
      })
      
    if (limitError || canAdd === false) {
      return false
    }

    // Obter a próxima posição
    const { data: maxPosition } = await supabase
      .from('workout_exercises')
      .select('order_position')
      .eq('workout_id', adjustment.workout_id)
      .order('order_position', { ascending: false })
      .limit(1)
      .single()

    const nextPosition = (maxPosition?.order_position || 0) + 1

    const { error } = await supabase
      .from('workout_exercises')
      .insert({
        workout_id: adjustment.workout_id,
        exercise_id: adjustment.new_exercise_id,
        sets: 3,
        reps: '12',
        rest_time: 60,
        order_position: nextPosition,
        exercise_type: 'reps'
      })

    return !error
  }

  /**
   * Aplicar remoção de exercício
   */
  private static async applyRemoveExercise(adjustment: WorkoutAdjustment): Promise<boolean> {
    if (!adjustment.target_exercise_id) {
      return false
    }

    const { error } = await supabase
      .from('workout_exercises')
      .delete()
      .eq('id', adjustment.target_exercise_id)

    return !error
  }

  /**
   * Aplicar substituição de exercício
   */
  private static async applyReplaceExercise(adjustment: WorkoutAdjustment): Promise<boolean> {
    if (!adjustment.target_exercise_id || !adjustment.replacement_exercise_id) {
      return false
    }

    const { error } = await supabase
      .from('workout_exercises')
      .update({
        exercise_id: adjustment.replacement_exercise_id
      })
      .eq('id', adjustment.target_exercise_id)

    return !error
  }
} 