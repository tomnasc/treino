/**
 * SERVIÇO DE PLANEJAMENTO SEMANAL
 * 
 * Versão simplificada para fins de demonstração
 */

import { 
  WeeklyPlan, 
  WeeklyDistribution, 
  WeeklyOptimization,
  UserAnalysisProfile,
  MuscleImbalance,
  GoalBasedAnalysis,
  Workout
} from '@/app/types/recommendations.types'

export class WeeklyPlanningService {
  
  /**
   * Gerar plano semanal otimizado
   */
  static async generateOptimalWeeklyPlan(
    userId: string,
    userWorkouts: Workout[],
    userProfile: UserAnalysisProfile,
    muscleImbalances: MuscleImbalance[],
    goalAnalysis: GoalBasedAnalysis
  ): Promise<WeeklyPlan> {
    
    // Determinar distribuição ideal baseada na frequência
    const distributionType = this.determineOptimalDistribution(userProfile.training_frequency)
    
    // Calcular dias de descanso
    const restDays = this.calculateRestDays(userProfile.training_frequency)
    
    // Gerar treinos diários
    const dailyWorkouts = this.generateDailyWorkouts(distributionType, userProfile)
    
    // Calcular métricas semanais
    const weeklyMetrics = this.calculateWeeklyMetrics(dailyWorkouts, userProfile)
    
    // Gerar sugestões de otimização
    const optimizations = this.generateOptimizations(muscleImbalances, goalAnalysis)
    
    return {
      id: crypto.randomUUID(),
      user_id: userId,
      week_start: new Date().toISOString(),
      distribution_type: distributionType,
      training_days: userProfile.training_frequency,
      rest_days: restDays,
      daily_workouts: dailyWorkouts,
      weekly_metrics: weeklyMetrics,
      optimization_suggestions: optimizations
    }
  }
  
  /**
   * Determinar distribuição ideal
   */
  private static determineOptimalDistribution(trainingDays: number): WeeklyDistribution {
    if (trainingDays <= 3) return 'Full_Body'
    if (trainingDays === 4) return 'Upper_Lower'
    if (trainingDays === 5) return 'Push_Pull_Legs'
    return 'ABCD'
  }
  
  /**
   * Calcular dias de descanso
   */
  private static calculateRestDays(trainingDays: number): number[] {
    const restDays: number[] = []
    
    if (trainingDays <= 3) {
      restDays.push(0, 2, 4, 6) // Dom, Ter, Qui, Sab
    } else if (trainingDays === 4) {
      restDays.push(0, 3, 6) // Dom, Qua, Sab
    } else if (trainingDays === 5) {
      restDays.push(0, 6) // Dom, Sab
    } else {
      restDays.push(0) // Apenas domingo
    }
    
    return restDays
  }
  
  /**
   * Gerar treinos diários
   */
  private static generateDailyWorkouts(
    distributionType: WeeklyDistribution,
    userProfile: UserAnalysisProfile
  ) {
    const dailyWorkouts = []
    
    for (let day = 0; day < 7; day++) {
      const restDays = this.calculateRestDays(userProfile.training_frequency)
      
      if (restDays.includes(day)) {
        continue // Dia de descanso
      }
      
      const workoutType = this.getWorkoutTypeForDay(day, distributionType)
      
      dailyWorkouts.push({
        day: day,
        workout_type: workoutType,
        estimated_duration: userProfile.time_per_session,
        muscle_groups_targeted: this.getMuscleGroupsForWorkout(workoutType),
        intensity_level: 'medium' as const,
        recovery_requirements: ['8h sleep', 'hydration', 'protein']
      })
    }
    
    return dailyWorkouts
  }
  
  /**
   * Determinar tipo de treino por dia
   */
  private static getWorkoutTypeForDay(day: number, distributionType: WeeklyDistribution): string {
    switch (distributionType) {
      case 'Full_Body':
        return 'Full Body'
      case 'Upper_Lower':
        return day % 2 === 1 ? 'Upper' : 'Lower'
      case 'Push_Pull_Legs':
        const cycle = day % 3
        return cycle === 0 ? 'Push' : cycle === 1 ? 'Pull' : 'Legs'
      case 'ABCD':
        const abcd = ['A', 'B', 'C', 'D'][day % 4]
        return `Treino ${abcd}`
      default:
        return 'Full Body'
    }
  }
  
  /**
   * Obter grupos musculares por treino
   */
  private static getMuscleGroupsForWorkout(workoutType: string): string[] {
    switch (workoutType) {
      case 'Full Body':
        return ['Peito', 'Costas', 'Pernas', 'Ombros', 'Braços']
      case 'Upper':
        return ['Peito', 'Costas', 'Ombros', 'Braços']
      case 'Lower':
        return ['Pernas', 'Glúteos', 'Panturrilha']
      case 'Push':
        return ['Peito', 'Ombros', 'Tríceps']
      case 'Pull':
        return ['Costas', 'Bíceps']
      case 'Legs':
        return ['Pernas', 'Glúteos']
      default:
        return ['Peito', 'Costas', 'Pernas']
    }
  }
  
  /**
   * Calcular métricas semanais
   */
  private static calculateWeeklyMetrics(
    dailyWorkouts: any[],
    userProfile: UserAnalysisProfile
  ) {
    const totalVolume = dailyWorkouts.length * 20 // Estimativa de 20 séries por treino
    
    const muscleGroupDistribution: Record<string, number> = {
      'upper': 50,
      'lower': 50
    }
    
    return {
      total_volume: totalVolume,
      muscle_group_distribution: muscleGroupDistribution,
      recovery_adequacy: 0.8,
      goal_alignment: 0.7,
      progression_potential: 0.85
    }
  }
  
  /**
   * Gerar otimizações
   */
  private static generateOptimizations(
    muscleImbalances: MuscleImbalance[],
    goalAnalysis: GoalBasedAnalysis
  ): WeeklyOptimization[] {
    const optimizations: WeeklyOptimization[] = []
    
    // Otimização baseada em desequilíbrios
    if (muscleImbalances.length > 0) {
      optimizations.push({
        type: 'redistribute_volume',
        description: 'Redistribuir volume para corrigir desequilíbrios musculares',
        expected_benefit: 'Melhoria no equilíbrio muscular',
        impact_score: 8,
        implementation_difficulty: 'medium',
        specific_changes: {
          modify_volume: {
            muscle_group: 'Costas',
            volume_change: 20
          }
        }
      })
    }
    
    // Otimização baseada em objetivos
    if (goalAnalysis.current_workout_alignment < 0.7) {
      optimizations.push({
        type: 'adjust_frequency',
        description: 'Ajustar frequência de treino para melhor alinhamento com objetivos',
        expected_benefit: 'Melhoria na eficácia do treino',
        impact_score: 7,
        implementation_difficulty: 'easy',
        specific_changes: {
          adjust_rest: {
            day: 1,
            new_rest_time: 120
          }
        }
      })
    }
    
    return optimizations
  }
} 