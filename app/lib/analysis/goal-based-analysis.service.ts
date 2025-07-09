/**
 * SERVIÇO DE ANÁLISE BASEADA EM OBJETIVOS
 * 
 * Este serviço é responsável por:
 * - Analisar adequação do treino atual ao objetivo do usuário
 * - Sugerir ajustes específicos para otimizar resultados
 * - Personalizar recomendações baseadas no nível e preferências
 * - Calcular scores de alinhamento e eficácia
 */

import { supabase } from '@/app/lib/supabase'
import { 
  FitnessGoal,
  GoalBasedAnalysis,
  GoalRecommendation,
  UserAnalysisProfile,
  Workout,
  WorkoutExercise
} from '@/app/types/recommendations.types'

// ===== INTERFACES INTERNAS =====
interface GoalParameters {
  optimalRepsRange: [number, number]
  optimalSetsRange: [number, number]
  optimalRestTime: [number, number] // segundos
  preferredExerciseTypes: ('compound' | 'isolation')[]
  weeklyFrequency: [number, number]
  volumeMultiplier: number
  intensityLevel: 'low' | 'medium' | 'high'
  progressionStrategy: 'volume' | 'intensity' | 'frequency' | 'mixed'
}

interface ExerciseAnalysis {
  exercise: WorkoutExercise
  alignmentScore: number // 0-1
  suggestions: GoalRecommendation[]
  isOptimal: boolean
  reasonsForChange: string[]
}

interface WorkoutAnalysisResult {
  workout: Workout
  overallAlignment: number // 0-1
  exerciseAnalyses: ExerciseAnalysis[]
  recommendedChanges: GoalRecommendation[]
  priorityAreas: string[]
}

// ===== CLASSE PRINCIPAL =====
export class GoalBasedAnalysisService {
  
  // Parâmetros otimizados por objetivo
  private static goalParameters: Record<FitnessGoal, GoalParameters> = {
    'muscle_gain': {
      optimalRepsRange: [8, 12],
      optimalSetsRange: [3, 5],
      optimalRestTime: [120, 180],
      preferredExerciseTypes: ['compound', 'isolation'],
      weeklyFrequency: [3, 5],
      volumeMultiplier: 1.2,
      intensityLevel: 'medium',
      progressionStrategy: 'volume'
    },
    'strength_gain': {
      optimalRepsRange: [3, 6],
      optimalSetsRange: [3, 6],
      optimalRestTime: [180, 300],
      preferredExerciseTypes: ['compound'],
      weeklyFrequency: [3, 4],
      volumeMultiplier: 0.8,
      intensityLevel: 'high',
      progressionStrategy: 'intensity'
    },
    'fat_loss': {
      optimalRepsRange: [12, 20],
      optimalSetsRange: [2, 4],
      optimalRestTime: [45, 90],
      preferredExerciseTypes: ['compound', 'isolation'],
      weeklyFrequency: [4, 6],
      volumeMultiplier: 1.0,
      intensityLevel: 'medium',
      progressionStrategy: 'frequency'
    },
    'endurance': {
      optimalRepsRange: [15, 25],
      optimalSetsRange: [2, 4],
      optimalRestTime: [30, 60],
      preferredExerciseTypes: ['compound'],
      weeklyFrequency: [4, 6],
      volumeMultiplier: 1.1,
      intensityLevel: 'low',
      progressionStrategy: 'volume'
    },
    'functional_fitness': {
      optimalRepsRange: [8, 15],
      optimalSetsRange: [2, 4],
      optimalRestTime: [60, 120],
      preferredExerciseTypes: ['compound'],
      weeklyFrequency: [3, 5],
      volumeMultiplier: 1.0,
      intensityLevel: 'medium',
      progressionStrategy: 'mixed'
    },
    'rehabilitation': {
      optimalRepsRange: [12, 20],
      optimalSetsRange: [2, 3],
      optimalRestTime: [90, 150],
      preferredExerciseTypes: ['isolation'],
      weeklyFrequency: [2, 4],
      volumeMultiplier: 0.7,
      intensityLevel: 'low',
      progressionStrategy: 'volume'
    },
    'maintenance': {
      optimalRepsRange: [8, 15],
      optimalSetsRange: [2, 4],
      optimalRestTime: [60, 120],
      preferredExerciseTypes: ['compound', 'isolation'],
      weeklyFrequency: [2, 4],
      volumeMultiplier: 0.9,
      intensityLevel: 'medium',
      progressionStrategy: 'mixed'
    }
  }
  
