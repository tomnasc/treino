/**
 * SERVIÇO DE TEMPLATES DE CORREÇÃO AUTOMÁTICA
 * 
 * Este serviço é responsável por:
 * - Aplicar templates predefinidos de correção
 * - Detectar padrões comuns de problemas
 * - Executar correções automáticas seguras
 * - Validar impacto das mudanças
 */

import { supabase } from '@/app/lib/supabase'
import { 
  CorrectionTemplate,
  TemplateCondition,
  TemplateAction,
  AppliedTemplate,
  UserAnalysisProfile,
  MuscleImbalance,
  Workout,
  WorkoutExercise
} from '@/app/types/recommendations.types'

// ===== INTERFACES INTERNAS =====
interface TemplateMatchResult {
  template: CorrectionTemplate
  matchScore: number // 0-1
  matchedConditions: TemplateCondition[]
  applicableActions: TemplateAction[]
  estimatedImpact: number // 0-10
}

interface CorrectionContext {
  userProfile: UserAnalysisProfile
  workouts: Workout[]
  muscleImbalances: MuscleImbalance[]
  currentIssues: string[]
  constraints: {
    maxChangesPerWorkout: number
    preserveUserPreferences: boolean
    riskTolerance: 'low' | 'medium' | 'high'
  }
}

// ===== CLASSE PRINCIPAL =====
export class CorrectionTemplatesService {
  
