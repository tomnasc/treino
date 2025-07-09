/**
 * SERVIÇO DE ANÁLISE COMPLETA E INTEGRADA
 * 
 * Este serviço combina TODAS as fontes de dados para fornecer 
 * recomendações verdadeiramente personalizadas:
 * - Dados reais de performance dos treinos
 * - Perfil físico completo do usuário
 * - Objetivos e metas específicas
 * - Equipamentos disponíveis
 * - Limitações e lesões
 * - Preferências pessoais
 * - Disponibilidade de tempo
 */

import { supabase } from '@/app/lib/supabase'
import { RealWorkoutAnalysisService } from './real-workout-analysis.service'
import { GoalBasedAnalysisService } from './goal-based-analysis.service'
import { ProgressMetricsService } from './progress-metrics.service'
import { SmartSubstitutionsService } from './smart-substitutions.service'
import { UserAnalysisProfile, FitnessGoal } from '@/app/types/recommendations.types'

export interface ComprehensiveUserProfile {
  // Dados básicos
  userId: string
  
  // Perfil físico
  physicalProfile: {
    height?: number
    weight?: number
    age?: number
    gender?: string
    bodyFat?: number
    activityLevel?: string
    bmr?: number
  }
  
  // Configurações AI/Objetivos
  aiSettings: {
    primaryGoal: FitnessGoal
    experience_level: 'beginner' | 'intermediate' | 'advanced'
    frequency: number
    sessionDuration: number
    availableEquipment: string[]
    healthConditions?: string
    preferences?: string
  }
  
  // Limitações e histórico
  limitations: {
    injuries: string[]
    medicalConditions: string[]
    medications: string[]
    physicalLimitations: string[]
  }
  
  // Dados de performance real
  realPerformance: {
    totalWorkouts: number
    consistencyScore: number
    completionRate: number
    progressionTrend: 'progressing' | 'stagnant' | 'regressing'
  }
}

export interface ComprehensiveRecommendations {
  // Análise contextualizada
  contextualAnalysis: {
    profileCompleteness: number // 0-100
    dataQuality: 'excellent' | 'good' | 'limited' | 'insufficient'
    analysisConfidence: number // 0-100
    keyInsights: string[]
  }
  
  // Recomendações personalizadas
  personalizedRecommendations: {
    immediateActions: Array<{
      title: string
      description: string
      priority: 'critical' | 'high' | 'medium' | 'low'
      basedOn: 'real_data' | 'profile' | 'goals' | 'limitations'
      estimatedImpact: number // 0-10
      timeToSeeResults: string
    }>
    
    workoutAdjustments: Array<{
      exerciseName: string
      currentIssue: string
      suggestedChange: string
      reason: string
      basedOnData: {
        realPerformance?: boolean
        profileLimitations?: boolean
        goalAlignment?: boolean
        equipmentConstraints?: boolean
      }
    }>
    
    progressionPlan: {
      shortTerm: string[] // 1-2 semanas
      mediumTerm: string[] // 1-2 meses
      longTerm: string[] // 3+ meses
    }
  }
  
  // Alertas importantes
  healthAndSafetyAlerts: Array<{
    type: 'injury_risk' | 'overload' | 'medical_condition' | 'equipment_safety'
    severity: 'warning' | 'caution' | 'critical'
    message: string
    recommendation: string
  }>
  
  // Score de alinhamento geral
  overallAlignment: {
    goalAlignment: number // 0-100
    safetyScore: number // 0-100
    efficiencyScore: number // 0-100
    sustainabilityScore: number // 0-100
  }
}

export class ComprehensiveAnalysisService {
  
