"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bot, BrainCircuit, Loader2, Sparkles, Dumbbell } from "lucide-react"
import { AISettingsForm } from "@/app/components/ai/ai-settings-form"
import { AIWorkoutResult } from "@/app/components/ai/ai-workout-result"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { generateWorkoutPlan, parseWorkoutPlan, WorkoutGenerationInput } from "@/app/lib/huggingface"
import { supabase } from "@/app/lib/supabase"
import { AISettings, TrainingGoal } from "@/app/types/database.types"

export default function AIWorkoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [userSettings, setUserSettings] = useState<AISettings | null>(null)
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([])
  const [generatedWorkout, setGeneratedWorkout] = useState<string | null>(null)
  const [parsedWorkout, setParsedWorkout] = useState<ReturnType<typeof parseWorkoutPlan> | null>(null)
  
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Buscar configurações do usuário
        const { data: settings, error: settingsError } = await supabase
          .from("ai_settings")
          .select("*")
          .eq("user_id", currentUser.id)
          .maybeSingle()
          
        if (settingsError) {
          throw settingsError
        }
        
        setUserSettings(settings)
        
        // Buscar objetivos de treino
        const { data: goals, error: goalsError } = await supabase
          .from("training_goals")
          .select("*")
          
        if (goalsError) {
          throw goalsError
        }
        
        setTrainingGoals(goals || [])
      } catch (error) {
        console.error("Erro ao inicializar página:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as configurações. Tente novamente mais tarde.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [router])
  
  const handleGenerateWorkout = async (input: WorkoutGenerationInput) => {
    try {
      setIsGenerating(true)
      
      // Salvar ou atualizar as configurações do usuário
      const currentUser = await getCurrentUser()
      if (!currentUser) return
      
      // Construir objeto para salvar no banco de dados
      const settingsData = {
        user_id: currentUser.id,
        goal_id: trainingGoals.find(g => g.name === input.goal)?.id,
        experience_level: input.experienceLevel,
        frequency: input.frequency,
        session_duration: input.sessionDuration,
        available_equipment: input.equipment.join(', '),
        health_conditions: input.healthConditions || null,
        preferences: input.preferences || null,
      }
      
      if (userSettings?.id) {
        // Atualizar configurações existentes
        await supabase
          .from("ai_settings")
          .update(settingsData)
          .eq("id", userSettings.id)
      } else {
        // Criar novas configurações
        await supabase
          .from("ai_settings")
          .insert(settingsData)
      }
      
      // Gerar plano de treino
      const generatedText = await generateWorkoutPlan(input)
      setGeneratedWorkout(generatedText)
      
      // Parsear resultado
      const parsed = parseWorkoutPlan(generatedText)
      setParsedWorkout(parsed)
      
      // Verificar se temos exercícios
      if (parsed.exercises.length === 0) {
        console.warn("Nenhum exercício foi extraído do texto gerado pela IA:", generatedText);
        toast({
          title: "Aviso sobre o processamento",
          description: "O treino foi gerado, mas não conseguimos extrair os exercícios automaticamente. Tente novamente ou ajuste as preferências.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Treino gerado com sucesso!",
          description: `Foram encontrados ${parsed.exercises.length} exercícios distribuídos em ${Object.keys(
            parsed.exercises.reduce((acc, ex) => {
              acc[ex.dayOfWeek] = true;
              return acc;
            }, {} as Record<number, boolean>)
          ).length} dias de treino.`,
        });
      }
    } catch (error: any) {
      console.error("Erro ao gerar treino:", error)
      toast({
        title: "Erro ao gerar treino",
        description: error.message || "Não foi possível gerar o treino. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Gerador de Treinos com IA</h2>
        <p className="text-muted-foreground">
          Gere planos de treino personalizados com base nas suas preferências e objetivos.
        </p>
      </div>
      
      <Tabs defaultValue={generatedWorkout ? "resultado" : "configuracao"} className="space-y-4">
        <TabsList>
          <TabsTrigger value="configuracao">
            <BrainCircuit className="mr-2 h-4 w-4" />
            Configuração
          </TabsTrigger>
          <TabsTrigger value="resultado" disabled={!generatedWorkout}>
            <Dumbbell className="mr-2 h-4 w-4" />
            Plano de Treino
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="configuracao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Treino</CardTitle>
              <CardDescription>
                Configure suas preferências para gerar um plano de treino personalizado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AISettingsForm 
                initialData={userSettings}
                trainingGoals={trainingGoals}
                onSubmit={handleGenerateWorkout}
                isGenerating={isGenerating}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="resultado" className="space-y-4">
          {generatedWorkout && parsedWorkout && (
            <AIWorkoutResult 
              rawOutput={generatedWorkout}
              parsedWorkout={parsedWorkout}
              onBack={() => document.querySelector('[value="configuracao"]')?.dispatchEvent(new Event('click'))}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 