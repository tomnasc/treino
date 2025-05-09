"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Save, Copy, Check, Edit, Dumbbell, Bug } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"
import { getCurrentUser } from "@/app/lib/auth"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog"

interface AIWorkoutResultProps {
  rawOutput: string
  parsedWorkout: {
    name: string
    description: string
    exercises: Array<{
      name: string
      sets: number
      reps: string
      restTime: number
      weight: string | null
      order: number
      dayOfWeek: number
    }>
  }
  onBack: () => void
}

export function AIWorkoutResult({ rawOutput, parsedWorkout, onBack }: AIWorkoutResultProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'
  
  // Adicionar log para depuração
  console.log("AIWorkoutResult - Raw Output:", rawOutput);
  console.log("AIWorkoutResult - Parsed Workout:", parsedWorkout);
  
  // Agrupar exercícios por dia
  const exercisesByDay = parsedWorkout.exercises.reduce((acc, exercise) => {
    const day = exercise.dayOfWeek;
    if (!acc[day]) acc[day] = [];
    acc[day].push(exercise);
    return acc;
  }, {} as Record<number, typeof parsedWorkout.exercises>);
  
  // Extrair observações do rawOutput
  const extractObservations = (text: string): string[] => {
    const observationMatches = text.match(/OBSERVAÇÕES:\s*([^]*)$/i);
    
    if (observationMatches && observationMatches[1]) {
      return observationMatches[1]
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('-') || line.startsWith('•'))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0);
    }
    
    return [];
  };
  
  const observations = extractObservations(rawOutput);
  
  // Função para encontrar ou criar um exercício
  const findOrCreateExercise = async (name: string, userId: string) => {
    // Tentar encontrar o exercício pelo nome
    const { data: existingExercise } = await supabase
      .from("exercises")
      .select("id")
      .or(`name.ilike.${name},name.ilike.${name.toLowerCase()}`)
      .limit(1)
      .single()
      
    if (existingExercise) {
      return existingExercise.id
    }
    
    // Criar novo exercício se não existir
    const { data: newExercise, error } = await supabase
      .from("exercises")
      .insert({
        name: name,
        created_by: userId,
        is_public: false,
      })
      .select()
      .single()
      
    if (error) {
      console.error("Erro ao criar exercício:", error)
      throw error
    }
    
    return newExercise.id
  }
  
  const saveWorkout = async () => {
    try {
      setIsSaving(true)
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      
      // Array para armazenar os IDs dos treinos criados
      const workoutIds: string[] = [];
      
      // Processamento por dia
      for (const [day, exercises] of Object.entries(exercisesByDay)) {
        // Nome para este dia específico
        const dayName = `${parsedWorkout.name} - Dia ${day}`;
        
        // Criar o treino para este dia
        const { data: workoutData, error: workoutError } = await supabase
          .from("workouts")
          .insert({
            name: dayName,
            description: parsedWorkout.description,
            created_by: currentUser.id,
            is_ai_generated: true,
          })
          .select()
          .single();
          
        if (workoutError) {
          throw workoutError;
        }
        
        const workoutId = workoutData.id;
        workoutIds.push(workoutId);
        
        // Processar exercícios deste dia
        const exerciseInserts = [];
        for (const exercise of exercises) {
          const exerciseId = await findOrCreateExercise(exercise.name, currentUser.id);
          exerciseInserts.push({
            workout_id: workoutId,
            exercise_id: exerciseId,
            sets: exercise.sets,
            reps: exercise.reps,
            rest_time: exercise.restTime,
            weight: exercise.weight,
            order_position: exercise.order,
            exercise_type: "reps"  // Adicionando o tipo de exercício como "reps" por padrão
          });
        }
        
        const { error: exercisesError } = await supabase
          .from("workout_exercises")
          .insert(exerciseInserts);
          
        if (exercisesError) {
          throw exercisesError;
        }
      }
      
      toast({
        title: `${workoutIds.length} treinos salvos com sucesso!`,
        description: `Foram criados ${workoutIds.length} treinos, um para cada dia do plano.`,
      })
      
      // Redirecionar para a página de treinos
      router.push('/dashboard/workouts');
    } catch (error) {
      console.error("Erro ao salvar treino:", error)
      toast({
        title: "Erro ao salvar treino",
        description: "Não foi possível salvar o treino. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center space-x-2">
          {isDev && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Bug className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Debug</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Saída Bruta da IA</DialogTitle>
                  <DialogDescription>
                    Usado para depuração do formato e processamento
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Texto bruto:</h3>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-[200px]">
                      {rawOutput}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Dados processados:</h3>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-[200px]">
                      {JSON.stringify(parsedWorkout, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-2">Exercícios por dia:</h3>
                    <pre className="whitespace-pre-wrap bg-muted p-4 rounded-md text-sm font-mono overflow-auto max-h-[200px]">
                      {JSON.stringify(exercisesByDay, null, 2)}
                    </pre>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm">
                <Save className="mr-2 h-4 w-4" />
                Salvar Treino
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Salvar este treino?</AlertDialogTitle>
                <AlertDialogDescription>
                  {Object.keys(exercisesByDay).length > 0 ? 
                    `Serão criados ${Object.keys(exercisesByDay).length} treinos, um para cada dia do plano.` : 
                    "Este treino será adicionado à sua lista de treinos."
                  }
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={saveWorkout} disabled={isSaving}>
                  {isSaving ? 'Salvando...' : 'Salvar Treino'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{parsedWorkout.name}</CardTitle>
          <CardDescription>
            {parsedWorkout.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.keys(exercisesByDay).length > 0 ? (
              Object.entries(exercisesByDay).map(([day, exercises]) => (
                <div key={day} className="space-y-2">
                  <h3 className="text-lg font-semibold">
                    Dia {day} 
                  </h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Exercício</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Séries</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Reps</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Descanso</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Peso</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-gray-200 dark:divide-gray-800">
                        {exercises.map((exercise, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-background' : ''}>
                            <td className="px-4 py-3 text-sm">{exercise.name}</td>
                            <td className="px-4 py-3 text-sm">{exercise.sets}</td>
                            <td className="px-4 py-3 text-sm">{exercise.reps}</td>
                            <td className="px-4 py-3 text-sm">{exercise.restTime}s</td>
                            <td className="px-4 py-3 text-sm">{exercise.weight || 'Consulte o instrutor'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhum exercício encontrado</h3>
                <p className="text-muted-foreground max-w-md">
                  Não foi possível processar os exercícios deste treino. Tente gerar um novo plano de treino.
                </p>
              </div>
            )}
            
            {observations.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-3">Observações</h3>
                <ul className="space-y-2 list-disc pl-5">
                  {observations.map((obs, index) => (
                    <li key={index} className="text-sm">{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Gerar Outro Treino
          </Button>
          <Button onClick={saveWorkout} disabled={isSaving}>
            {isSaving ? (
              <>Salvando...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar nos Meus Treinos
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 