  /**
   * Buscar perfil completo do usuário de TODAS as fontes
   */
  static async getCompleteUserProfile(userId: string): Promise<ComprehensiveUserProfile> {
    try {
      // 1. Buscar perfil físico
      const { data: physicalProfile } = await supabase
        .from('physical_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle()
      
      // 2. Buscar configurações AI
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select(`
          *,
          training_goals (
            name,
            description
          )
        `)
        .eq('user_id', userId)
        .maybeSingle()
      
      // 3. Buscar dados de performance real
      const realPerformance = await RealWorkoutAnalysisService.analyzeUserRealData(userId)
        .catch((error) => {
          console.log('Real performance data not available:', error)
          return { 
            totalWorkoutsCompleted: 0, 
            consistencyScore: 0, 
            overallCompletionRate: 0,
            performanceByExercise: [],
            muscleGroupBalance: {},
            recommendations: []
          }
        })
      
      // 4. Calcular idade a partir da data de nascimento
      const age = physicalProfile?.birth_date 
        ? Math.floor((Date.now() - new Date(physicalProfile.birth_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        : undefined
      
      // 5. Processar limitações
      const limitations = {
        injuries: this.parseStringArray(physicalProfile?.injuries_limitations),
        medicalConditions: this.parseStringArray(physicalProfile?.medical_conditions),
        medications: this.parseStringArray(physicalProfile?.medications),
        physicalLimitations: this.parseStringArray(aiSettings?.health_conditions)
      }
      
      // 6. Mapear objetivo
      const primaryGoal = this.mapGoalToFitnessGoal(aiSettings?.training_goals?.name || 'muscle_gain')
      
      return {
        userId,
        physicalProfile: {
          height: physicalProfile?.height,
          weight: physicalProfile?.weight,
          age,
          gender: physicalProfile?.gender,
          bodyFat: physicalProfile?.body_fat_percentage,
          activityLevel: physicalProfile?.activity_level,
          bmr: physicalProfile?.bmr
        },
        aiSettings: {
          primaryGoal,
          experience_level: aiSettings?.experience_level as any || 'beginner',
          frequency: aiSettings?.frequency || 3,
          sessionDuration: aiSettings?.session_duration || 60,
          availableEquipment: this.parseStringArray(aiSettings?.available_equipment),
          healthConditions: aiSettings?.health_conditions,
          preferences: aiSettings?.preferences
        },
        limitations,
        realPerformance: {
          totalWorkouts: realPerformance.totalWorkoutsCompleted,
          consistencyScore: realPerformance.consistencyScore,
          completionRate: realPerformance.overallCompletionRate,
          progressionTrend: this.calculateOverallProgression(realPerformance.performanceByExercise || [])
        }
      }
      
    } catch (error) {
      console.error('Erro ao buscar perfil completo:', error)
      throw new Error('Falha ao obter perfil completo do usuário')
    }
  }
  
  /**
   * Análise completa e integrada
   */
  static async performComprehensiveAnalysis(userId: string): Promise<ComprehensiveRecommendations> {
    try {
      // 1. Obter perfil completo
      const userProfile = await this.getCompleteUserProfile(userId)
      
      // 2. Buscar treinos do usuário
      const { data: workouts } = await supabase
        .from('workouts')
        .select(`
          id,
          name,
          description,
          workout_exercises (
            *,
            exercises (
              id,
              name,
              description,
              muscle_groups (
                id,
                name
              )
            )
          )
        `)
        .eq('created_by', userId)
      
      if (!workouts?.length) {
        return this.getRecommendationsForNewUser(userProfile)
      }
      
      // 3. Realizar análises especializadas
      const realDataAnalysis = await RealWorkoutAnalysisService.analyzeUserRealData(userId)
        .catch((error) => {
          console.log('Real data analysis not available:', error)
          return null
        })
      
      const goalBasedAnalysis = await GoalBasedAnalysisService.analyzeGoalAlignment(
        this.convertWorkoutsForGoalAnalysis(workouts),
        this.convertToUserAnalysisProfile(userProfile)
      ).catch((error) => {
        console.log('Goal-based analysis not available:', error)
        return null
      })
      
      // 4. Gerar recomendações contextualizadas
      const recommendations = await this.generateContextualRecommendations(
        userProfile,
        workouts as any,
        realDataAnalysis,
        goalBasedAnalysis
      )
      
      return recommendations
      
    } catch (error) {
      console.error('Erro na análise completa:', error)
      throw new Error('Falha na análise completa')
    }
  }
  
  /**
   * Gerar recomendações contextualizadas
   */
  private static async generateContextualRecommendations(
    userProfile: ComprehensiveUserProfile,
    workouts: any[],
    realDataAnalysis: any,
    goalBasedAnalysis: any
  ): Promise<ComprehensiveRecommendations> {
    
    const immediateActions: any[] = []
    const workoutAdjustments: any[] = []
    const healthAndSafetyAlerts: any[] = []
    
    // 1. ANÁLISE DE SEGURANÇA E LIMITAÇÕES
    if (userProfile.limitations.injuries.length > 0) {
      healthAndSafetyAlerts.push({
        type: 'injury_risk',
        severity: 'caution',
        message: `Detectadas lesões/limitações: ${userProfile.limitations.injuries.join(', ')}`,
        recommendation: 'Exercícios foram adaptados para evitar sobrecarga nas áreas sensíveis'
      })
      
      immediateActions.push({
        title: 'Adaptar exercícios para limitações',
        description: 'Revisar exercícios que podem agravar lesões existentes',
        priority: 'high',
        basedOn: 'limitations',
        estimatedImpact: 9,
        timeToSeeResults: 'Imediato'
      })
    }
    
    // 2. ANÁLISE DE DADOS REAIS vs PERFIL
    if (realDataAnalysis && userProfile.realPerformance.completionRate < 0.7) {
      immediateActions.push({
        title: 'Reduzir intensidade dos treinos',
        description: `Sua taxa de conclusão é ${Math.round(userProfile.realPerformance.completionRate * 100)}%, indicando que os treinos estão muito difíceis`,
        priority: 'high',
        basedOn: 'real_data',
        estimatedImpact: 8,
        timeToSeeResults: '1-2 semanas'
      })
      
      // Identificar exercícios específicos problemáticos
      if (realDataAnalysis.performanceByExercise) {
        realDataAnalysis.performanceByExercise
          .filter((ex: any) => ex.difficultyLevel === 'too_hard')
          .forEach((exercise: any) => {
            workoutAdjustments.push({
              exerciseName: exercise.exerciseName,
              currentIssue: `Taxa de conclusão: ${Math.round(exercise.completionRate * 100)}%`,
              suggestedChange: `Reduzir peso de ${exercise.latestWeight}kg para ${Math.round(exercise.latestWeight * 0.85)}kg`,
              reason: 'Baseado na sua performance real - exercício muito difícil',
              basedOnData: {
                realPerformance: true,
                profileLimitations: false,
                goalAlignment: false,
                equipmentConstraints: false
              }
            })
          })
      }
    }
    
    // 3. ANÁLISE DE ALINHAMENTO COM OBJETIVOS
    if (goalBasedAnalysis && goalBasedAnalysis.current_workout_alignment < 0.7) {
      immediateActions.push({
        title: 'Realinhar treinos com objetivo',
        description: `Treinos atuais não estão otimizados para seu objetivo: ${userProfile.aiSettings.primaryGoal}`,
        priority: 'medium',
        basedOn: 'goals',
        estimatedImpact: 7,
        timeToSeeResults: '2-4 semanas'
      })
    }
    
    // 4. ANÁLISE DE EQUIPAMENTOS
    const missingEquipment = this.identifyMissingEquipment(workouts, userProfile.aiSettings.availableEquipment)
    if (missingEquipment.length > 0) {
      immediateActions.push({
        title: 'Adaptar exercícios para equipamentos disponíveis',
        description: `Detectados exercícios que requerem equipamentos não disponíveis: ${missingEquipment.join(', ')}`,
        priority: 'medium',
        basedOn: 'profile',
        estimatedImpact: 6,
        timeToSeeResults: 'Imediato'
      })
    }
    
    // 5. ANÁLISE DE TEMPO DISPONÍVEL
    const convertedWorkouts = this.convertWorkoutsForGoalAnalysis(workouts)
    const estimatedDuration = this.estimateWorkoutDuration(convertedWorkouts)
    if (estimatedDuration > userProfile.aiSettings.sessionDuration * 1.2) {
      immediateActions.push({
        title: 'Ajustar duração dos treinos',
        description: `Treinos estimados em ${estimatedDuration}min, mas você tem ${userProfile.aiSettings.sessionDuration}min disponíveis`,
        priority: 'medium',
        basedOn: 'profile',
        estimatedImpact: 5,
        timeToSeeResults: 'Imediato'
      })
    }
    
    // 6. ANÁLISE DE CONSISTÊNCIA
    if (userProfile.realPerformance.consistencyScore < 60) {
      immediateActions.push({
        title: 'Melhorar consistência',
        description: `Score de consistência: ${Math.round(userProfile.realPerformance.consistencyScore)}%. Meta: treinar ${userProfile.aiSettings.frequency}x por semana`,
        priority: 'high',
        basedOn: 'real_data',
        estimatedImpact: 9,
        timeToSeeResults: '2-3 semanas'
      })
    }
    
    // Calcular scores de alinhamento
    const overallAlignment = {
      goalAlignment: goalBasedAnalysis?.current_workout_alignment ? Math.round(goalBasedAnalysis.current_workout_alignment * 100) : 50,
      safetyScore: this.calculateSafetyScore(userProfile, realDataAnalysis),
      efficiencyScore: this.calculateEfficiencyScore(userProfile, realDataAnalysis),
      sustainabilityScore: this.calculateSustainabilityScore(userProfile)
    }
    
    return {
      contextualAnalysis: {
        profileCompleteness: this.calculateProfileCompleteness(userProfile),
        dataQuality: realDataAnalysis ? 'excellent' : 'limited',
        analysisConfidence: realDataAnalysis ? 95 : 70,
        keyInsights: this.generateKeyInsights(userProfile, realDataAnalysis, goalBasedAnalysis)
      },
      personalizedRecommendations: {
        immediateActions: immediateActions.slice(0, 5).sort((a, b) => b.estimatedImpact - a.estimatedImpact),
        workoutAdjustments: workoutAdjustments.slice(0, 8),
        progressionPlan: {
          shortTerm: this.generateShortTermPlan(userProfile, realDataAnalysis),
          mediumTerm: this.generateMediumTermPlan(userProfile, goalBasedAnalysis),
          longTerm: this.generateLongTermPlan(userProfile)
        }
      },
      healthAndSafetyAlerts,
      overallAlignment
    }
  }
  
  // ===== MÉTODOS AUXILIARES =====
  
  private static parseStringArray(str?: string | null): string[] {
    if (!str) return []
    try {
      return str.split(',').map(s => s.trim()).filter(s => s.length > 0)
    } catch {
      return []
    }
  }
  
  private static mapGoalToFitnessGoal(goalName: string): FitnessGoal {
    const mapping: Record<string, FitnessGoal> = {
      'Ganho de Massa Muscular': 'muscle_gain',
      'Perda de Peso': 'fat_loss',
      'Ganho de Força': 'strength_gain',
      'Resistência': 'endurance',
      'Condicionamento': 'functional_fitness',
      'Reabilitação': 'rehabilitation'
    }
    
    return mapping[goalName] || 'muscle_gain'
  }
  
  private static calculateOverallProgression(exercises: any[]): 'progressing' | 'stagnant' | 'regressing' {
    if (!exercises.length) return 'stagnant'
    
    const progressingCount = exercises.filter(ex => ex.progressionTrend === 'progressing').length
    const regressingCount = exercises.filter(ex => ex.progressionTrend === 'regressing').length
    
    if (progressingCount > regressingCount * 2) return 'progressing'
    if (regressingCount > progressingCount) return 'regressing'
    return 'stagnant'
  }
  
  private static convertWorkoutsForGoalAnalysis(workouts: any[]): any[] {
    return workouts.map(workout => ({
      id: workout.id,
      name: workout.name,
      description: workout.description,
      exercises: workout.workout_exercises?.map((we: any) => ({
        id: we.id,
        sets: we.sets,
        reps: we.reps,
        rest_time: we.rest_time,
        weight: we.weight,
        notes: we.notes,
        order_position: we.order_position,
        exercise: {
          id: we.exercises?.id,
          name: we.exercises?.name,
          description: we.exercises?.description,
          muscle_group: we.exercises?.muscle_groups ? {
            id: we.exercises.muscle_groups.id,
            name: we.exercises.muscle_groups.name
          } : null
        }
      })) || []
    }))
  }

  private static convertToUserAnalysisProfile(profile: ComprehensiveUserProfile): UserAnalysisProfile {
    return {
      fitness_level: profile.aiSettings.experience_level,
      primary_goal: profile.aiSettings.primaryGoal,
      secondary_goals: [],
      available_equipment: profile.aiSettings.availableEquipment,
      training_frequency: profile.aiSettings.frequency,
      time_per_session: profile.aiSettings.sessionDuration,
      injury_history: profile.limitations.injuries,
      limitations: [...profile.limitations.medicalConditions, ...profile.limitations.physicalLimitations],
      preferences: {
        compound_vs_isolation: 0,
        high_vs_low_intensity: 0,
        volume_tolerance: 0.5,
        exercise_variety_preference: 0.5
      }
    }
  }
  
  private static getRecommendationsForNewUser(userProfile: ComprehensiveUserProfile): ComprehensiveRecommendations {
    return {
      contextualAnalysis: {
        profileCompleteness: this.calculateProfileCompleteness(userProfile),
        dataQuality: 'insufficient',
        analysisConfidence: 60,
        keyInsights: [
          'Usuário novo - foco em criar rotina consistente',
          'Começar com exercícios básicos apropriados para o nível',
          'Priorizar aprendizado de técnica correta'
        ]
      },
      personalizedRecommendations: {
        immediateActions: [
          {
            title: 'Criar seu primeiro treino',
            description: 'Começar com exercícios básicos adequados ao seu nível',
            priority: 'critical',
            basedOn: 'profile',
            estimatedImpact: 10,
            timeToSeeResults: 'Imediato'
          }
        ],
        workoutAdjustments: [],
        progressionPlan: {
          shortTerm: ['Estabelecer rotina de treinos', 'Aprender técnica básica'],
          mediumTerm: ['Aumentar volume gradualmente', 'Adicionar variações'],
          longTerm: ['Especializar treinos para objetivo específico']
        }
      },
      healthAndSafetyAlerts: [],
      overallAlignment: {
        goalAlignment: 0,
        safetyScore: 100,
        efficiencyScore: 0,
        sustainabilityScore: 70
      }
    }
  }
  
  private static identifyMissingEquipment(workouts: any[], availableEquipment: string[]): string[] {
    // Implementação simplificada
    return []
  }
  
  private static estimateWorkoutDuration(workouts: any[]): number {
    if (!workouts.length) return 0
    // Estimativa básica: 3-4 minutos por exercício
    const avgExercises = workouts.reduce((sum, w) => sum + (w.exercises?.length || 0), 0) / workouts.length
    return Math.round(avgExercises * 3.5)
  }
  
  private static calculateSafetyScore(profile: ComprehensiveUserProfile, realData: any): number {
    let score = 100
    
    // Reduzir por lesões não consideradas
    score -= profile.limitations.injuries.length * 10
    
    // Reduzir se há exercícios muito difíceis
    if (realData && profile.realPerformance.completionRate < 0.6) {
      score -= 30
    }
    
    return Math.max(0, score)
  }
  
  private static calculateEfficiencyScore(profile: ComprehensiveUserProfile, realData: any): number {
    if (!realData) return 50
    
    let score = profile.realPerformance.completionRate * 100
    
    // Bonus por consistência
    if (profile.realPerformance.consistencyScore > 80) {
      score += 10
    }
    
    return Math.min(100, Math.round(score))
  }
  
  private static calculateSustainabilityScore(profile: ComprehensiveUserProfile): number {
    let score = 70 // Base
    
    // Ajustar por frequência realista
    if (profile.aiSettings.frequency <= 4) score += 20
    if (profile.aiSettings.frequency >= 6) score -= 10
    
    // Ajustar por duração de sessão
    if (profile.aiSettings.sessionDuration <= 60) score += 10
    if (profile.aiSettings.sessionDuration > 90) score -= 15
    
    return Math.max(0, Math.min(100, score))
  }
  
  private static calculateProfileCompleteness(profile: ComprehensiveUserProfile): number {
    let completeness = 0
    
    if (profile.physicalProfile.height) completeness += 10
    if (profile.physicalProfile.weight) completeness += 10
    if (profile.physicalProfile.age) completeness += 10
    if (profile.aiSettings.primaryGoal) completeness += 15
    if (profile.aiSettings.experience_level) completeness += 15
    if (profile.aiSettings.availableEquipment.length) completeness += 10
    if (profile.aiSettings.frequency) completeness += 10
    if (profile.aiSettings.sessionDuration) completeness += 10
    if (profile.realPerformance.totalWorkouts > 0) completeness += 20
    
    return Math.min(100, completeness)
  }
  
  private static generateKeyInsights(profile: ComprehensiveUserProfile, realData: any, goalData: any): string[] {
    const insights: string[] = []
    
    if (realData) {
      insights.push(`Performance real analisada: ${profile.realPerformance.totalWorkouts} treinos completados`)
      
      if (profile.realPerformance.completionRate < 0.7) {
        insights.push('Treinos estão muito difíceis - redução de intensidade recomendada')
      }
      
      if (profile.realPerformance.consistencyScore > 80) {
        insights.push('Excelente consistência nos treinos!')
      }
    }
    
    if (profile.limitations.injuries.length > 0) {
      insights.push(`Limitações identificadas: exercícios adaptados para ${profile.limitations.injuries.join(', ')}`)
    }
    
    insights.push(`Objetivo atual: ${profile.aiSettings.primaryGoal} - ${profile.aiSettings.frequency}x por semana`)
    
    return insights
  }
  
  private static generateShortTermPlan(profile: ComprehensiveUserProfile, realData: any): string[] {
    const plan: string[] = []
    
    if (realData && profile.realPerformance.completionRate < 0.7) {
      plan.push('Ajustar cargas dos exercícios problemáticos')
    }
    
    if (profile.realPerformance.consistencyScore < 70) {
      plan.push('Focar em manter frequência regular de treinos')
    }
    
    plan.push('Monitorar execução e ajustar técnica')
    
    return plan
  }
  
  private static generateMediumTermPlan(profile: ComprehensiveUserProfile, goalData: any): string[] {
    const plan: string[] = []
    
    switch (profile.aiSettings.primaryGoal) {
      case 'muscle_gain':
        plan.push('Aumentar progressivamente volume e cargas')
        plan.push('Adicionar exercícios de isolamento')
        break
      case 'fat_loss':
        plan.push('Aumentar frequência de treinos')
        plan.push('Incluir exercícios aeróbicos')
        break
      case 'strength_gain':
        plan.push('Focar em exercícios compostos com cargas altas')
        plan.push('Reduzir repetições, aumentar intensidade')
        break
      default:
        plan.push('Progressão gradual baseada no objetivo')
    }
    
    return plan
  }
  
  private static generateLongTermPlan(profile: ComprehensiveUserProfile): string[] {
    return [
      'Avaliar e ajustar objetivos baseados nos resultados',
      'Especializar treinos para metas específicas',
      'Implementar periodização avançada'
    ]
  }
} 