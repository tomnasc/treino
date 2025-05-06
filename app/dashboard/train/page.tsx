"use client"

import React, { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Clock, PlayCircle, Plus, Search, Filter, ArrowUpDown } from "lucide-react"
import Link from "next/link"

import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Exercise, Workout, WorkoutExercise } from "@/app/types/database.types"
import { supabase } from "@/app/lib/supabase"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { WorkoutPlayer } from "@/app/components/workouts/workout-player"

export default function TrainPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const workoutId = searchParams.get("workout")
  const { toast } = useToast()
  
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [exercises, setExercises] = useState<(WorkoutExercise & { exercise: Exercise })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [workoutStarted, setWorkoutStarted] = useState(false)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [existingWorkoutHistoryId, setExistingWorkoutHistoryId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }

        if (workoutId) {
          // Buscar o treino específico
          const { data: workoutData, error: workoutError } = await supabase
            .from("workouts")
            .select("*")
            .eq("id", workoutId)
            .single()
            
          if (workoutError) {
            throw workoutError
          }
          
          setWorkout(workoutData)
          
          // Buscar exercícios do treino
          const { data: exercisesData, error: exercisesError } = await supabase
            .from("workout_exercises")
            .select(`
              *,
              exercise:exercises(*)
            `)
            .eq("workout_id", workoutId)
            .order("order_position", { ascending: true })
            
          if (exercisesError) {
            throw exercisesError
          }
          
          setExercises(exercisesData as any)
          
          // Verificar se existe um treino em andamento para este workout
          const { data: existingWorkoutHistory, error: existingWorkoutError } = await supabase
            .from("workout_history")
            .select("id")
            .eq("workout_id", workoutId)
            .eq("user_id", currentUser.id)
            .eq("completed", false)
            .order("started_at", { ascending: false })
            .maybeSingle()
          
          if (!existingWorkoutError && existingWorkoutHistory) {
            console.log("Encontrado treino em andamento:", existingWorkoutHistory.id);
            
            // Verificar se existe estado salvo para este treino no localStorage ou sessionStorage
            const savedState = typeof window !== 'undefined' 
              ? localStorage.getItem(`workout_state_${existingWorkoutHistory.id}`) || sessionStorage.getItem(`workout_state_backup_${existingWorkoutHistory.id}`)
              : null;
              
            console.log("Estado salvo encontrado:", !!savedState);
            
            // Se houver um treino não finalizado, restaurá-lo automaticamente
            setExistingWorkoutHistoryId(existingWorkoutHistory.id);
            
            // Verificar se existe histórico de exercícios associado a este treino
            try {
              const { data: exerciseHistoryData } = await supabase
                .from("exercise_history")
                .select("*")
                .eq("workout_history_id", existingWorkoutHistory.id);
                
              const hasExerciseHistory = exerciseHistoryData && exerciseHistoryData.length > 0;
              console.log("Histórico de exercícios no banco:", hasExerciseHistory ? exerciseHistoryData.length + " registros" : "nenhum");
              
              // Se tem estado salvo ou histórico no banco, retomar o treino automaticamente
              if (savedState || hasExerciseHistory) {
                // Vamos iniciar o treino automaticamente
                sessionStorage.setItem("currentWorkoutHistoryId", existingWorkoutHistory.id);
                setWorkoutStarted(true);
                console.log("Treino em andamento retomado automaticamente");
              } else {
                console.log("Treino em andamento encontrado, mas sem dados salvos - aguardando ação do usuário");
              }
            } catch (error) {
              console.error("Erro ao verificar histórico de exercícios:", error);
              // Mesmo com erro, permitir retomar o treino
              if (savedState) {
                sessionStorage.setItem("currentWorkoutHistoryId", existingWorkoutHistory.id);
                setWorkoutStarted(true);
              }
            }
          }
        } else {
          // Buscar todos os treinos disponíveis
          const { data, error } = await supabase
            .from("workouts")
            .select("*")
            .eq("created_by", currentUser.id)
            .order("created_at", { ascending: sortOrder === 'asc' })

          if (error) {
            throw error
          }
          
          setWorkouts(data || [])
        }
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados necessários.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [workoutId, sortOrder, router])

  const startWorkout = async () => {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser || !workout) {
        return
      }
      
      // Se já existe um treino em andamento, retomá-lo
      if (existingWorkoutHistoryId) {
        console.log("Retomando treino existente:", existingWorkoutHistoryId);
        sessionStorage.setItem("currentWorkoutHistoryId", existingWorkoutHistoryId);
        setWorkoutStarted(true);
        
        toast({
          title: "Treino retomado",
          description: "Retomando seu treino anterior em andamento.",
        });
        
        return;
      }
      
      console.log("Iniciando novo treino");
      
      // Criar um registro de histórico de treino
      const { data: historyData, error } = await supabase
        .from("workout_history")
        .insert({
          workout_id: workout.id,
          user_id: currentUser.id,
          started_at: new Date().toISOString(),
          completed: false,
        })
        .select()
        .single()
        
      if (error) {
        throw error
      }
      
      console.log("Novo treino criado com ID:", historyData.id);
      setWorkoutStarted(true)
      
      toast({
        title: "Treino iniciado",
        description: "Seu treino foi iniciado com sucesso. Bom treino!",
      })
      
      // Salvar o ID do histórico para usar mais tarde
      sessionStorage.setItem("currentWorkoutHistoryId", historyData.id)
      
      // Inicializar estado vazio no localStorage para garantir persistência
      const initialState = {
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercisesCompleted: [],
        workoutDuration: 0,
        exerciseHistory: {},
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(`workout_state_${historyData.id}`, JSON.stringify(initialState));
      sessionStorage.setItem(`workout_state_backup_${historyData.id}`, JSON.stringify(initialState));
    } catch (error) {
      console.error("Erro ao iniciar treino:", error)
      toast({
        title: "Erro ao iniciar treino",
        description: "Não foi possível iniciar o treino. Tente novamente.",
        variant: "destructive",
      })
    }
  }

  const filteredWorkouts = workouts.filter(workout => 
    workout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (workout.description && workout.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  // Mostrar uma lista de treinos disponíveis se não houver um treino selecionado
  if (!workoutId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Modo Treino</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex flex-1 max-w-sm items-center space-x-2">
            <Input
              placeholder="Buscar treinos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              type="search"
            />
            <Button variant="outline" size="icon">
              <Search className="h-4 w-4" />
              <span className="sr-only">Buscar</span>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleSortOrder}>
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {sortOrder === 'asc' ? 'Mais novos' : 'Mais antigos'}
            </Button>
            <Button asChild>
              <Link href="/dashboard/workouts/new">
                <Plus className="mr-2 h-4 w-4" />
                Novo Treino
              </Link>
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-[400px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : filteredWorkouts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWorkouts.map((workout) => (
              <div 
                key={workout.id} 
                className="rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/50"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{workout.name}</h3>
                    {workout.is_ai_generated && (
                      <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary">
                        IA
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                    {workout.description || "Sem descrição"}
                  </p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {workout.created_at ? new Date(workout.created_at).toLocaleDateString() : 'Data não disponível'}
                    </span>
                    <Button asChild>
                      <Link href={`/dashboard/train?workout=${workout.id}`}>
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Treinar
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) :
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-[400px]">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <h3 className="mt-4 text-lg font-semibold">Nenhum treino encontrado</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                {searchTerm 
                  ? "Não encontramos treinos com esses termos. Tente uma busca diferente." 
                  : "Você ainda não criou nenhum treino. Comece criando um agora!"}
              </p>
              <Button asChild>
                <Link href="/dashboard/workouts/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Treino
                </Link>
              </Button>
            </div>
          </div>
        }
      </div>
    )
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
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Treino não encontrado</h2>
        </div>
        
        <div className="rounded-lg border p-6 text-center">
          <h3 className="text-lg font-semibold">Treino não encontrado</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            O treino que você está tentando acessar não existe ou foi removido.
          </p>
          <Button className="mt-4" asChild>
            <Link href="/dashboard/train">Ver meus treinos</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (exercises.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/workouts/${workout.id}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{workout.name}</h2>
        </div>
        
        <div className="rounded-lg border p-6 text-center">
          <h3 className="text-lg font-semibold">Sem exercícios</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Este treino não possui exercícios. Adicione exercícios antes de iniciar um treino.
          </p>
          <Button className="mt-4" asChild>
            <Link href={`/dashboard/workouts/${workout.id}/edit`}>Adicionar exercícios</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!workoutStarted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href={`/dashboard/train`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">{workout.name}</h2>
        </div>
        
        <div className="rounded-lg border p-6">
          <div className="flex flex-col items-center text-center sm:flex-row sm:text-left sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pronto para começar?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Este treino contém {exercises.length} exercícios.
              </p>
            </div>
            <Button 
              size="lg" 
              className="mt-4 sm:mt-0"
              onClick={startWorkout}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Iniciar Treino
            </Button>
          </div>
          
          <div className="mt-8 space-y-4">
            <h4 className="font-medium text-sm text-muted-foreground">Exercícios neste treino:</h4>
            <div className="divide-y">
              {exercises.map((exercise) => (
                <div key={exercise.id} className="py-3 flex items-center">
                  <span className="font-medium text-muted-foreground mr-2">
                    {exercise.order_position}.
                  </span>
                  <div>
                    <span className="font-medium">{exercise.exercise.name}</span>
                    <div className="text-sm text-muted-foreground">
                      {exercise.sets} séries × {exercise.reps} repetições
                      {exercise.weight && ` • ${exercise.weight}kg`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Quando o treino é iniciado, mostra o player de treino
  return (
    <WorkoutPlayer
      workout={workout}
      exercises={exercises}
      onFinish={() => {
        sessionStorage.removeItem("currentWorkoutHistoryId")
        router.push(`/dashboard/workouts/${workout.id}`)
      }}
    />
  )
} 