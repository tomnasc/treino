"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Loader2, Plus, Save } from "lucide-react"

import { supabase } from "@/app/lib/supabase"
import { Button } from "@/app/components/ui/button"
import { getCurrentUser } from "@/app/lib/auth"
import { Exercise, TrainingGoal, Workout, WorkoutExercise } from "@/app/types/database.types"
import { useToast } from "@/app/hooks/use-toast"
import { WorkoutForm } from "@/app/components/workouts/workout-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { WorkoutExerciseEditor } from "@/app/components/workouts/workout-exercise-editor"

interface EditWorkoutPageProps {
  params: {
    id: string
  }
}

export default function EditWorkoutPage({ params }: EditWorkoutPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<(WorkoutExercise & { exercise: Exercise })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function fetchWorkout() {
      try {
        setIsLoading(true)
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }

        // Verificar se o usuário pode acessar este treino
        const { data: canAccess, error: accessError } = await supabase
          .rpc('can_access_workout', {
            p_user_id: currentUser.id,
            p_workout_id: params.id
          })

        if (accessError) {
          console.error("Erro ao verificar acesso:", accessError)
          // Continuar mesmo com erro para não bloquear usuários
        } else if (canAccess === false) {
          // Redirecionar se o usuário não tiver acesso
          toast({
            title: "Acesso restrito",
            description: "Este treino não está disponível na sua conta gratuita. Faça upgrade para o plano premium para acessar todos os seus treinos.",
            variant: "destructive",
          })
          router.push("/dashboard/workouts")
          return
        }

        // Buscar o treino
        const { data: workoutData, error: workoutError } = await supabase
          .from("workouts")
          .select("*")
          .eq("id", params.id)
          .single()

        if (workoutError) {
          throw workoutError
        }

        // Verificar se o usuário é o dono do treino
        if (workoutData.created_by !== currentUser.id) {
          toast({
            title: "Acesso negado",
            description: "Você não tem permissão para editar este treino.",
            variant: "destructive",
          })
          router.push(`/dashboard/workouts/${params.id}`)
          return
        }

        // Verificar se o treino está oculto e o usuário é gratuito
        if (workoutData.is_hidden && currentUser.role === 'free') {
          toast({
            title: "Acesso restrito",
            description: "Este treino não está disponível na sua conta gratuita. Faça upgrade para o plano premium para acessar todos os seus treinos.",
            variant: "destructive",
          })
          router.push("/dashboard/workouts")
          return
        }

        setWorkout(workoutData)

        // Buscar exercícios do treino
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("workout_exercises")
          .select(`
            *,
            exercise:exercises(*)
          `)
          .eq("workout_id", params.id)
          .order("order_position", { ascending: true })

        if (exercisesError) {
          throw exercisesError
        }

        setExercises(exercisesData as any)
      } catch (error) {
        console.error("Erro ao buscar detalhes do treino:", error)
        toast({
          title: "Erro ao carregar treino",
          description: "Não foi possível carregar os detalhes do treino.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkout()
  }, [params.id, router])

  const handleUpdateWorkout = async (data: {
    name: string
    description: string
    goal_id?: string
    is_public: boolean
  }) => {
    try {
      setIsSaving(true)
      
      const { error } = await supabase
        .from("workouts")
        .update({
          name: data.name,
          description: data.description || null,
          goal_id: data.goal_id || null,
          is_public: data.is_public,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)
        
      if (error) {
        throw error
      }
      
      toast({
        title: "Treino atualizado",
        description: "As informações do treino foram atualizadas com sucesso.",
      })
      
      // Atualizar o estado local
      setWorkout(prev => {
        if (!prev) return null
        return {
          ...prev,
          name: data.name,
          description: data.description || null,
          goal_id: data.goal_id || null,
          is_public: data.is_public,
          updated_at: new Date().toISOString(),
        }
      })
    } catch (error) {
      console.error("Erro ao atualizar treino:", error)
      toast({
        title: "Erro ao atualizar treino",
        description: "Não foi possível atualizar as informações do treino.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <h2 className="text-2xl font-bold">Treino não encontrado</h2>
        <p className="text-muted-foreground mb-4">O treino que você está procurando não existe ou foi removido.</p>
        <Button asChild>
          <Link href="/dashboard/workouts">Voltar para treinos</Link>
        </Button>
      </div>
    )
  }

  // Criar uma versão do workout com is_public como boolean definido
  const workoutForForm = {
    ...workout,
    is_public: workout.is_public === false ? false : true
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/workouts/${params.id}`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Editar Treino</h2>
        </div>
        {isSaving && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </div>
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="info">Informações do Treino</TabsTrigger>
          <TabsTrigger value="exercises">Exercícios</TabsTrigger>
        </TabsList>
        
        <TabsContent value="info" className="mt-6">
          <div className="rounded-lg border p-6">
            <WorkoutForm 
              workout={workoutForForm} 
              onSubmit={handleUpdateWorkout} 
              isLoading={isSaving} 
            />
          </div>
        </TabsContent>
        
        <TabsContent value="exercises" className="mt-6">
          <div className="rounded-lg border p-6">
            <WorkoutExerciseEditor 
              workoutId={params.id} 
              initialExercises={exercises} 
              onExercisesUpdated={(updatedExercises) => setExercises(updatedExercises)} 
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 