  // Templates predefinidos
  private static predefinedTemplates: CorrectionTemplate[] = [
    {
      id: 'muscle_balance_basic',
      name: 'Correção Básica de Desequilíbrio Muscular',
      description: 'Corrige desequilíbrios simples adicionando exercícios para grupos subtreinados',
      category: 'muscle_balance',
      conditions: [
        {
          type: 'muscle_imbalance',
          muscle_group: 'any',
          threshold_value: -30,
          comparison: 'less_than',
          severity: 'medium'
        }
      ],
      actions: [
        {
          type: 'add_exercise',
          target_muscle_group: 'detected',
          exercise_criteria: {
            difficulty: 'beginner',
            equipment: ['basic']
          },
          parameter_changes: {
            sets_delta: 3,
            reps_multiplier: 1.0
          },
          execution_order: 1
        }
      ],
      priority: 8,
      success_metrics: ['muscle_balance_improvement', 'user_satisfaction'],
      estimated_impact: {
        muscle_balance_improvement: 70,
        injury_risk_reduction: 30,
        goal_achievement_boost: 40
      }
    },
    {
      id: 'volume_excess_reduction',
      name: 'Redução de Volume Excessivo',
      description: 'Reduz volume quando detectado excesso para prevenir overtraining',
      category: 'injury_prevention',
      conditions: [
        {
          type: 'volume_excess',
          threshold_value: 50,
          comparison: 'greater_than',
          severity: 'high'
        }
      ],
      actions: [
        {
          type: 'modify_parameters',
          parameter_changes: {
            sets_delta: -1,
            reps_multiplier: 0.9
          },
          execution_order: 1
        },
        {
          type: 'remove_exercise',
          target_muscle_group: 'overtrained',
          execution_order: 2
        }
      ],
      priority: 9,
      success_metrics: ['injury_risk_reduction', 'recovery_improvement'],
      estimated_impact: {
        muscle_balance_improvement: 20,
        injury_risk_reduction: 80,
        goal_achievement_boost: 30
      }
    },
    {
      id: 'beginner_progression',
      name: 'Progressão para Iniciantes',
      description: 'Ajusta treinos para iniciantes com foco em forma e segurança',
      category: 'progression',
      conditions: [
        {
          type: 'muscle_imbalance',
          threshold_value: 0,
          comparison: 'equal_to',
          severity: 'low'
        }
      ],
      actions: [
        {
          type: 'modify_parameters',
          exercise_criteria: {
            difficulty: 'beginner'
          },
          parameter_changes: {
            sets_delta: 0,
            reps_multiplier: 1.1,
            rest_time_delta: 30
          },
          execution_order: 1
        },
        {
          type: 'replace_exercise',
          exercise_criteria: {
            difficulty: 'beginner',
            equipment: ['machine', 'dumbbell']
          },
          execution_order: 2
        }
      ],
      priority: 6,
      success_metrics: ['progression_rate', 'technique_improvement'],
      estimated_impact: {
        muscle_balance_improvement: 40,
        injury_risk_reduction: 60,
        goal_achievement_boost: 50
      }
    },
    {
      id: 'goal_optimization_hypertrophy',
      name: 'Otimização para Hipertrofia',
      description: 'Ajusta parâmetros para maximizar ganho de massa muscular',
      category: 'goal_optimization',
      conditions: [
        {
          type: 'muscle_imbalance',
          threshold_value: 0,
          comparison: 'equal_to',
          severity: 'low'
        }
      ],
      actions: [
        {
          type: 'modify_parameters',
          parameter_changes: {
            sets_delta: 1,
            reps_multiplier: 1.0,
            rest_time_delta: 30
          },
          execution_order: 1
        },
        {
          type: 'add_exercise',
          exercise_criteria: {
            equipment: ['dumbbell', 'cable'],
            difficulty: 'intermediate'
          },
          parameter_changes: {
            sets_delta: 3
          },
          execution_order: 2
        }
      ],
      priority: 7,
      success_metrics: ['muscle_growth', 'volume_optimization'],
      estimated_impact: {
        muscle_balance_improvement: 30,
        injury_risk_reduction: 20,
        goal_achievement_boost: 80
      }
    },
    {
      id: 'time_constraint_optimization',
      name: 'Otimização por Tempo Limitado',
      description: 'Adapta treinos para sessões mais curtas mantendo eficácia',
      category: 'goal_optimization',
      conditions: [
        {
          type: 'frequency_issue',
          threshold_value: 45,
          comparison: 'less_than',
          severity: 'medium'
        }
      ],
      actions: [
        {
          type: 'replace_exercise',
          exercise_criteria: {
            equipment: ['compound'],
            difficulty: 'intermediate'
          },
          execution_order: 1
        },
        {
          type: 'modify_parameters',
          parameter_changes: {
            rest_time_delta: -15
          },
          execution_order: 2
        }
      ],
      priority: 5,
      success_metrics: ['time_efficiency', 'workout_completion'],
      estimated_impact: {
        muscle_balance_improvement: 20,
        injury_risk_reduction: 10,
        goal_achievement_boost: 60
      }
    },
    {
      id: 'injury_prevention_core',
      name: 'Fortalecimento de Core Preventivo',
      description: 'Adiciona exercícios de core para prevenir lesões lombares',
      category: 'injury_prevention',
      conditions: [
        {
          type: 'muscle_imbalance',
          muscle_group: 'Abdômen',
          threshold_value: -40,
          comparison: 'less_than',
          severity: 'high'
        }
      ],
      actions: [
        {
          type: 'add_exercise',
          target_muscle_group: 'Abdômen',
          exercise_criteria: {
            difficulty: 'beginner',
            equipment: ['bodyweight']
          },
          parameter_changes: {
            sets_delta: 2,
            reps_multiplier: 1.2
          },
          execution_order: 1
        }
      ],
      priority: 10,
      success_metrics: ['core_strength', 'posture_improvement'],
      estimated_impact: {
        muscle_balance_improvement: 60,
        injury_risk_reduction: 90,
        goal_achievement_boost: 30
      }
    }
  ]
  
  /**
   * Aplicar templates de correção automática
   */
  static async applyCorrectionTemplates(
    context: CorrectionContext
  ): Promise<AppliedTemplate[]> {
    try {
      // 1. Carregar templates do banco de dados
      const dbTemplates = await this.loadDatabaseTemplates()
      const allTemplates = [...this.predefinedTemplates, ...dbTemplates]
      
      // 2. Encontrar templates aplicáveis
      const applicableTemplates = await this.findApplicableTemplates(
        allTemplates,
        context
      )
      
      // 3. Classificar por prioridade e impacto
      const rankedTemplates = this.rankTemplates(applicableTemplates, context)
      
      // 4. Aplicar templates selecionados
      const appliedTemplates = await this.executeTemplates(
        rankedTemplates.slice(0, 3), // Máximo 3 templates por vez
        context
      )
      
      // 5. Validar resultados
      const validatedTemplates = await this.validateApplications(
        appliedTemplates,
        context
      )
      
      return validatedTemplates
      
    } catch (error) {
      console.error('Erro ao aplicar templates de correção:', error)
      throw new Error('Falha ao aplicar correções automáticas')
    }
  }
  
