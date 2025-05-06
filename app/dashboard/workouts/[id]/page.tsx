"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronLeft, Edit, PlayCircle, Trash2, User } from "lucide-react"

import { supabase } from "@/app/lib/supabase"
import { Button } from "@/app/components/ui/button"
import { getCurrentUser } from "@/app/lib/auth"
import { Exercise, MuscleGroup, TrainingGoal, Workout, WorkoutExercise } from "@/app/types/database.types"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/components/ui/alert-dialog"
import { useToast } from "@/app/hooks/use-toast"
import { WorkoutExerciseList } from "@/app/components/workouts/workout-exercise-list"

interface WorkoutDetailsPageProps {
  params: {
    id: string
  }
}

export default function WorkoutDetailsPage({ params }: WorkoutDetailsPageProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<(WorkoutExercise & { exercise: Exercise })[]>([])
  const [goal, setGoal] = useState<TrainingGoal | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetchWorkout() {
      try {
        setIsLoading(true)
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
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

        setWorkout(workoutData)
        setIsOwner(workoutData.created_by === currentUser.id)

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

        // Buscar objetivo do treino se houver
        if (workoutData.goal_id) {
          const { data: goalData } = await supabase
            .from("training_goals")
            .select("*")
            .eq("id", workoutData.goal_id)
            .single()

          setGoal(goalData)
        }
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

  const handleDeleteWorkout = async () => {
    try {
      setIsDeleting(true)
      
      // Excluir os exercícios do treino primeiro
      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("workout_id", params.id)
        
      if (exercisesError) {
        throw exercisesError
      }
      
      // Excluir o treino
      const { error: workoutError } = await supabase
        .from("workouts")
        .delete()
        .eq("id", params.id)
        
      if (workoutError) {
        throw workoutError
      }
      
      toast({
        title: "Treino excluído",
        description: "O treino foi excluído com sucesso.",
      })
      
      router.push("/dashboard/workouts")
    } catch (error) {
      console.error("Erro ao excluir treino:", error)
      toast({
        title: "Erro ao excluir treino",
        description: "Não foi possível excluir o treino. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/workouts">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{workout.name}</h2>
          {workout.is_ai_generated && (
            <span className="ml-2 rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary">
              IA
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isOwner && (
            <>
              <Button variant="outline" asChild className="flex-1 sm:flex-none">
                <Link href={`/dashboard/workouts/${params.id}/edit`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="flex-1 sm:flex-none">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir treino</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este treino? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteWorkout}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? "Excluindo..." : "Excluir"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button asChild className="flex-1 sm:flex-none">
            <Link href={`/dashboard/train?workout=${params.id}`}>
              <PlayCircle className="mr-2 h-4 w-4" />
              Iniciar Treino
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Detalhes do treino */}
          <div className="rounded-lg border p-4 sm:p-6 overflow-hidden">
            {workout.description && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">Descrição</h3>
                <p className="text-muted-foreground whitespace-pre-line break-words">{workout.description}</p>
              </div>
            )}

            {goal && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Objetivo</h3>
                <div className="inline-flex items-center rounded-full bg-secondary/10 px-3 py-1 text-sm text-secondary">
                  {goal.name}
                </div>
                {goal.description && (
                  <p className="text-sm text-muted-foreground mt-1 break-words">{goal.description}</p>
                )}
              </div>
            )}
          </div>

          {/* Lista de exercícios */}
          <div className="rounded-lg border p-4 sm:p-6 overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">Exercícios</h3>
            {exercises.length > 0 ? (
              <WorkoutExerciseList exercises={exercises} />
            ) : (
              <div className="text-center py-8 border border-dashed rounded-lg">
                <p className="text-muted-foreground">
                  Este treino ainda não possui exercícios.
                </p>
                {isOwner && (
                  <Button asChild className="mt-4">
                    <Link href={`/dashboard/workouts/${params.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Adicionar Exercícios
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações adicionais */}
          <div className="rounded-lg border p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4">Informações</h3>
            <div className="space-y-3">
              <div className="flex justify-between flex-wrap gap-2">
                <span className="text-muted-foreground">Criado em</span>
                <span>{workout.created_at ? new Date(workout.created_at).toLocaleDateString() : 'Indisponível'}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-2">
                <span className="text-muted-foreground">Visibilidade</span>
                <span>{workout.is_public ? 'Público' : 'Privado'}</span>
              </div>
              <div className="flex justify-between flex-wrap gap-2">
                <span className="text-muted-foreground">Número de exercícios</span>
                <span>{exercises.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 