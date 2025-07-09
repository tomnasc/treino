// ===== TIPOS BÁSICOS =====
export interface Exercise {
  id: string
  name: string
  muscle_group?: {
    id: string
    name: string
  } | null
  description?: string
  equipment?: string[]
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced'
  target_muscles?: string[]
  synergist_muscles?: string[]
}

export interface WorkoutExercise {
  id: string
  exercise_id: string
  sets: number
  reps: string
  rest_time: number | null
  order_position: number
  exercise: Exercise
  weight?: string
  notes?: string
}

export interface Workout {
  id: string
  name: string
  description: string | null
  exercises: WorkoutExercise[]
  created_by: string
  goal_id?: string
  estimated_duration?: number
}

// ===== TIPOS DE SUBSTITUIÇÕES INTELIGENTES =====
export type SubstitutionReason = 
  | 'equipment_unavailable'
  | 'injury_limitation' 
  | 'experience_level'
  | 'muscle_imbalance'
  | 'goal_optimization'
  | 'progression_needed'
  | 'difficulty_adjustment'

export interface SubstitutionRule {
  id: string
  original_exercise_id: string
  substitute_exercise_id: string
  reason: SubstitutionReason
  condition_data: {
    equipment_required?: string[]
    equipment_alternative?: string[]
    injury_type?: string[]
    min_experience_level?: 'beginner' | 'intermediate' | 'advanced'
    max_experience_level?: 'beginner' | 'intermediate' | 'advanced'
    target_goal?: string[]
  }
  effectiveness_score: number // 1-10
  created_at: string
  is_active: boolean
}

export interface SmartSubstitution {
  original: WorkoutExercise
  substitute: Exercise
  reason: SubstitutionReason
  effectiveness: number
  explanation: string
  confidence: number // 0-1
  basedOnRealData?: boolean
  realDataInsights?: {
    currentCompletionRate: number
    currentWeight: number
    suggestionType: 'reduce_difficulty' | 'increase_difficulty' | 'vary_stimulus'
  }
}

// ===== TIPOS DE ANÁLISE POR OBJETIVOS =====
export type FitnessGoal = 
  | 'muscle_gain'
  | 'fat_loss'
  | 'strength_gain'
  | 'endurance'
  | 'functional_fitness'
  | 'rehabilitation'
  | 'maintenance'

export interface GoalBasedAnalysis {
  goal: FitnessGoal
  current_workout_alignment: number // 0-1
  recommended_changes: {
    volume_adjustment: number // -1 to 1 (decrease to increase)
    intensity_adjustment: number // -1 to 1
    frequency_adjustment: number // -1 to 1
    rest_time_adjustment: number // -1 to 1
    exercise_type_preference: 'compound' | 'isolation' | 'mixed'
  }
  priority_muscle_groups: string[]
  avoid_muscle_groups: string[]
  recommendations: GoalRecommendation[]
}

export interface GoalRecommendation {
  type: 'add_exercise' | 'remove_exercise' | 'modify_parameters' | 'change_order'
  target_exercise_id?: string
  suggested_exercise?: Exercise
  parameter_changes?: {
    sets?: number
    reps?: string
    rest_time?: number
    weight_adjustment?: number
  }
  reason: string
  impact_score: number // 1-10
}

// ===== TIPOS DE TEMPLATES DE CORREÇÃO =====
export interface CorrectionTemplate {
  id: string
  name: string
  description: string
  category: 'muscle_balance' | 'injury_prevention' | 'goal_optimization' | 'progression'
  conditions: TemplateCondition[]
  actions: TemplateAction[]
  priority: number
  success_metrics: string[]
  estimated_impact: {
    muscle_balance_improvement: number
    injury_risk_reduction: number
    goal_achievement_boost: number
  }
}

export interface TemplateCondition {
  type: 'muscle_imbalance' | 'volume_excess' | 'frequency_issue' | 'progression_stall'
  muscle_group?: string
  threshold_value: number
  comparison: 'greater_than' | 'less_than' | 'equal_to'
  severity: 'low' | 'medium' | 'high'
}

export interface TemplateAction {
  type: 'add_exercise' | 'remove_exercise' | 'replace_exercise' | 'modify_parameters'
  target_muscle_group?: string
  exercise_criteria?: {
    equipment?: string[]
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
    movement_pattern?: string[]
  }
  parameter_changes?: {
    sets_delta?: number
    reps_multiplier?: number
    rest_time_delta?: number
  }
  execution_order: number
}

// ===== TIPOS DE MÉTRICAS DE PROGRESSO =====
export interface ProgressMetrics {
  id: string
  user_id: string
  measurement_date: string
  metrics: {
    muscle_balance_score: number // 0-100
    workout_efficiency: number // 0-100
    goal_alignment: number // 0-100
    injury_risk_score: number // 0-100
    progression_rate: number // -100 to 100
    consistency_score: number // 0-100
  }
  detailed_analysis: {
    muscle_group_balance: Record<string, number>
    volume_distribution: Record<string, number>
    strength_progression: Record<string, {
      baseline: number
      current: number
      change_percentage: number
    }>
    recommendations_applied: number
    recommendations_successful: number
  }
}