  /**
   * Análise completa baseada em objetivo
   */
  static async analyzeGoalAlignment(
    workouts: Workout[],
    userProfile: UserAnalysisProfile
  ): Promise<GoalBasedAnalysis> {
    try {
      const goal = userProfile.primary_goal
      const goalParams = this.goalParameters[goal]
      
      // 1. Analisar cada treino individualmente
      const workoutAnalyses: WorkoutAnalysisResult[] = []
      
      for (const workout of workouts) {
        const analysis = await this.analyzeWorkoutForGoal(workout, goal, userProfile)
        workoutAnalyses.push(analysis)
      }
      
      // 2. Calcular alinhamento geral
      const overallAlignment = this.calculateOverallAlignment(workoutAnalyses)
      
      // 3. Gerar ajustes recomendados
      const recommendedChanges = this.generateRecommendedChanges(
        workoutAnalyses,
        goalParams,
        userProfile
      )
      
      // 4. Identificar grupos musculares prioritários
      const priorityMuscleGroups = this.identifyPriorityMuscleGroups(goal, workouts)
      const avoidMuscleGroups = this.identifyAvoidMuscleGroups(goal, userProfile)
      
      // 5. Compilar resultado final
      return {
        goal,
        current_workout_alignment: overallAlignment,
        recommended_changes: recommendedChanges,
        priority_muscle_groups: priorityMuscleGroups,
        avoid_muscle_groups: avoidMuscleGroups,
        recommendations: this.consolidateRecommendations(workoutAnalyses)
      }
      
    } catch (error) {
      console.error('Erro na análise baseada em objetivo:', error)
      throw new Error('Falha ao analisar alinhamento com objetivo')
    }
  }
  
  /**
   * Analisar um treino específico para um objetivo
   */
  private static async analyzeWorkoutForGoal(
    workout: Workout,
    goal: FitnessGoal,
    userProfile: UserAnalysisProfile
  ): Promise<WorkoutAnalysisResult> {
    const goalParams = this.goalParameters[goal]
    const exerciseAnalyses: ExerciseAnalysis[] = []
    
    // Analisar cada exercício
    for (const exercise of workout.exercises) {
      const analysis = this.analyzeExerciseForGoal(exercise, goalParams, userProfile)
      exerciseAnalyses.push(analysis)
    }
    
    // Calcular alinhamento geral do treino
    const overallAlignment = exerciseAnalyses.reduce(
      (sum, analysis) => sum + analysis.alignmentScore, 0
    ) / exerciseAnalyses.length
    
    // Gerar recomendações para o treino
    const recommendedChanges = this.generateWorkoutRecommendations(
      workout,
      exerciseAnalyses,
      goalParams,
      userProfile
    )
    
    // Identificar áreas prioritárias
    const priorityAreas = this.identifyWorkoutPriorityAreas(exerciseAnalyses, goalParams)
    
    return {
      workout,
      overallAlignment,
      exerciseAnalyses,
      recommendedChanges,
      priorityAreas
    }
  }
  
