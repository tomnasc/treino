/**
 * SERVIÇO DE MÉTRICAS DE PROGRESSO
 * 
 * Este serviço é responsável por:
 * - Rastrear progresso do usuário ao longo do tempo
 * - Medir eficácia das recomendações aplicadas
 * - Calcular métricas de melhoria
 * - Gerar relatórios de evolução
 */

import { supabase } from '@/app/lib/supabase'
import { 
  ProgressMetrics,
  ProgressTracking,
  UserAnalysisProfile,
  MuscleImbalance,
  Workout,
  WorkoutExercise,
  RecommendationAction,
  ActionResult
} from '@/app/types/recommendations.types'

// ===== INTERFACES INTERNAS =====
interface ProgressSnapshot {
  date: string
  metrics: ProgressMetrics['metrics']
  workouts: Workout[]
  muscleImbalances: MuscleImbalance[]
  userProfile: UserAnalysisProfile
}

interface ProgressComparison {
  before: ProgressSnapshot
  after: ProgressSnapshot
  timespan: number // dias
  improvements: {
    metric: string
    change: number
    changePercentage: number
    significance: 'low' | 'medium' | 'high'
  }[]
  regressions: {
    metric: string
    change: number
    changePercentage: number
    reason: string
  }[]
  overallTrend: 'improving' | 'stable' | 'declining'
}

interface RecommendationImpact {
  recommendation_id: string
  recommendation_type: string
  applied_date: string
  impact_metrics: {
    muscle_balance_change: number
    workout_efficiency_change: number
    goal_alignment_change: number
    injury_risk_change: number
    user_satisfaction: number
  }
  success_score: number // 1-10
  follow_up_needed: boolean
  lessons_learned: string[]
}

// ===== CLASSE PRINCIPAL =====
export class ProgressMetricsService {
  