  /**
   * Carregar templates do banco de dados
   */
  private static async loadDatabaseTemplates(): Promise<CorrectionTemplate[]> {
    const { data: templates, error } = await supabase
      .from('correction_templates')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false })
    
    if (error) {
      console.warn('Erro ao carregar templates do banco:', error)
      return []
    }
    
    return templates?.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || '',
      category: template.category,
      conditions: template.conditions || [],
      actions: template.actions || [],
      priority: template.priority,
      success_metrics: template.success_metrics || [],
      estimated_impact: template.estimated_impact || {
        muscle_balance_improvement: 0,
        injury_risk_reduction: 0,
        goal_achievement_boost: 0
      }
    })) || []
  }
  
  /**
   * Encontrar templates aplicáveis
   */
  private static async findApplicableTemplates(
    templates: CorrectionTemplate[],
    context: CorrectionContext
  ): Promise<TemplateMatchResult[]> {
    const results: TemplateMatchResult[] = []
    
    for (const template of templates) {
      const matchResult = await this.evaluateTemplateMatch(template, context)
      
      if (matchResult.matchScore > 0.5) {
        results.push(matchResult)
      }
    }
    
    return results
  }
  
  /**
   * Avaliar compatibilidade de template
   */
  private static async evaluateTemplateMatch(
    template: CorrectionTemplate,
    context: CorrectionContext
  ): Promise<TemplateMatchResult> {
    const matchedConditions: TemplateCondition[] = []
    let totalMatchScore = 0
    
    for (const condition of template.conditions) {
      const conditionMatch = this.evaluateCondition(condition, context)
      
      if (conditionMatch.matches) {
        matchedConditions.push(condition)
        totalMatchScore += conditionMatch.score
      }
    }
    
    const matchScore = template.conditions.length > 0 
      ? totalMatchScore / template.conditions.length 
      : 0
    
    // Avaliar ações aplicáveis
    const applicableActions = this.filterApplicableActions(
      template.actions,
      context
    )
    
    // Estimar impacto
    const estimatedImpact = this.estimateTemplateImpact(
      template,
      matchedConditions,
      context
    )
    
    return {
      template,
      matchScore,
      matchedConditions,
      applicableActions,
      estimatedImpact
    }
  }
  
  /**
   * Avaliar condição específica
   */
  private static evaluateCondition(
    condition: TemplateCondition,
    context: CorrectionContext
  ): { matches: boolean; score: number } {
    switch (condition.type) {
      case 'muscle_imbalance':
        return this.evaluateMuscleImbalanceCondition(condition, context)
      
      case 'volume_excess':
        return this.evaluateVolumeExcessCondition(condition, context)
      
      case 'frequency_issue':
        return this.evaluateFrequencyCondition(condition, context)
      
      case 'progression_stall':
        return this.evaluateProgressionCondition(condition, context)
      
      default:
        return { matches: false, score: 0 }
    }
  }
  
  /**
   * Avaliar condição de desequilíbrio muscular
   */
  private static evaluateMuscleImbalanceCondition(
    condition: TemplateCondition,
    context: CorrectionContext
  ): { matches: boolean; score: number } {
    const targetMuscleGroup = condition.muscle_group
    const threshold = condition.threshold_value
    const comparison = condition.comparison
    
    if (targetMuscleGroup === 'any') {
      // Verificar se há qualquer desequilíbrio
      const hasImbalance = context.muscleImbalances.some(imbalance => {
        const score = this.getMuscleImbalanceScore(imbalance)
        return this.compareValue(score, threshold, comparison)
      })
      
      return {
        matches: hasImbalance,
        score: hasImbalance ? 1.0 : 0
      }
    } else {
      // Verificar grupo específico
      const imbalance = context.muscleImbalances.find(
        imb => imb.muscle_group_name === targetMuscleGroup
      )
      
      if (!imbalance) return { matches: false, score: 0 }
      
      const score = this.getMuscleImbalanceScore(imbalance)
      const matches = this.compareValue(score, threshold, comparison)
      
      return {
        matches,
        score: matches ? Math.abs(score / 100) : 0 // Normalizar para 0-1
      }
    }
  }
  
  /**
   * Avaliar condição de volume excessivo
   */
  private static evaluateVolumeExcessCondition(
    condition: TemplateCondition,
    context: CorrectionContext
  ): { matches: boolean; score: number } {
    const totalVolume = this.calculateTotalVolume(context.workouts)
    const matches = this.compareValue(totalVolume, condition.threshold_value, condition.comparison)
    
    return {
      matches,
      score: matches ? Math.min(1.0, totalVolume / 100) : 0
    }
  }
  
  /**
   * Avaliar condição de frequência
   */
  private static evaluateFrequencyCondition(
    condition: TemplateCondition,
    context: CorrectionContext
  ): { matches: boolean; score: number } {
    const avgDuration = this.calculateAverageWorkoutDuration(context.workouts)
    const matches = this.compareValue(avgDuration, condition.threshold_value, condition.comparison)
    
    return {
      matches,
      score: matches ? 1.0 : 0
    }
  }
  
  /**
   * Avaliar condição de progressão
   */
  private static evaluateProgressionCondition(
    condition: TemplateCondition,
    context: CorrectionContext
  ): { matches: boolean; score: number } {
    // Implementação simplificada - sempre retorna match baixo
    return { matches: true, score: 0.3 }
  }
  
  /**
   * Filtrar ações aplicáveis
   */
  private static filterApplicableActions(
    actions: TemplateAction[],
    context: CorrectionContext
  ): TemplateAction[] {
    return actions.filter(action => {
      // Verificar restrições baseadas no contexto
      if (action.type === 'remove_exercise' && 
          context.constraints.preserveUserPreferences) {
        return false
      }
      
      if (action.type === 'replace_exercise' && 
          context.constraints.riskTolerance === 'low') {
        return false
      }
      
      return true
    })
  }
  
  /**
   * Estimar impacto do template
   */
  private static estimateTemplateImpact(
    template: CorrectionTemplate,
    matchedConditions: TemplateCondition[],
    context: CorrectionContext
  ): number {
    let baseImpact = template.priority / 10 // Normalizar para 0-1
    
    // Ajustar baseado no número de condições atendidas
    const conditionRatio = matchedConditions.length / template.conditions.length
    baseImpact *= conditionRatio
    
    // Ajustar baseado na severidade dos problemas
    const severityMultiplier = matchedConditions.some(c => c.severity === 'high') ? 1.5 :
                              matchedConditions.some(c => c.severity === 'medium') ? 1.2 : 1.0
    
    baseImpact *= severityMultiplier
    
    return Math.min(10, baseImpact * 10) // Retornar em escala 0-10
  }
  
  /**
   * Classificar templates por prioridade
   */
  private static rankTemplates(
    templates: TemplateMatchResult[],
    context: CorrectionContext
  ): TemplateMatchResult[] {
    return templates.sort((a, b) => {
      // Prioridade principal: severidade dos problemas
      const aSeverity = this.calculateSeverityScore(a.matchedConditions)
      const bSeverity = this.calculateSeverityScore(b.matchedConditions)
      
      if (aSeverity !== bSeverity) {
        return bSeverity - aSeverity
      }
      
      // Secundário: impacto estimado
      if (a.estimatedImpact !== b.estimatedImpact) {
        return b.estimatedImpact - a.estimatedImpact
      }
      
      // Terciário: match score
      return b.matchScore - a.matchScore
    })
  }
  
  /**
   * Executar templates selecionados
   */
  private static async executeTemplates(
    templates: TemplateMatchResult[],
    context: CorrectionContext
  ): Promise<AppliedTemplate[]> {
    const appliedTemplates: AppliedTemplate[] = []
    
    for (const templateMatch of templates) {
      try {
        const appliedTemplate = await this.executeTemplate(templateMatch, context)
        appliedTemplates.push(appliedTemplate)
      } catch (error) {
        console.error(`Erro ao executar template ${templateMatch.template.id}:`, error)
      }
    }
    
    return appliedTemplates
  }
  
  /**
   * Executar template específico
   */
  private static async executeTemplate(
    templateMatch: TemplateMatchResult,
    context: CorrectionContext
  ): Promise<AppliedTemplate> {
    const { template, matchedConditions, applicableActions } = templateMatch
    
    // Executar ações em ordem
    const executedActions: TemplateAction[] = []
    
    for (const action of applicableActions.sort((a, b) => a.execution_order - b.execution_order)) {
      const success = await this.executeAction(action, context)
      
      if (success) {
        executedActions.push(action)
      }
    }
    
    return {
      template,
      matched_conditions: matchedConditions,
      actions_to_execute: executedActions,
      expected_outcome: this.generateExpectedOutcome(template, executedActions),
      confidence_level: templateMatch.matchScore
    }
  }
  
  /**
   * Executar ação específica
   */
  private static async executeAction(
    action: TemplateAction,
    context: CorrectionContext
  ): Promise<boolean> {
    try {
      switch (action.type) {
        case 'add_exercise':
          return await this.executeAddExercise(action, context)
        
        case 'remove_exercise':
          return await this.executeRemoveExercise(action, context)
        
        case 'replace_exercise':
          return await this.executeReplaceExercise(action, context)
        
        case 'modify_parameters':
          return await this.executeModifyParameters(action, context)
        
        default:
          console.warn(`Tipo de ação não suportado: ${action.type}`)
          return false
      }
    } catch (error) {
      console.error(`Erro ao executar ação ${action.type}:`, error)
      return false
    }
  }
  
  /**
   * Validar aplicações
   */
  private static async validateApplications(
    appliedTemplates: AppliedTemplate[],
    context: CorrectionContext
  ): Promise<AppliedTemplate[]> {
    // Implementação simplificada - retorna todos como válidos
    return appliedTemplates
  }
  
  // ===== MÉTODOS AUXILIARES =====
  
  private static getMuscleImbalanceScore(imbalance: MuscleImbalance): number {
    // Converter tipo de desequilíbrio para score numérico
    const typeScore = imbalance.imbalance_type === 'overtrained' ? 50 :
                     imbalance.imbalance_type === 'undertrained' ? -50 : 0
    
    const severityMultiplier = imbalance.severity === 'high' ? 2 :
                              imbalance.severity === 'medium' ? 1.5 : 1
    
    return typeScore * severityMultiplier
  }
  
  private static compareValue(
    value: number,
    threshold: number,
    comparison: 'greater_than' | 'less_than' | 'equal_to'
  ): boolean {
    switch (comparison) {
      case 'greater_than':
        return value > threshold
      case 'less_than':
        return value < threshold
      case 'equal_to':
        return Math.abs(value - threshold) < 0.1
      default:
        return false
    }
  }
  
  private static calculateTotalVolume(workouts: Workout[]): number {
    return workouts.reduce((total, workout) => {
      return total + workout.exercises.reduce((workoutTotal, exercise) => {
        return workoutTotal + exercise.sets
      }, 0)
    }, 0)
  }
  
  private static calculateAverageWorkoutDuration(workouts: Workout[]): number {
    if (workouts.length === 0) return 0
    
    const totalDuration = workouts.reduce((sum, workout) => {
      return sum + (workout.estimated_duration || 60)
    }, 0)
    
    return totalDuration / workouts.length
  }
  
  private static calculateSeverityScore(conditions: TemplateCondition[]): number {
    const scores = { 'low': 1, 'medium': 2, 'high': 3 }
    return conditions.reduce((sum, condition) => sum + scores[condition.severity], 0)
  }
  
  private static generateExpectedOutcome(
    template: CorrectionTemplate,
    executedActions: TemplateAction[]
  ): string {
    const actionDescriptions = executedActions.map(action => {
      switch (action.type) {
        case 'add_exercise':
          return 'adição de exercícios específicos'
        case 'remove_exercise':
          return 'remoção de exercícios excessivos'
        case 'replace_exercise':
          return 'substituição de exercícios inadequados'
        case 'modify_parameters':
          return 'ajuste de parâmetros de treino'
        default:
          return 'modificação no treino'
      }
    })
    
    return `Espera-se ${template.description.toLowerCase()} através de ${actionDescriptions.join(', ')}`
  }
  
  // Métodos de execução simplificados (implementação básica)
  private static async executeAddExercise(action: TemplateAction, context: CorrectionContext): Promise<boolean> {
    // Implementação simulada
    console.log('Executando adição de exercício:', action)
    return true
  }
  
  private static async executeRemoveExercise(action: TemplateAction, context: CorrectionContext): Promise<boolean> {
    // Implementação simulada
    console.log('Executando remoção de exercício:', action)
    return true
  }
  
  private static async executeReplaceExercise(action: TemplateAction, context: CorrectionContext): Promise<boolean> {
    // Implementação simulada
    console.log('Executando substituição de exercício:', action)
    return true
  }
  
  private static async executeModifyParameters(action: TemplateAction, context: CorrectionContext): Promise<boolean> {
    // Implementação simulada
    console.log('Executando modificação de parâmetros:', action)
    return true
  }
} 