  /**
   * Analisar um exercício específico para um objetivo
   */
  private static analyzeExerciseForGoal(
    exercise: WorkoutExercise,
    goalParams: GoalParameters,
    userProfile: UserAnalysisProfile
  ): ExerciseAnalysis {
    const suggestions: GoalRecommendation[] = []
    const reasonsForChange: string[] = []
    let alignmentScore = 1.0 // Começar com score perfeito
    
    // 1. Analisar repetições
    const currentReps = this.parseRepsRange(exercise.reps)
    const [minReps, maxReps] = goalParams.optimalRepsRange
    
    if (currentReps < minReps || currentReps > maxReps) {
      alignmentScore -= 0.3
      reasonsForChange.push(`Repetições fora da faixa ideal (${minReps}-${maxReps})`)
      
      const suggestedReps = Math.round((minReps + maxReps) / 2)
      suggestions.push({
        type: 'modify_parameters',
        target_exercise_id: exercise.id,
        parameter_changes: {
          reps: `${suggestedReps}`
        },
        reason: `Ajustar para faixa ideal do objetivo`,
        impact_score: 7
      })
    }
    
    // 2. Analisar séries
    const [minSets, maxSets] = goalParams.optimalSetsRange
    
    if (exercise.sets < minSets || exercise.sets > maxSets) {
      alignmentScore -= 0.2
      reasonsForChange.push(`Séries fora da faixa ideal (${minSets}-${maxSets})`)
      
      const suggestedSets = Math.round((minSets + maxSets) / 2)
      suggestions.push({
        type: 'modify_parameters',
        target_exercise_id: exercise.id,
        parameter_changes: {
          sets: suggestedSets
        },
        reason: `Ajustar número de séries para objetivo`,
        impact_score: 6
      })
    }
    
    // 3. Analisar tempo de descanso
    if (exercise.rest_time) {
      const [minRest, maxRest] = goalParams.optimalRestTime
      
      if (exercise.rest_time < minRest || exercise.rest_time > maxRest) {
        alignmentScore -= 0.1
        reasonsForChange.push(`Tempo de descanso não otimizado`)
        
        const suggestedRest = Math.round((minRest + maxRest) / 2)
        suggestions.push({
          type: 'modify_parameters',
          target_exercise_id: exercise.id,
          parameter_changes: {
            rest_time: suggestedRest
          },
          reason: `Otimizar tempo de descanso para objetivo`,
          impact_score: 4
        })
      }
    }
    
    // 4. Analisar tipo de exercício
    const isCompound = this.isCompoundExercise(exercise.exercise.name)
    const exerciseType = isCompound ? 'compound' : 'isolation'
    
    if (!goalParams.preferredExerciseTypes.includes(exerciseType)) {
      alignmentScore -= 0.2
      reasonsForChange.push(`Tipo de exercício não ideal para objetivo`)
      
      // Sugerir modificação se necessário
      suggestions.push({
        type: 'modify_parameters',
        target_exercise_id: exercise.id,
        reason: `Modificar parâmetros do exercício para alinhar com objetivo`,
        impact_score: 8
      })
    }
    
    // 5. Considerar nível do usuário
    if (userProfile.fitness_level === 'beginner' && isCompound && goalParams.intensityLevel === 'high') {
      alignmentScore -= 0.1
      reasonsForChange.push(`Exercício pode ser muito avançado para iniciante`)
    }
    
    const isOptimal = alignmentScore >= 0.8 && reasonsForChange.length === 0
    
    return {
      exercise,
      alignmentScore: Math.max(0, alignmentScore),
      suggestions,
      isOptimal,
      reasonsForChange
    }
  }
  
