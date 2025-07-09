/**
 * SERVIÇO CENTRAL DE ANÁLISE DE TREINOS
 * 
 * Este serviço é responsável por:
 * - Analisar treinos existentes do usuário
 * - Detectar desequilíbrios musculares
 * - Calcular métricas de performance
 * - Gerar dados para recomendações
 */

import { supabase } from '@/app/lib/supabase'
import { RealWorkoutAnalysisService, RealProgressAnalysis } from './real-workout-analysis.service'

export interface WorkoutAnalysis {
  muscleBalance: {
    score: number
    imbalances: Array<{
      muscle: string
      issue: string
      severity: 'low' | 'medium' | 'high'
      recommendation: string
    }>
  }
  workoutEfficiency: {
    score: number
    issues: string[]
    suggestions: string[]
  }
  goalAlignment: {
    score: number
    misalignments: string[]
    recommendations: string[]
  }
  injuryRisk: {
    score: number
    risks: Array<{
      area: string
      risk: string
      prevention: string
    }>
  }
  progressionRate: {
    score: number
    status: string
    nextSteps: string[]
  }
  consistencyScore: {
    score: number
    pattern: string
    improvements: string[]
  }
  realDataInsights?: {
    hasRealData: boolean
    totalWorkoutsCompleted: number
    overallCompletionRate: number
    topPerformingExercises: string[]
    strugglingExercises: string[]
    realRecommendations: string[]
  }
}

export interface EnhancedRecommendation {
  id: string
  type: 'muscle_balance' | 'efficiency' | 'goal_alignment' | 'injury_prevention' | 'progression' | 'real_data'
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  actionItems: string[]
  expectedBenefit: string
  timeFrame: string
  basedOnRealData: boolean
}