export interface ProgressTracking {
  recommendation_id: string
  user_id: string
  applied_at: string
  before_metrics: Partial<ProgressMetrics['metrics']>
  after_metrics: Partial<ProgressMetrics['metrics']>
  impact_analysis: {
    positive_changes: string[]
    negative_changes: string[]
    neutral_changes: string[]
    overall_impact_score: number // -10 to 10
  }
  follow_up_recommendations: string[]
}

// ===== TIPOS DE PLANEJAMENTO SEMANAL =====
export type WeeklyDistribution = 'ABC' | 'ABCD' | 'Push_Pull_Legs' | 'Upper_Lower' | 'Full_Body'

export interface WeeklyPlan {
  id: string
  user_id: string
  week_start: string
  distribution_type: WeeklyDistribution
  training_days: number
  rest_days: number[]
  daily_workouts: {
    day: number // 0-6 (Sunday-Saturday)
    workout_id?: string
    workout_type: string
    estimated_duration: number
    muscle_groups_targeted: string[]
    intensity_level: 'low' | 'medium' | 'high'
    recovery_requirements: string[]
  }[]
  weekly_metrics: {
    total_volume: number
    muscle_group_distribution: Record<string, number>
    recovery_adequacy: number // 0-1
    goal_alignment: number // 0-1
    progression_potential: number // 0-1
  }
  optimization_suggestions: WeeklyOptimization[]
}

export interface WeeklyOptimization {
  type: 'redistribute_volume' | 'adjust_frequency' | 'modify_rest_days' | 'change_workout_order'
  description: string
  expected_benefit: string
  impact_score: number // 1-10
  implementation_difficulty: 'easy' | 'medium' | 'hard'
  specific_changes: {
    move_exercises?: {
      from_day: number
      to_day: number
      exercise_ids: string[]
    }
    adjust_rest?: {
      day: number
      new_rest_time: number
    }
    modify_volume?: {
      muscle_group: string
      volume_change: number
    }
  }
}

// ===== TIPOS PRINCIPAIS DE RECOMENDAÇÕES =====
export interface ComprehensiveRecommendation {
  id: string
  user_id: string
  generated_at: string
  analysis_data: {
    current_workouts: Workout[]
    muscle_imbalances: MuscleImbalance[]
    goal_analysis: GoalBasedAnalysis
    user_profile: UserAnalysisProfile
  }
  recommendations: {
    smart_substitutions: SmartSubstitution[]
    goal_optimizations: GoalRecommendation[]
    template_corrections: AppliedTemplate[]
    weekly_optimizations: WeeklyOptimization[]
  }
  priority_score: number
  estimated_impact: {
    muscle_balance_improvement: number
    goal_achievement_boost: number
    injury_risk_reduction: number
    workout_efficiency_gain: number
  }
  implementation_complexity: 'simple' | 'moderate' | 'complex'
  estimated_time_to_results: number // weeks
}

export interface MuscleImbalance {
  muscle_group_name: string
  imbalance_type: 'overtrained' | 'undertrained' | 'optimal'
  severity: 'low' | 'medium' | 'high'
  current_volume: number
  recommended_volume: number
  exercises_involved: string[]
  recommended_actions: string[]
}

export interface AppliedTemplate {
  template: CorrectionTemplate
  matched_conditions: TemplateCondition[]
  actions_to_execute: TemplateAction[]
  expected_outcome: string
  confidence_level: number // 0-1
}

export interface UserAnalysisProfile {
  fitness_level: 'beginner' | 'intermediate' | 'advanced'
  primary_goal: FitnessGoal
  secondary_goals: FitnessGoal[]
  available_equipment: string[]
  training_frequency: number // days per week
  time_per_session: number // minutes
  injury_history: string[]
  limitations: string[]
  preferences: {
    compound_vs_isolation: number // -1 to 1
    high_vs_low_intensity: number // -1 to 1
    volume_tolerance: number // 0-1
    exercise_variety_preference: number // 0-1
  }
}

// ===== TIPOS DE RESPOSTA E AÇÕES =====
export interface RecommendationAction {
  id: string
  type: 'add_exercise' | 'remove_exercise' | 'replace_exercise' | 'modify_parameters' | 'reorder_exercises'
  workout_id: string
  target_exercise_id?: string
  new_exercise?: Exercise
  parameter_changes?: {
    sets?: number
    reps?: string
    rest_time?: number
    weight?: string
    order_position?: number
  }
  reason: string
  expected_benefit: string
  difficulty: 'easy' | 'medium' | 'hard'
  reversible: boolean
}

export interface ActionResult {
  action_id: string
  executed_at: string
  success: boolean
  error_message?: string
  before_state: any
  after_state: any
  user_feedback?: {
    satisfaction: number // 1-5
    perceived_difficulty: number // 1-5
    perceived_benefit: number // 1-5
    comments?: string
  }
} 

// ===== TIPOS DE AJUSTES DE TREINO =====
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

// ===== TIPOS EXTENDIDOS PARA RECOMENDAÇÕES ABRANGENTES =====
export interface EnhancedRecommendation extends ComprehensiveRecommendation {
  workout_adjustments?: WorkoutAdjustment[]
  adjustment_summary?: WorkoutAdjustmentSummary
} 