  /**
   * Gerar recomendações para um treino
   */
  private static generateWorkoutRecommendations(
    workout: Workout,
    exerciseAnalyses: ExerciseAnalysis[],
    goalParams: GoalParameters,
    userProfile: UserAnalysisProfile
  ): GoalRecommendation[] {
    const recommendations: GoalRecommendation[] = []
    
    // Consolidar sugestões de exercícios individuais
    exerciseAnalyses.forEach(analysis => {
      recommendations.push(...analysis.suggestions)
    })
    
    // Analisar estrutura geral do treino
    const totalExercises = workout.exercises.length
    const compoundExercises = workout.exercises.filter(ex => 
      this.isCompoundExercise(ex.exercise.name)
    ).length
    
    // Verificar equilíbrio compound/isolation
    const compoundRatio = compoundExercises / totalExercises
    
    if (goalParams.preferredExerciseTypes.includes('compound') && compoundRatio < 0.5) {
      recommendations.push({
        type: 'add_exercise',
        reason: 'Adicionar mais exercícios compostos para o objetivo',
        impact_score: 7
      })
    }
    
    if (goalParams.preferredExerciseTypes.includes('isolation') && compoundRatio > 0.7) {
      recommendations.push({
        type: 'add_exercise',
        reason: 'Adicionar exercícios de isolamento para complementar',
        impact_score: 6
      })
    }
    
    // Verificar duração estimada do treino
    const estimatedDuration = this.estimateWorkoutDuration(workout)
    const maxDuration = userProfile.time_per_session
    
    if (estimatedDuration > maxDuration * 1.2) {
      recommendations.push({
        type: 'remove_exercise',
        reason: 'Reduzir duração do treino para adequar ao tempo disponível',
        impact_score: 5
      })
    }
    
    return recommendations.sort((a, b) => b.impact_score - a.impact_score)
  }
  
  /**
   * Calcular alinhamento geral
   */
  private static calculateOverallAlignment(analyses: WorkoutAnalysisResult[]): number {
    if (analyses.length === 0) return 0
    
    const totalAlignment = analyses.reduce(
      (sum, analysis) => sum + analysis.overallAlignment, 0
    )
    
    return totalAlignment / analyses.length
  }
  
  /**
   * Gerar mudanças recomendadas
   */
  private static generateRecommendedChanges(
    analyses: WorkoutAnalysisResult[],
    goalParams: GoalParameters,
    userProfile: UserAnalysisProfile
  ) {
    // Analisar tendências globais
    const totalExercises = analyses.reduce(
      (sum, analysis) => sum + analysis.workout.exercises.length, 0
    )
    
    const avgAlignment = analyses.reduce(
      (sum, analysis) => sum + analysis.overallAlignment, 0
    ) / analyses.length
    
    // Calcular ajustes necessários baseados no alinhamento
    const volumeAdjustment = avgAlignment < 0.7 ? goalParams.volumeMultiplier - 1 : 0
    const intensityAdjustment = avgAlignment < 0.6 ? 0.2 : 0
    const frequencyAdjustment = avgAlignment < 0.5 ? 0.5 : 0
    
    const restTimeTarget = goalParams.optimalRestTime
    const restTimeAdjustment = (restTimeTarget[0] + restTimeTarget[1]) / 2 / 120 - 1 // normalizado para 120s base
    
    return {
      volume_adjustment: Math.min(0.5, Math.max(-0.5, volumeAdjustment)),
      intensity_adjustment: Math.min(0.5, Math.max(-0.5, intensityAdjustment)),
      frequency_adjustment: Math.min(1, Math.max(-1, frequencyAdjustment)),
      rest_time_adjustment: Math.min(1, Math.max(-1, restTimeAdjustment)),
      exercise_type_preference: goalParams.preferredExerciseTypes[0] || 'compound'
    }
  }
  
  /**
   * Identificar grupos musculares prioritários
   */
  private static identifyPriorityMuscleGroups(goal: FitnessGoal, workouts: Workout[]): string[] {
    const priorities: Record<FitnessGoal, string[]> = {
      'muscle_gain': ['Peito', 'Costas', 'Pernas', 'Ombros'],
      'strength_gain': ['Pernas', 'Costas', 'Peito'],
      'fat_loss': ['Pernas', 'Costas', 'Peito', 'Core'],
      'endurance': ['Pernas', 'Core', 'Costas'],
      'functional_fitness': ['Core', 'Pernas', 'Ombros', 'Costas'],
      'rehabilitation': ['Core', 'Estabilizadores'],
      'maintenance': ['Peito', 'Costas', 'Pernas']
    }
    
    return priorities[goal] || []
  }
  