  /**
   * Calcular métricas de progresso atuais
   */
  static async calculateCurrentMetrics(
    userId: string,
    workouts: Workout[],
    muscleImbalances: MuscleImbalance[],
    userProfile: UserAnalysisProfile
  ): Promise<ProgressMetrics> {
    try {
      const metrics = {
        muscle_balance_score: this.calculateMuscleBalanceScore(muscleImbalances),
        workout_efficiency: this.calculateWorkoutEfficiency(workouts, userProfile),
        goal_alignment: this.calculateGoalAlignment(workouts, userProfile),
        injury_risk_score: this.calculateInjuryRiskScore(workouts, muscleImbalances, userProfile),
        progression_rate: await this.calculateProgressionRate(userId, workouts),
        consistency_score: await this.calculateConsistencyScore(userId)
      }
      
      const detailedAnalysis = {
        muscle_group_balance: this.analyzeMuscleGroupBalance(muscleImbalances),
        volume_distribution: this.analyzeVolumeDistribution(workouts),
        strength_progression: await this.analyzeStrengthProgression(userId),
        recommendations_applied: await this.countRecommendationsApplied(userId),
        recommendations_successful: await this.countSuccessfulRecommendations(userId)
      }
      
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        measurement_date: new Date().toISOString(),
        metrics,
        detailed_analysis: detailedAnalysis
      }
      
    } catch (error) {
      console.error('Erro ao calcular métricas de progresso:', error)
      throw new Error('Falha ao calcular métricas de progresso')
    }
  }
  
  /**
   * Salvar métricas no banco de dados
   */
  static async saveProgressMetrics(metrics: ProgressMetrics): Promise<void> {
    const { error } = await supabase
      .from('progress_metrics')
      .insert({
        user_id: metrics.user_id,
        measurement_date: metrics.measurement_date,
        metrics: metrics.metrics,
        detailed_analysis: metrics.detailed_analysis
      })
    
    if (error) {
      console.error('Erro ao salvar métricas:', error)
      throw new Error('Falha ao salvar métricas de progresso')
    }
  }
  
  /**
   * Rastrear impacto de recomendação aplicada
   */
  static async trackRecommendationImpact(
    userId: string,
    recommendationId: string,
    recommendationType: string,
    beforeMetrics: ProgressMetrics['metrics'],
    afterMetrics?: ProgressMetrics['metrics']
  ): Promise<ProgressTracking> {
    try {
      const tracking: ProgressTracking = {
        recommendation_id: recommendationId,
        user_id: userId,
        applied_at: new Date().toISOString(),
        before_metrics: beforeMetrics,
        after_metrics: afterMetrics || {},
        impact_analysis: {
          positive_changes: [],
          negative_changes: [],
          neutral_changes: [],
          overall_impact_score: 0
        },
        follow_up_recommendations: []
      }
      
      if (afterMetrics) {
        tracking.impact_analysis = this.analyzeImpact(beforeMetrics, afterMetrics)
        tracking.follow_up_recommendations = this.generateFollowUpRecommendations(
          recommendationType,
          tracking.impact_analysis
        )
      }
      
      // Salvar no banco
      await this.saveRecommendationTracking(tracking)
      
      return tracking
      
    } catch (error) {
      console.error('Erro ao rastrear impacto da recomendação:', error)
      throw new Error('Falha ao rastrear impacto da recomendação')
    }
  }
  
  /**
   * Gerar relatório de progresso
   */
  static async generateProgressReport(
    userId: string,
    timespan: number = 30 // dias
  ): Promise<{
    summary: ProgressComparison
    trends: Record<string, number[]>
    recommendations: string[]
    achievements: string[]
  }> {
    try {
      const endDate = new Date()
      const startDate = new Date(endDate.getTime() - timespan * 24 * 60 * 60 * 1000)
      
      // Buscar métricas históricas
      const { data: historicalMetrics, error } = await supabase
        .from('progress_metrics')
        .select('*')
        .eq('user_id', userId)
        .gte('measurement_date', startDate.toISOString())
        .order('measurement_date', { ascending: true })
      
      if (error) throw error
      
      if (!historicalMetrics || historicalMetrics.length < 2) {
        throw new Error('Dados insuficientes para gerar relatório de progresso')
      }
      
      // Comparar primeira vs última medição
      const firstMetrics = historicalMetrics[0]
      const lastMetrics = historicalMetrics[historicalMetrics.length - 1]
      
      const summary = this.compareProgress(firstMetrics, lastMetrics, timespan)
      
      // Calcular tendências
      const trends = this.calculateTrends(historicalMetrics)
      
      // Gerar recomendações baseadas no progresso
      const recommendations = this.generateProgressRecommendations(summary, trends)
      
      // Identificar conquistas
      const achievements = this.identifyAchievements(summary, trends)
      
      return {
        summary,
        trends,
        recommendations,
        achievements
      }
      
    } catch (error) {
      console.error('Erro ao gerar relatório de progresso:', error)
      throw new Error('Falha ao gerar relatório de progresso')
    }
  }
  
  /**
   * Calcular score de equilíbrio muscular
   */
  private static calculateMuscleBalanceScore(imbalances: MuscleImbalance[]): number {
    if (imbalances.length === 0) return 100
    
    const severityWeights = { 'low': 1, 'medium': 2, 'high': 3 }
    const totalSeverity = imbalances.reduce(
      (sum, imbalance) => sum + severityWeights[imbalance.severity], 0
    )
    
    // Score máximo seria se todos fossem 'high' (3 points cada)
    const maxPossibleSeverity = imbalances.length * 3
    const balanceScore = Math.max(0, 100 - (totalSeverity / maxPossibleSeverity) * 100)
    
    return Math.round(balanceScore)
  }
  
  /**
   * Calcular eficiência do treino
   */
  private static calculateWorkoutEfficiency(
    workouts: Workout[],
    userProfile: UserAnalysisProfile
  ): number {
    if (workouts.length === 0) return 0
    
    let efficiencyScore = 100
    
    // Analisar duração vs exercícios
    const avgExercisesPerWorkout = workouts.reduce(
      (sum, workout) => sum + workout.exercises.length, 0
    ) / workouts.length
    
    const optimalExercises = userProfile.fitness_level === 'beginner' ? 6 :
                            userProfile.fitness_level === 'intermediate' ? 8 : 10
    
    const exerciseEfficiency = Math.max(0, 100 - Math.abs(avgExercisesPerWorkout - optimalExercises) * 10)
    
    // Analisar variedade
    const uniqueExercises = new Set(
      workouts.flatMap(w => w.exercises.map(e => e.exercise.name))
    ).size
    const totalExerciseSlots = workouts.reduce((sum, w) => sum + w.exercises.length, 0)
    const varietyScore = totalExerciseSlots > 0 ? (uniqueExercises / totalExerciseSlots) * 100 : 0
    
    // Combinar scores
    efficiencyScore = (exerciseEfficiency * 0.6 + varietyScore * 0.4)
    
    return Math.round(Math.max(0, Math.min(100, efficiencyScore)))
  }
  
  /**
   * Calcular alinhamento com objetivo
   */
  private static calculateGoalAlignment(
    workouts: Workout[],
    userProfile: UserAnalysisProfile
  ): number {
    if (workouts.length === 0) return 0
    
    const goal = userProfile.primary_goal
    let alignmentScore = 50 // Base score
    
    // Analisar baseado no objetivo
    const totalVolume = workouts.reduce((sum, workout) => 
      sum + workout.exercises.reduce((exerciseSum, ex) => exerciseSum + ex.sets, 0), 0
    )
    
    const avgVolume = totalVolume / workouts.length
    const frequency = Math.min(workouts.length, 7) // assumindo semanal
    
    switch (goal) {
      case 'muscle_gain':
        if (avgVolume >= 15 && frequency >= 3) alignmentScore += 30
        if (avgVolume >= 20 && frequency >= 4) alignmentScore += 20
        break
        
      case 'strength_gain':
        if (avgVolume >= 10 && frequency >= 3) alignmentScore += 25
        if (avgVolume <= 20) alignmentScore += 25 // não muito volume
        break
        
      case 'fat_loss':
        if (frequency >= 4) alignmentScore += 30
        if (frequency >= 5) alignmentScore += 20
        break
        
      case 'endurance':
        if (frequency >= 4) alignmentScore += 25
        if (avgVolume >= 12) alignmentScore += 25
        break
        
      default:
        alignmentScore = 60
    }
    
    return Math.round(Math.max(0, Math.min(100, alignmentScore)))
  }
  
  /**
   * Calcular score de risco de lesão
   */
  private static calculateInjuryRiskScore(
    workouts: Workout[],
    imbalances: MuscleImbalance[],
    userProfile: UserAnalysisProfile
  ): number {
    let riskScore = 0
    
    // Risco por desequilíbrios severos
    const severeImbalances = imbalances.filter(i => i.severity === 'high').length
    riskScore += severeImbalances * 20
    
    // Risco por volume excessivo
    const totalVolume = workouts.reduce((sum, workout) => 
      sum + workout.exercises.reduce((exerciseSum, ex) => exerciseSum + ex.sets, 0), 0
    )
    const avgVolume = workouts.length > 0 ? totalVolume / workouts.length : 0
    
    const maxSafeVolume = userProfile.fitness_level === 'beginner' ? 15 :
                         userProfile.fitness_level === 'intermediate' ? 25 : 35
    
    if (avgVolume > maxSafeVolume) {
      riskScore += (avgVolume - maxSafeVolume) * 2
    }
    
    // Risco por histórico de lesões
    riskScore += userProfile.injury_history.length * 10
    
    return Math.round(Math.max(0, Math.min(100, riskScore)))
  }
  
  /**
   * Calcular taxa de evolução inteligente (considera tanto progressão quanto regressão apropriada)
   */
  private static async calculateProgressionRate(userId: string, workouts: Workout[]): Promise<number> {
    try {
      // Buscar histórico de execuções com mais contexto
      const { data: history, error } = await supabase
        .from('exercise_history')
        .select(`
          *,
          workout_history!inner (
            user_id,
            workout_date
          ),
          workout_exercise!inner (
            exercise:exercises(name, muscle_group)
          )
        `)
        .eq('workout_history.user_id', userId)
        .gte('workout_history.workout_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('workout_history.workout_date', { ascending: true })
      
      if (error || !history || history.length < 2) return 0
      
      // Calcular evolução inteligente por exercício
      const evolutionScores: number[] = []
      
      // Agrupar por exercício
      const exerciseGroups = history.reduce((groups: Record<string, any[]>, record) => {
        const key = record.workout_exercise_id
        if (!groups[key]) groups[key] = []
        groups[key].push(record)
        return groups
      }, {})
      
      Object.values(exerciseGroups).forEach(records => {
        if (records.length < 3) return // Precisamos de pelo menos 3 pontos para análise
        
        records.sort((a, b) => new Date(a.workout_history.workout_date).getTime() - 
                              new Date(b.workout_history.workout_date).getTime())
        
        // Analisar evolução ao longo do tempo
        const evolutionScore = this.calculateExerciseEvolution(records)
        if (evolutionScore !== null) {
          evolutionScores.push(evolutionScore)
        }
      })
      
      if (evolutionScores.length === 0) return 0
      
      // Calcular score médio ponderado
      const avgEvolution = evolutionScores.reduce((sum, score) => sum + score, 0) / evolutionScores.length
      return Math.round(Math.max(-100, Math.min(100, avgEvolution)))
      
    } catch (error) {
      console.error('Erro ao calcular taxa de evolução:', error)
      return 0
    }
  }

  /**
   * Calcular score de evolução para um exercício específico
   */
  private static calculateExerciseEvolution(records: any[]): number | null {
    if (records.length < 3) return null
    
    // Dividir histórico em segmentos para análise de tendência
    const segments = Math.min(3, Math.floor(records.length / 2))
    const segmentSize = Math.floor(records.length / segments)
    
    let totalEvolutionScore = 0
    let validSegments = 0
    
    for (let i = 0; i < segments - 1; i++) {
      const startIdx = i * segmentSize
      const endIdx = (i + 1) * segmentSize
      const nextEndIdx = Math.min((i + 2) * segmentSize, records.length)
      
      const currentSegment = records.slice(startIdx, endIdx)
      const nextSegment = records.slice(endIdx, nextEndIdx)
      
      if (currentSegment.length === 0 || nextSegment.length === 0) continue
      
      // Calcular métricas médias de cada segmento
      const currentMetrics = this.calculateSegmentMetrics(currentSegment)
      const nextMetrics = this.calculateSegmentMetrics(nextSegment)
      
      if (currentMetrics.weightLoad > 0 && nextMetrics.weightLoad > 0) {
        // Calcular mudança percentual
        const weightChange = ((nextMetrics.weightLoad - currentMetrics.weightLoad) / currentMetrics.weightLoad) * 100
        const completionChange = nextMetrics.completionRate - currentMetrics.completionRate
        
        // Score de evolução baseado em múltiplos fatores
        let segmentScore = 0
        
        // 1. Evolução de carga
        if (weightChange > 5) {
          segmentScore += Math.min(30, weightChange * 3) // Bonificação por aumento significativo
        } else if (weightChange < -5) {
          // Redução pode ser positiva se acompanhada de melhora na execução
          if (completionChange > 10) {
            segmentScore += 15 // Redução inteligente com melhora na execução
          } else {
            segmentScore += Math.max(-15, weightChange) // Penalização menor por redução
          }
        } else {
          segmentScore += 5 // Estabilidade também é positiva
        }
        
        // 2. Evolução na taxa de conclusão
        segmentScore += completionChange * 0.5
        
        // 3. Evolução no volume (peso x repetições)
        const volumeChange = ((nextMetrics.averageVolume - currentMetrics.averageVolume) / currentMetrics.averageVolume) * 100
        segmentScore += Math.min(20, Math.max(-20, volumeChange * 0.3))
        
        totalEvolutionScore += segmentScore
        validSegments++
      }
    }
    
    return validSegments > 0 ? totalEvolutionScore / validSegments : 0
  }

  /**
   * Calcular métricas de um segmento de registros
   */
  private static calculateSegmentMetrics(records: any[]) {
    let totalWeight = 0
    let totalReps = 0
    let totalSets = 0
    let completedSets = 0
    
    records.forEach(record => {
      const weight = parseFloat(record.actual_weight || '0')
      const reps = parseInt(record.actual_reps || '0')
      const sets = parseInt(record.sets_completed || '0')
      
      totalWeight += weight
      totalReps += reps
      totalSets += sets
      if (sets > 0) completedSets += sets
    })
    
    const avgWeight = totalWeight / records.length
    const avgReps = totalReps / records.length
    const completionRate = totalSets > 0 ? (completedSets / totalSets) * 100 : 0
    
    return {
      weightLoad: avgWeight,
      averageReps: avgReps,
      averageVolume: avgWeight * avgReps,
      completionRate: completionRate
    }
  }
  
  /**
   * Calcular score de consistência
   */
  private static async calculateConsistencyScore(userId: string): Promise<number> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      
      const { data: workoutHistory, error } = await supabase
        .from('workout_history')
        .select('workout_date')
        .eq('user_id', userId)
        .gte('workout_date', thirtyDaysAgo.toISOString())
        .order('workout_date', { ascending: true })
      
      if (error || !workoutHistory) return 0
      
      const workoutDays = workoutHistory.length
      const expectedDays = 12 // 3x por semana durante 4 semanas
      
      const consistencyScore = Math.min(100, (workoutDays / expectedDays) * 100)
      
      // Bonus por consistência (treinos distribuídos)
      if (workoutHistory.length >= 8) {
        const dates = workoutHistory.map(w => new Date(w.workout_date))
        const daysBetween = dates.map((date, i) => {
          if (i === 0) return 0
          return (date.getTime() - dates[i - 1].getTime()) / (24 * 60 * 60 * 1000)
        }).slice(1)
        
        const avgDaysBetween = daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length
        
        // Ideal é treinar a cada 2-3 dias
        if (avgDaysBetween >= 2 && avgDaysBetween <= 3) {
          return Math.min(100, consistencyScore + 10)
        }
      }
      
      return Math.round(consistencyScore)
      
    } catch (error) {
      console.error('Erro ao calcular score de consistência:', error)
      return 0
    }
  }
  
  /**
   * Analisar impacto de mudanças
   */
  private static analyzeImpact(
    beforeMetrics: ProgressMetrics['metrics'],
    afterMetrics: ProgressMetrics['metrics']
  ) {
    const positive: string[] = []
    const negative: string[] = []
    const neutral: string[] = []
    let overallScore = 0
    
    const metrics = [
      'muscle_balance_score',
      'workout_efficiency',
      'goal_alignment',
      'injury_risk_score',
      'progression_rate',
      'consistency_score'
    ] as const
    
    metrics.forEach(metric => {
      const before = beforeMetrics[metric]
      const after = afterMetrics[metric]
      const change = after - before
      const changePercent = before > 0 ? (change / before) * 100 : 0
      
      if (metric === 'injury_risk_score') {
        // Para risco de lesão, diminuição é positiva
        if (change < -5) {
          positive.push(`${metric}: reduziu ${Math.abs(change).toFixed(1)} pontos`)
          overallScore += 2
        } else if (change > 5) {
          negative.push(`${metric}: aumentou ${change.toFixed(1)} pontos`)
          overallScore -= 2
        } else {
          neutral.push(`${metric}: manteve-se estável`)
        }
      } else {
        // Para outras métricas, aumento é positivo
        if (change > 5) {
          positive.push(`${metric}: melhorou ${change.toFixed(1)} pontos`)
          overallScore += 2
        } else if (change < -5) {
          negative.push(`${metric}: reduziu ${Math.abs(change).toFixed(1)} pontos`)
          overallScore -= 2
        } else {
          neutral.push(`${metric}: manteve-se estável`)
        }
      }
    })
    
    return {
      positive_changes: positive,
      negative_changes: negative,
      neutral_changes: neutral,
      overall_impact_score: Math.max(-10, Math.min(10, overallScore))
    }
  }
  
  /**
   * Comparar progresso entre dois períodos
   */
  private static compareProgress(
    before: any,
    after: any,
    timespan: number
  ): ProgressComparison {
    const improvements: ProgressComparison['improvements'] = []
    const regressions: ProgressComparison['regressions'] = []
    
    const metrics = Object.keys(before.metrics)
    
    metrics.forEach(metric => {
      const beforeValue = before.metrics[metric]
      const afterValue = after.metrics[metric]
      const change = afterValue - beforeValue
      const changePercentage = beforeValue > 0 ? (change / beforeValue) * 100 : 0
      
      if (Math.abs(change) > 2) { // Mudança significativa
        const significance: 'low' | 'medium' | 'high' = 
          Math.abs(changePercentage) > 20 ? 'high' :
          Math.abs(changePercentage) > 10 ? 'medium' : 'low'
        
        if (change > 0 && metric !== 'injury_risk_score') {
          improvements.push({ metric, change, changePercentage, significance })
        } else if (change < 0 && metric === 'injury_risk_score') {
          improvements.push({ metric, change: Math.abs(change), changePercentage: Math.abs(changePercentage), significance })
        } else {
          regressions.push({ 
            metric, 
            change: Math.abs(change), 
            changePercentage: Math.abs(changePercentage),
            reason: 'Requer investigação adicional'
          })
        }
      }
    })
    
    const overallTrend: 'improving' | 'stable' | 'declining' = 
      improvements.length > regressions.length ? 'improving' :
      improvements.length < regressions.length ? 'declining' : 'stable'
    
    return {
      before: {
        date: before.measurement_date,
        metrics: before.metrics,
        workouts: [],
        muscleImbalances: [],
        userProfile: {} as UserAnalysisProfile
      },
      after: {
        date: after.measurement_date,
        metrics: after.metrics,
        workouts: [],
        muscleImbalances: [],
        userProfile: {} as UserAnalysisProfile
      },
      timespan,
      improvements,
      regressions,
      overallTrend
    }
  }
  
  // ===== MÉTODOS AUXILIARES =====
  
  private static analyzeMuscleGroupBalance(imbalances: MuscleImbalance[]): Record<string, number> {
    const balance: Record<string, number> = {}
    
    imbalances.forEach(imbalance => {
      const score = imbalance.imbalance_type === 'optimal' ? 100 :
                   imbalance.imbalance_type === 'undertrained' ? 30 :
                   imbalance.imbalance_type === 'overtrained' ? 70 : 50
      
      balance[imbalance.muscle_group_name] = score
    })
    
    return balance
  }
  
  private static analyzeVolumeDistribution(workouts: Workout[]): Record<string, number> {
    const distribution: Record<string, number> = {}
    
    workouts.forEach(workout => {
      workout.exercises.forEach(exercise => {
        const muscleGroup = exercise.exercise.muscle_group?.name || 'Unknown'
        distribution[muscleGroup] = (distribution[muscleGroup] || 0) + exercise.sets
      })
    })
    
    return distribution
  }
  
  private static async analyzeStrengthProgression(userId: string): Promise<Record<string, any>> {
    // Implementação simplificada
    return {}
  }
  
  private static async countRecommendationsApplied(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('recommendations_tracking')
      .select('id')
      .eq('user_id', userId)
      .not('after_metrics', 'is', null)
    
    return data?.length || 0
  }
  
  private static async countSuccessfulRecommendations(userId: string): Promise<number> {
    const { data, error } = await supabase
      .from('recommendations_tracking')
      .select('impact_analysis')
      .eq('user_id', userId)
      .not('impact_analysis', 'is', null)
    
    if (!data) return 0
    
    return data.filter(record => {
      const impact = record.impact_analysis as any
      return impact?.overall_impact_score > 0
    }).length
  }
  
  private static calculateTrends(metrics: any[]): Record<string, number[]> {
    const trends: Record<string, number[]> = {}
    
    const metricKeys = Object.keys(metrics[0]?.metrics || {})
    
    metricKeys.forEach(key => {
      trends[key] = metrics.map(m => m.metrics[key])
    })
    
    return trends
  }
  
  private static generateProgressRecommendations(
    comparison: ProgressComparison,
    trends: Record<string, number[]>
  ): string[] {
    const recommendations: string[] = []
    
    if (comparison.overallTrend === 'declining') {
      recommendations.push('Revisar estratégia de treino atual')
      recommendations.push('Considerar redução de volume ou aumento do descanso')
    }
    
    if (comparison.regressions.length > 0) {
      recommendations.push('Focar nas áreas que regrediram')
    }
    
    if (comparison.improvements.length > 0) {
      recommendations.push('Manter estratégias que estão funcionando')
    }
    
    return recommendations
  }
  
  private static identifyAchievements(
    comparison: ProgressComparison,
    trends: Record<string, number[]>
  ): string[] {
    const achievements: string[] = []
    
    comparison.improvements.forEach(improvement => {
      if (improvement.significance === 'high') {
        achievements.push(`Melhoria significativa em ${improvement.metric}`)
      }
    })
    
    return achievements
  }
  
  private static generateFollowUpRecommendations(
    recommendationType: string,
    impact: any
  ): string[] {
    const followUps: string[] = []
    
    if (impact.overall_impact_score > 5) {
      followUps.push('Continuar aplicando recomendações similares')
    } else if (impact.overall_impact_score < 0) {
      followUps.push('Reverter mudanças e tentar abordagem alternativa')
    }
    
    return followUps
  }
  
  private static async saveRecommendationTracking(tracking: ProgressTracking): Promise<void> {
    const { error } = await supabase
      .from('recommendations_tracking')
      .insert({
        user_id: tracking.user_id,
        recommendation_type: 'general',
        recommendation_data: { id: tracking.recommendation_id },
        applied_at: tracking.applied_at,
        before_metrics: tracking.before_metrics,
        after_metrics: tracking.after_metrics,
        impact_analysis: tracking.impact_analysis,
        follow_up_recommendations: tracking.follow_up_recommendations
      })
    
    if (error) {
      console.error('Erro ao salvar tracking:', error)
      throw error
    }
  }
} 