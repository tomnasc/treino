'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import { Badge } from '@/app/components/ui/badge'
import { Progress } from '@/app/components/ui/progress'
import { Alert, AlertDescription } from '@/app/components/ui/alert'
import { Button } from '@/app/components/ui/button'
import { 
  Activity, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Target,
  Database,
  User,
  Heart,
  Dumbbell,
  Calendar,
  Settings,
  Shield,
  BarChart3,
  ArrowUpRight,
  ArrowRight,
  Plus,
  Minus,
  Repeat,
  Loader2,
  RotateCcw,
  Check
} from 'lucide-react'
import { ComprehensiveAnalysisService, ComprehensiveRecommendations, ComprehensiveUserProfile } from '@/app/lib/analysis/comprehensive-analysis.service'
import { WorkoutAnalysisService } from '@/app/lib/analysis/workout-analysis.service'
import { WorkoutAdjustmentService, WorkoutAdjustment, WorkoutAdjustmentSummary } from '@/app/lib/analysis/workout-adjustment.service'
import { useToast } from '@/app/hooks/use-toast'

interface AdvancedRecommendationsPanelProps {
  userId: string
}

export default function AdvancedRecommendationsPanel({ userId }: { userId: string }) {
  const [analysis, setAnalysis] = useState<any>(null)
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<ComprehensiveRecommendations | null>(null)
  const [userProfile, setUserProfile] = useState<ComprehensiveUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('comprehensive-overview')
  const [workoutAdjustments, setWorkoutAdjustments] = useState<WorkoutAdjustment[]>([])
  const [adjustmentSummary, setAdjustmentSummary] = useState<WorkoutAdjustmentSummary | null>(null)
  const [isApplyingAdjustment, setIsApplyingAdjustment] = useState<string | null>(null)
  const [appliedAdjustments, setAppliedAdjustments] = useState<Set<string>>(new Set())

  const { toast } = useToast()

  useEffect(() => {
    loadAnalysis()
  }, [userId])

  const loadAnalysis = async () => {
    try {
      setLoading(true)
      setError(null)

      // Carregar análise completa e integrada
      const [comprehensiveData, profileData, originalAnalysis] = await Promise.all([
        ComprehensiveAnalysisService.performComprehensiveAnalysis(userId),
        ComprehensiveAnalysisService.getCompleteUserProfile(userId),
        WorkoutAnalysisService.analyzeUserWorkouts(userId)
      ])

      setComprehensiveAnalysis(comprehensiveData)
      setUserProfile(profileData)
      setAnalysis(originalAnalysis)
      
    } catch (err) {
      console.error('Erro ao carregar análise:', err)
      setError('Erro ao carregar recomendações. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Carregar ajustes de treino
  useEffect(() => {
    async function loadWorkoutAdjustments() {
      try {
        console.log('🔧 Carregando ajustes de treino...')
        const adjustments = await WorkoutAdjustmentService.generateWorkoutAdjustments(userId)
        const summary = WorkoutAdjustmentService.generateAdjustmentSummary(adjustments)
        
        setWorkoutAdjustments(adjustments)
        setAdjustmentSummary(summary)
        
        console.log(`✅ Carregados ${adjustments.length} ajustes de treino`)
      } catch (error) {
        console.error('❌ Erro ao carregar ajustes de treino:', error)
      }
    }

    if (userId) {
      loadWorkoutAdjustments()
    }
  }, [userId])

  // Aplicar ajuste de treino
  const handleApplyAdjustment = async (adjustment: WorkoutAdjustment) => {
    try {
      setIsApplyingAdjustment(adjustment.id)
      
      const success = await WorkoutAdjustmentService.applyAdjustment(adjustment, userId)
      
      if (success) {
        setAppliedAdjustments(prev => new Set([...prev, adjustment.id]))
        
        toast({
          title: "Ajuste aplicado!",
          description: `${adjustment.reason} foi aplicado ao treino ${adjustment.workout_name}.`,
        })

        // Recarregar ajustes após aplicação
        setTimeout(async () => {
          const newAdjustments = await WorkoutAdjustmentService.generateWorkoutAdjustments(userId)
          setWorkoutAdjustments(newAdjustments)
        }, 1000)
      } else {
        toast({
          title: "Erro ao aplicar ajuste",
          description: "Não foi possível aplicar este ajuste. Tente novamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erro ao aplicar ajuste:', error)
      toast({
        title: "Erro ao aplicar ajuste",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsApplyingAdjustment(null)
    }
  }

  // Função para renderizar ícone de prioridade
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'high':
        return <ArrowUpRight className="w-4 h-4 text-orange-500" />
      case 'medium':
        return <TrendingUp className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <ArrowRight className="w-4 h-4 text-blue-500" />
      default:
        return <ArrowRight className="w-4 h-4 text-gray-500" />
    }
  }

  // Função para renderizar ícone de tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'adjust_parameters':
        return <Settings className="w-4 h-4 text-blue-500" />
      case 'add_exercise':
        return <Plus className="w-4 h-4 text-green-500" />
      case 'remove_exercise':
        return <Minus className="w-4 h-4 text-red-500" />
      case 'replace_exercise':
        return <Repeat className="w-4 h-4 text-purple-500" />
      default:
        return <Settings className="w-4 h-4 text-gray-500" />
    }
  }

  // Função para renderizar badge de fonte
  const getSourceBadge = (source: string) => {
    const badges = {
      performance_analysis: { label: 'Performance', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' },
      muscle_imbalance: { label: 'Equilíbrio', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' },
      goal_alignment: { label: 'Objetivos', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' },
      progression_stagnation: { label: 'Progressão', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' }
    }
    
    const badge = badges[source as keyof typeof badges] || { label: source, color: 'bg-gray-100 text-gray-800' }
    
    return (
      <Badge variant="outline" className={`text-xs ${badge.color}`}>
        {badge.label}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 text-blue-600">
          <Activity className="h-5 w-5 animate-spin" />
          <span>Analisando todos os seus dados...</span>
        </div>
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded"></div>
                <div className="h-3 bg-gray-100 rounded w-4/5"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!comprehensiveAnalysis || !userProfile) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-gray-500">Nenhuma análise disponível no momento.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Status da Análise */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-green-600" />
              <span>Análise Completa e Personalizada</span>
            </CardTitle>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              {comprehensiveAnalysis.contextualAnalysis.dataQuality === 'excellent' ? 'Dados Completos' : 
               comprehensiveAnalysis.contextualAnalysis.dataQuality === 'good' ? 'Bons Dados' : 'Dados Limitados'}
            </Badge>
          </div>
          <CardDescription>
            Sistema analisando: performance real, perfil físico, objetivos, limitações e equipamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Indicadores de Fontes de Dados */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Activity className={`h-4 w-4 ${userProfile.realPerformance.totalWorkouts > 0 ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {userProfile.realPerformance.totalWorkouts > 0 ? 'Dados Reais' : 'Sem Dados'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <User className={`h-4 w-4 ${userProfile.physicalProfile.weight ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {userProfile.physicalProfile.weight ? 'Perfil Físico' : 'Perfil Básico'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Target className={`h-4 w-4 ${userProfile.aiSettings.primaryGoal ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {userProfile.aiSettings.primaryGoal ? 'Objetivos' : 'Sem Objetivos'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Dumbbell className={`h-4 w-4 ${userProfile.aiSettings.availableEquipment.length > 0 ? 'text-green-500' : 'text-gray-400'}`} />
              <span className="text-sm">
                {userProfile.aiSettings.availableEquipment.length > 0 ? 'Equipamentos' : 'Sem Equipamentos'}
              </span>
            </div>
          </div>

          {/* Completude do Perfil */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Completude do Perfil</span>
              <span className="text-sm text-gray-600">
                {comprehensiveAnalysis.contextualAnalysis.profileCompleteness}%
              </span>
            </div>
            <Progress value={comprehensiveAnalysis.contextualAnalysis.profileCompleteness} className="h-2" />
          </div>

          {/* Confiança da Análise */}
          <div className="space-y-2 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Confiança da Análise</span>
              <span className="text-sm text-gray-600">
                {comprehensiveAnalysis.contextualAnalysis.analysisConfidence}%
              </span>
            </div>
            <Progress value={comprehensiveAnalysis.contextualAnalysis.analysisConfidence} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Segurança */}
      {comprehensiveAnalysis.healthAndSafetyAlerts.length > 0 && (
        <div className="space-y-2">
          {comprehensiveAnalysis.healthAndSafetyAlerts.map((alert, index) => (
            <Alert key={index} variant={alert.severity === 'critical' ? 'destructive' : 'default'}>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>{alert.message}</strong>
                <br />
                <span className="text-sm">{alert.recommendation}</span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Insights Principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Insights Personalizados</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {comprehensiveAnalysis.contextualAnalysis.keyInsights.map((insight, index) => (
              <div key={index} className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{insight}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Análises Detalhadas */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="comprehensive-overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="immediate-actions">Ações Imediatas</TabsTrigger>
          <TabsTrigger value="workout-adjustments">Ajustes</TabsTrigger>
          <TabsTrigger value="progression-plan">Progressão</TabsTrigger>
          <TabsTrigger value="alignment-scores">Scores</TabsTrigger>
        </TabsList>

        {/* Visão Geral Completa */}
        <TabsContent value="comprehensive-overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Perfil do Usuário */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Seu Perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Objetivo Principal:</span>
                  <Badge variant="outline">{userProfile.aiSettings.primaryGoal}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Nível:</span>
                  <span className="text-sm">{userProfile.aiSettings.experience_level}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Frequência:</span>
                  <span className="text-sm">{userProfile.aiSettings.frequency}x por semana</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Tempo por Sessão:</span>
                  <span className="text-sm">{userProfile.aiSettings.sessionDuration} minutos</span>
                </div>
                {userProfile.limitations.injuries.length > 0 && (
                  <div className="pt-2 border-t">
                    <span className="text-sm font-medium text-orange-600">Limitações:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {userProfile.limitations.injuries.map((injury, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {injury}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Real */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Real</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Treinos Realizados:</span>
                  <span className="text-sm font-semibold">{userProfile.realPerformance.totalWorkouts}</span>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Taxa de Conclusão:</span>
                    <span className="text-sm">{Math.round(userProfile.realPerformance.completionRate * 100)}%</span>
                  </div>
                  <Progress value={userProfile.realPerformance.completionRate * 100} />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Consistência:</span>
                    <span className="text-sm">{Math.round(userProfile.realPerformance.consistencyScore)}%</span>
                  </div>
                  <Progress value={userProfile.realPerformance.consistencyScore} />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Tendência:</span>
                  <Badge variant={
                    userProfile.realPerformance.progressionTrend === 'progressing' ? 'default' :
                    userProfile.realPerformance.progressionTrend === 'stagnant' ? 'secondary' : 'destructive'
                  }>
                    {userProfile.realPerformance.progressionTrend === 'progressing' ? 'Progredindo' :
                     userProfile.realPerformance.progressionTrend === 'stagnant' ? 'Estável' : 'Regredindo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Ações Imediatas */}
        <TabsContent value="immediate-actions" className="space-y-4">
          <div className="space-y-3">
            {comprehensiveAnalysis.personalizedRecommendations.immediateActions.map((action, index) => (
              <Card key={index} className={`border-l-4 ${
                action.priority === 'critical' ? 'border-l-red-500' :
                action.priority === 'high' ? 'border-l-orange-500' :
                action.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{action.title}</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={
                        action.priority === 'critical' ? 'destructive' :
                        action.priority === 'high' ? 'default' : 'secondary'
                      }>
                        {action.priority === 'critical' ? 'Crítico' :
                         action.priority === 'high' ? 'Alto' :
                         action.priority === 'medium' ? 'Médio' : 'Baixo'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {action.basedOn === 'real_data' ? 'Dados Reais' :
                         action.basedOn === 'profile' ? 'Perfil' :
                         action.basedOn === 'goals' ? 'Objetivos' : 'Limitações'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>Impacto: {action.estimatedImpact}/10</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{action.timeToSeeResults}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Ajustes de Treino */}
        <TabsContent value="workout-adjustments" className="space-y-4">
          {adjustmentSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  Resumo dos Ajustes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{adjustmentSummary.total_adjustments}</div>
                    <div className="text-sm text-muted-foreground">Total de ajustes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{adjustmentSummary.high_impact_count}</div>
                    <div className="text-sm text-muted-foreground">Alto impacto</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{adjustmentSummary.workouts_affected}</div>
                    <div className="text-sm text-muted-foreground">Treinos afetados</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{adjustmentSummary.avg_estimated_impact.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Impacto médio</div>
                  </div>
                </div>
                
                {/* Distribuição por prioridade */}
                <div className="mt-4 space-y-2">
                  <h4 className="text-sm font-medium">Por prioridade:</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(adjustmentSummary.by_priority).map(([priority, count]) => (
                      <Badge key={priority} variant="outline" className="text-xs">
                        {priority}: {count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de ajustes */}
          {workoutAdjustments.length > 0 ? (
            <div className="space-y-4">
              {workoutAdjustments.map((adjustment) => {
                const isApplied = appliedAdjustments.has(adjustment.id)
                const isApplying = isApplyingAdjustment === adjustment.id
                
                return (
                  <Card key={adjustment.id} className={`transition-all ${isApplied ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' : ''}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getPriorityIcon(adjustment.priority)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <CardTitle className="text-base">{adjustment.reason}</CardTitle>
                              {getSourceBadge(adjustment.source)}
                            </div>
                            <CardDescription className="text-sm">
                              Treino: <strong>{adjustment.workout_name}</strong>
                              {adjustment.target_exercise_name && (
                                <> • Exercício: <strong>{adjustment.target_exercise_name}</strong></>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(adjustment.type)}
                          <Badge variant="outline" className="text-xs">
                            Impacto: {adjustment.estimated_impact}/10
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground mb-4">
                        {adjustment.detailed_explanation}
                      </p>
                      
                      {/* Detalhes dos ajustes de parâmetros */}
                      {adjustment.parameter_changes && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <h4 className="text-sm font-medium mb-2">Alterações sugeridas:</h4>
                          <div className="space-y-2">
                            {Object.entries(adjustment.parameter_changes).map(([param, change]) => (
                              <div key={param} className="flex items-center justify-between text-sm">
                                <span className="capitalize font-medium">{param.replace('_', ' ')}:</span>
                                <span>
                                  <span className="text-muted-foreground">{change.current}</span>
                                  <ArrowRight className="w-3 h-3 mx-2 inline text-muted-foreground" />
                                  <span className="font-medium text-primary">{change.suggested}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Benefício esperado */}
                      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Benefício esperado:</strong> {adjustment.expected_benefit}
                        </p>
                      </div>
                      
                      {/* Dados de análise */}
                      {adjustment.analysis_data && (
                        <div className="mb-4">
                          <details className="group">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Ver dados de análise
                            </summary>
                            <div className="mt-2 text-xs text-muted-foreground space-y-1">
                              {Object.entries(adjustment.analysis_data).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="capitalize">{key.replace('_', ' ')}:</span>
                                  <span>{typeof value === 'number' ? value.toFixed(1) : value}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        </div>
                      )}
                      
                      {/* Botões de ação */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {adjustment.implementation_difficulty}
                          </Badge>
                          {adjustment.reversible && (
                            <span className="flex items-center gap-1">
                              <RotateCcw className="w-3 h-3" />
                              Reversível
                            </span>
                          )}
                        </div>
                        
                        {!isApplied ? (
                          <Button
                            size="sm"
                            onClick={() => handleApplyAdjustment(adjustment)}
                            disabled={isApplying}
                            className="min-w-[100px]"
                          >
                            {isApplying ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Aplicando...
                              </>
                            ) : (
                              <>
                                <Check className="w-3 h-3 mr-1" />
                                Aplicar
                              </>
                            )}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            <Check className="w-3 h-3 mr-1" />
                            Aplicado
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Settings className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Nenhum ajuste necessário</h3>
                <p className="text-muted-foreground">
                  Seus treinos estão bem configurados! Continue assim.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Plano de Progressão */}
        <TabsContent value="progression-plan" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Curto Prazo (1-2 semanas)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {comprehensiveAnalysis.personalizedRecommendations.progressionPlan.shortTerm.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Médio Prazo (1-2 meses)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {comprehensiveAnalysis.personalizedRecommendations.progressionPlan.mediumTerm.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4" />
                  <span>Longo Prazo (3+ meses)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {comprehensiveAnalysis.personalizedRecommendations.progressionPlan.longTerm.map((item, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5 flex-shrink-0"></div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scores de Alinhamento */}
        <TabsContent value="alignment-scores" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <span>Alinhamento com Objetivos</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Score Atual</span>
                    <span className="font-semibold">{comprehensiveAnalysis.overallAlignment.goalAlignment}%</span>
                  </div>
                  <Progress value={comprehensiveAnalysis.overallAlignment.goalAlignment} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  <span>Segurança</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Score de Segurança</span>
                    <span className="font-semibold">{comprehensiveAnalysis.overallAlignment.safetyScore}%</span>
                  </div>
                  <Progress value={comprehensiveAnalysis.overallAlignment.safetyScore} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-purple-600" />
                  <span>Eficiência</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Score de Eficiência</span>
                    <span className="font-semibold">{comprehensiveAnalysis.overallAlignment.efficiencyScore}%</span>
                  </div>
                  <Progress value={comprehensiveAnalysis.overallAlignment.efficiencyScore} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <Heart className="h-5 w-5 text-red-600" />
                  <span>Sustentabilidade</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-sm">Score de Sustentabilidade</span>
                    <span className="font-semibold">{comprehensiveAnalysis.overallAlignment.sustainabilityScore}%</span>
                  </div>
                  <Progress value={comprehensiveAnalysis.overallAlignment.sustainabilityScore} />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Botão de Atualização */}
      <div className="flex justify-center">
        <Button onClick={loadAnalysis} variant="outline" className="flex items-center space-x-2">
          <Settings className="h-4 w-4" />
          <span>Atualizar Análise</span>
        </Button>
      </div>
    </div>
  )
} 