  /**
   * Identificar grupos musculares a evitar
   */
  private static identifyAvoidMuscleGroups(goal: FitnessGoal, userProfile: UserAnalysisProfile): string[] {
    const avoidList: string[] = []
    
    // Baseado em lesões/limitações
    if (userProfile.injury_history.includes('lombar')) {
      avoidList.push('Lombar')
    }
    
    if (userProfile.injury_history.includes('joelho')) {
      avoidList.push('Quadríceps', 'Isquiotibiais')
    }
    
    if (userProfile.injury_history.includes('ombro')) {
      avoidList.push('Ombros', 'Deltoides')
    }
    
    // Baseado em objetivo
    if (goal === 'rehabilitation') {
      avoidList.push('Exercícios de alta intensidade')
    }
    
    return avoidList
  }
  
  /**
   * Consolidar recomendações
   */
  private static consolidateRecommendations(analyses: WorkoutAnalysisResult[]): GoalRecommendation[] {
    const allRecommendations = analyses.flatMap(analysis => analysis.recommendedChanges)
    
    // Remover duplicatas e ordenar por impacto
    const uniqueRecommendations = this.removeDuplicateRecommendations(allRecommendations)
    
    return uniqueRecommendations
      .sort((a, b) => b.impact_score - a.impact_score)
      .slice(0, 10) // Top 10 recomendações
  }
  
  /**
   * Identificar áreas prioritárias do treino
   */
  private static identifyWorkoutPriorityAreas(
    analyses: ExerciseAnalysis[],
    goalParams: GoalParameters
  ): string[] {
    const areas: string[] = []
    
    const lowAlignmentExercises = analyses.filter(a => a.alignmentScore < 0.6)
    
    if (lowAlignmentExercises.length > 0) {
      areas.push('Ajustar parâmetros de treino')
    }
    
    const needsMoreCompound = analyses.filter(a => 
      !this.isCompoundExercise(a.exercise.exercise.name)
    ).length > analyses.length * 0.7
    
    if (needsMoreCompound && goalParams.preferredExerciseTypes.includes('compound')) {
      areas.push('Adicionar exercícios compostos')
    }
    
    return areas
  }
  
  // ===== MÉTODOS AUXILIARES =====
  
  private static parseRepsRange(repsString: string): number {
    if (!repsString) return 10
    
    const numbers = repsString.match(/\d+/g)
    if (!numbers) return 10
    
    if (numbers.length === 1) {
      return parseInt(numbers[0])
    } else if (numbers.length >= 2) {
      const min = parseInt(numbers[0])
      const max = parseInt(numbers[1])
      return Math.round((min + max) / 2)
    }
    
    return 10
  }
  
  private static isCompoundExercise(exerciseName: string): boolean {
    const compoundKeywords = [
      'agachamento', 'levantamento terra', 'supino', 'desenvolvimento',
      'barra fixa', 'paralelas', 'remada', 'clean', 'snatch', 'thruster',
      'deadlift', 'squat', 'bench press', 'pull up', 'push up'
    ]
    
    return compoundKeywords.some(keyword => 
      exerciseName.toLowerCase().includes(keyword.toLowerCase())
    )
  }
  
  private static estimateWorkoutDuration(workout: Workout): number {
    // Estimativa simples: 3 minutos por série + tempo de descanso
    const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets, 0)
    const avgRestTime = workout.exercises.reduce((sum, ex) => sum + (ex.rest_time || 60), 0) / workout.exercises.length
    
    const exerciseTime = totalSets * 3 // 3 minutos por série
    const restTime = totalSets * (avgRestTime / 60) // converter para minutos
    
    return exerciseTime + restTime
  }
  
  private static removeDuplicateRecommendations(recommendations: GoalRecommendation[]): GoalRecommendation[] {
    const seen = new Set<string>()
    return recommendations.filter(rec => {
      const key = `${rec.type}-${rec.target_exercise_id || 'general'}-${rec.reason}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }
} 