export class WorkoutAnalysisService {
  static async analyzeUserWorkouts(userId: string): Promise<WorkoutAnalysis> {
    try {
      // 1. Buscar dados básicos dos treinos (templates)
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          workout_exercises (
            sets,
            reps,
            exercise_id,
            exercises (
              name,
              muscle_groups (
                name
              )
            )
          )
        `)
        .eq('created_by', userId)

      // 2. Tentar buscar análise baseada em dados reais
      let realDataAnalysis: RealProgressAnalysis | null = null
      try {
        realDataAnalysis = await RealWorkoutAnalysisService.analyzeUserRealData(userId)
      } catch (error) {
        console.log('Real data analysis not available, using template analysis:', error)
      }

      if (!workouts?.length) {
        return this.getEmptyAnalysis()
      }

      // 3. Análise baseada em templates (fallback ou complemento)
      const templateAnalysis = this.analyzeWorkoutTemplates(workouts)
      
      // 4. Combinar análises real + template
      return this.combineAnalyses(templateAnalysis, realDataAnalysis)

    } catch (error) {
      console.error('Error analyzing workouts:', error)
      return this.getEmptyAnalysis()
    }
  }

  private static combineAnalyses(
    templateAnalysis: WorkoutAnalysis, 
    realDataAnalysis: RealProgressAnalysis | null
  ): WorkoutAnalysis {
    if (!realDataAnalysis) {
      return templateAnalysis
    }

    // Priorizar dados reais quando disponíveis
    const realDataInsights = {
      hasRealData: true,
      totalWorkoutsCompleted: realDataAnalysis.totalWorkoutsCompleted,
      overallCompletionRate: realDataAnalysis.overallCompletionRate,
      topPerformingExercises: realDataAnalysis.performanceByExercise
        .filter(e => e.difficultyLevel === 'adequate' || e.difficultyLevel === 'too_easy')
        .slice(0, 3)
        .map(e => e.exerciseName),
      strugglingExercises: realDataAnalysis.performanceByExercise
        .filter(e => e.difficultyLevel === 'too_hard')
        .slice(0, 3)
        .map(e => e.exerciseName),
      realRecommendations: realDataAnalysis.recommendations
        .slice(0, 5)
        .map(r => r.suggestion)
    }

    // Recalcular scores baseados em dados reais
    const enhancedAnalysis: WorkoutAnalysis = {
      muscleBalance: {
        score: this.calculateRealMuscleBalanceScore(realDataAnalysis.muscleGroupBalance),
        imbalances: this.extractRealMuscleImbalances(realDataAnalysis.muscleGroupBalance)
      },
      workoutEfficiency: {
        score: Math.round(realDataAnalysis.overallCompletionRate * 100),
        issues: this.extractEfficiencyIssues(realDataAnalysis),
        suggestions: this.extractEfficiencySuggestions(realDataAnalysis)
      },
      goalAlignment: {
        ...templateAnalysis.goalAlignment, // Manter análise de templates para objetivos
        score: this.adjustGoalAlignmentWithRealData(templateAnalysis.goalAlignment.score, realDataAnalysis)
      },
      injuryRisk: {
        score: this.calculateRealInjuryRiskScore(realDataAnalysis),
        risks: this.extractRealInjuryRisks(realDataAnalysis),
      },
      progressionRate: {
        score: this.calculateRealProgressionScore(realDataAnalysis),
        status: this.getProgressionStatus(realDataAnalysis),
        nextSteps: this.getProgressionNextSteps(realDataAnalysis)
      },
      consistencyScore: {
        score: Math.round(realDataAnalysis.consistencyScore),
        pattern: this.getConsistencyPattern(realDataAnalysis.consistencyScore),
        improvements: this.getConsistencyImprovements(realDataAnalysis.consistencyScore)
      },
      realDataInsights
    }

    return enhancedAnalysis
  }

  private static analyzeWorkoutTemplates(workouts: any[]): WorkoutAnalysis {
    // Análise básica dos templates (como estava antes)
    const muscleGroups = this.extractMuscleGroups(workouts)
    const muscleBalance = this.analyzeMuscleBalance(muscleGroups)
    const workoutEfficiency = this.analyzeWorkoutEfficiency(workouts)
    const goalAlignment = this.analyzeGoalAlignment(workouts)
    const injuryRisk = this.analyzeInjuryRisk(workouts)
    const progressionRate = this.analyzeProgressionRate(workouts)
    const consistencyScore = this.analyzeConsistency(workouts)

    return {
      muscleBalance,
      workoutEfficiency,
      goalAlignment,
      injuryRisk,
      progressionRate,
      consistencyScore,
      realDataInsights: {
        hasRealData: false,
        totalWorkoutsCompleted: 0,
        overallCompletionRate: 0,
        topPerformingExercises: [],
        strugglingExercises: [],
        realRecommendations: []
      }
    }
  }

  // Métodos para análise baseada em dados reais
  private static calculateRealMuscleBalanceScore(muscleGroupBalance: any): number {
    const groups = Object.values(muscleGroupBalance) as any[]
    if (groups.length === 0) return 50

    const needsAttentionCount = groups.filter(g => g.needsAttention).length
    const balanceRatio = 1 - (needsAttentionCount / groups.length)
    
    return Math.round(balanceRatio * 100)
  }

  private static extractRealMuscleImbalances(muscleGroupBalance: any) {
    const imbalances: any[] = []
    
    Object.entries(muscleGroupBalance).forEach(([muscle, stats]: [string, any]) => {
      if (stats.needsAttention) {
        let issue = ''
        let severity: 'low' | 'medium' | 'high' = 'medium'
        
        if (stats.frequency < 2) {
          issue = 'Baixa frequência de treino'
          severity = 'high'
        } else if (stats.performance < 0.6) {
          issue = 'Performance muito baixa nos exercícios'
          severity = 'high'
        } else if (stats.performance < 0.75) {
          issue = 'Performance abaixo do ideal'
          severity = 'medium'
        }

        imbalances.push({
          muscle,
          issue,
          severity,
          recommendation: `Revisar exercícios para ${muscle}: adicionar volume ou ajustar cargas`
        })
      }
    })

    return imbalances
  }

  private static extractEfficiencyIssues(realData: RealProgressAnalysis): string[] {
    const issues: string[] = []
    
    if (realData.overallCompletionRate < 0.7) {
      issues.push('Taxa de conclusão geral baixa (menos de 70%)')
    }
    
    const strugglingExercises = realData.performanceByExercise
      .filter(e => e.difficultyLevel === 'too_hard')
      .length
    
    if (strugglingExercises > 3) {
      issues.push(`${strugglingExercises} exercícios com cargas muito pesadas`)
    }

    const stagnantExercises = realData.performanceByExercise
      .filter(e => e.progressionTrend === 'stagnant')
      .length
    
    if (stagnantExercises > 2) {
      issues.push(`${stagnantExercises} exercícios sem progressão`)
    }

    return issues
  }

  private static extractEfficiencySuggestions(realData: RealProgressAnalysis): string[] {
    return realData.recommendations
      .filter(r => r.type === 'reduce_weight' || r.type === 'increase_weight')
      .slice(0, 3)
      .map(r => r.suggestion)
  }

  private static calculateRealInjuryRiskScore(realData: RealProgressAnalysis): number {
    let riskScore = 100 // Começar com baixo risco

    // Reduzir score baseado em fatores de risco
    const overloadedExercises = realData.performanceByExercise
      .filter(e => e.difficultyLevel === 'too_hard').length
    
    riskScore -= overloadedExercises * 15 // -15 por exercício sobrecarregado

    const regressingExercises = realData.performanceByExercise
      .filter(e => e.progressionTrend === 'regressing').length
    
    riskScore -= regressingExercises * 10 // -10 por exercício em regressão

    if (realData.overallCompletionRate < 0.6) {
      riskScore -= 20 // -20 se conclusão muito baixa
    }

    return Math.max(0, Math.min(100, riskScore))
  }

  private static extractRealInjuryRisks(realData: RealProgressAnalysis) {
    const risks: any[] = []
    
    realData.performanceByExercise
      .filter(e => e.difficultyLevel === 'too_hard')
      .slice(0, 3)
      .forEach(exercise => {
        risks.push({
          area: exercise.muscleGroup,
          risk: `Sobrecarga em ${exercise.exerciseName} (${Math.round(exercise.completionRate * 100)}% conclusão)`,
          prevention: `Reduzir carga para ${Math.round(exercise.latestWeight * 0.85)}kg e focar na técnica`
        })
      })

    return risks
  }

  private static calculateRealProgressionScore(realData: RealProgressAnalysis): number {
    const progressingCount = realData.performanceByExercise
      .filter(e => e.progressionTrend === 'progressing').length
    
    const totalExercises = realData.performanceByExercise.length
    
    if (totalExercises === 0) return 50
    
    const progressionRatio = progressingCount / totalExercises
    return Math.round(progressionRatio * 100)
  }

  private static getProgressionStatus(realData: RealProgressAnalysis): string {
    const score = this.calculateRealProgressionScore(realData)
    
    if (score > 70) return 'Excelente progressão'
    if (score > 50) return 'Progressão moderada'
    if (score > 30) return 'Progressão lenta'
    return 'Sem progressão significativa'
  }

  private static getProgressionNextSteps(realData: RealProgressAnalysis): string[] {
    return realData.recommendations
      .filter(r => r.type === 'add_volume' || r.type === 'increase_weight')
      .slice(0, 3)
      .map(r => r.suggestion)
  }

  private static adjustGoalAlignmentWithRealData(templateScore: number, realData: RealProgressAnalysis): number {
    // Ajustar score baseado na performance real
    if (realData.overallCompletionRate > 0.85) {
      return Math.min(100, templateScore + 10)
    } else if (realData.overallCompletionRate < 0.65) {
      return Math.max(0, templateScore - 15)
    }
    return templateScore
  }

  private static getConsistencyPattern(score: number): string {
    if (score > 90) return 'Muito consistente'
    if (score > 75) return 'Consistente'
    if (score > 60) return 'Moderadamente consistente'
    return 'Inconsistente'
  }

  private static getConsistencyImprovements(score: number): string[] {
    if (score > 85) {
      return ['Manter a consistência atual', 'Focar na qualidade dos treinos']
    } else if (score > 70) {
      return ['Tentar manter uma rotina mais regular', 'Estabelecer horários fixos']
    } else {
      return [
        'Criar um cronograma de treinos mais realista',
        'Começar com frequência menor e aumentar gradualmente',
        'Identificar e remover barreiras para consistência'
      ]
    }
  }

  // Métodos existentes mantidos para análise de templates...
  private static extractMuscleGroups(workouts: any[]) {
    const muscleGroups: { [key: string]: number } = {}
    
    workouts.forEach(workout => {
      workout.workout_exercises?.forEach((we: any) => {
        const muscleName = we.exercises?.muscle_groups?.name
        if (muscleName) {
          muscleGroups[muscleName] = (muscleGroups[muscleName] || 0) + (we.sets || 1)
        }
      })
    })
    
    return muscleGroups
  }

  private static analyzeMuscleBalance(muscleGroups: { [key: string]: number }) {
    const groups = Object.values(muscleGroups)
    if (groups.length === 0) {
      return {
        score: 50,
        imbalances: [{ muscle: 'Geral', issue: 'Nenhum treino encontrado', severity: 'high' as const, recommendation: 'Criar treinos' }]
      }
    }

    const avg = groups.reduce((a, b) => a + b, 0) / groups.length
    const imbalances = Object.entries(muscleGroups)
      .filter(([_, sets]) => sets < avg * 0.6)
      .map(([muscle, sets]) => ({
        muscle,
        issue: `Baixo volume de treino (${sets} séries vs média ${Math.round(avg)})`,
        severity: 'medium' as const,
        recommendation: `Adicionar mais exercícios para ${muscle}`
      }))

    const balanceScore = Math.max(0, 100 - (imbalances.length * 20))
    
    return { score: balanceScore, imbalances }
  }

  private static analyzeWorkoutEfficiency(workouts: any[]) {
    const totalExercises = workouts.reduce((sum, w) => sum + (w.workout_exercises?.length || 0), 0)
    const avgExercisesPerWorkout = totalExercises / workouts.length
    
    const issues: string[] = []
    const suggestions: string[] = []
    
    if (avgExercisesPerWorkout > 10) {
      issues.push('Treinos muito longos')
      suggestions.push('Considerar dividir treinos')
    } else if (avgExercisesPerWorkout < 4) {
      issues.push('Treinos muito curtos')
      suggestions.push('Adicionar mais exercícios')
    }
    
    const score = Math.max(20, Math.min(100, 100 - (issues.length * 20)))
    
    return { score, issues, suggestions }
  }

  private static analyzeGoalAlignment(workouts: any[]) {
    // Análise básica - pode ser melhorada com dados do perfil do usuário
    const score = workouts.length > 0 ? 75 : 0
    const misalignments: string[] = []
    const recommendations: string[] = []
    
    if (workouts.length === 1) {
      misalignments.push('Apenas um tipo de treino')
      recommendations.push('Variar tipos de treino')
    }
    
    return { score, misalignments, recommendations }
  }

  private static analyzeInjuryRisk(workouts: any[]) {
    const score = 85 // Placeholder - seria calculado baseado em fatores reais
    const risks: any[] = []
    
    return { score, risks }
  }

  private static analyzeProgressionRate(workouts: any[]) {
    const score = 70 // Placeholder
    const status = 'Progresso moderado'
    const nextSteps = ['Manter consistência', 'Aumentar gradualmente a intensidade']
    
    return { score, status, nextSteps }
  }

  private static analyzeConsistency(workouts: any[]) {
    const score = workouts.length > 2 ? 80 : 40
    const pattern = workouts.length > 2 ? 'Regular' : 'Irregular'
    const improvements = workouts.length <= 2 ? ['Criar mais treinos', 'Estabelecer rotina'] : ['Manter consistência']
    
    return { score, pattern, improvements }
  }

  private static getEmptyAnalysis(): WorkoutAnalysis {
    return {
      muscleBalance: { score: 0, imbalances: [] },
      workoutEfficiency: { score: 0, issues: ['Nenhum treino encontrado'], suggestions: ['Criar seu primeiro treino'] },
      goalAlignment: { score: 0, misalignments: ['Sem treinos'], recommendations: ['Definir objetivos e criar treinos'] },
      injuryRisk: { score: 100, risks: [] },
      progressionRate: { score: 0, status: 'Sem dados', nextSteps: ['Começar a treinar'] },
      consistencyScore: { score: 0, pattern: 'Sem dados', improvements: ['Criar rotina de treinos'] },
      realDataInsights: {
        hasRealData: false,
        totalWorkoutsCompleted: 0,
        overallCompletionRate: 0,
        topPerformingExercises: [],
        strugglingExercises: [],
        realRecommendations: []
      }
    }
  }

  static async generateEnhancedRecommendations(userId: string): Promise<EnhancedRecommendation[]> {
    const analysis = await this.analyzeUserWorkouts(userId)
    const recommendations: EnhancedRecommendation[] = []

    // Recomendações baseadas em dados reais (prioridade alta)
    if (analysis.realDataInsights?.hasRealData) {
      analysis.realDataInsights.realRecommendations.forEach((rec, index) => {
        recommendations.push({
          id: `real_${index}`,
          type: 'real_data',
          priority: 'high',
          title: 'Baseado na sua performance real',
          description: rec,
          actionItems: [rec],
          expectedBenefit: 'Melhoria na execução e resultados',
          timeFrame: '1-2 semanas',
          basedOnRealData: true
        })
      })
    }

    // Recomendações de equilíbrio muscular
    analysis.muscleBalance.imbalances.forEach((imbalance, index) => {
      recommendations.push({
        id: `balance_${index}`,
        type: 'muscle_balance',
        priority: imbalance.severity === 'high' ? 'high' : 'medium',
        title: `Equilibrar ${imbalance.muscle}`,
        description: imbalance.issue,
        actionItems: [imbalance.recommendation],
        expectedBenefit: 'Melhor equilíbrio muscular e redução de lesões',
        timeFrame: '2-4 semanas',
        basedOnRealData: analysis.realDataInsights?.hasRealData || false
      })
    })

    return recommendations.slice(0, 8) // Máximo 8 recomendações
  }
} 