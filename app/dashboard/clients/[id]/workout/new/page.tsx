"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Dumbbell, Save, Plus, Trash2, Loader2 } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { ClientProfile } from "@/app/types/client.types"

interface Exercise {
  id: string
  name: string
  muscle_group_id: string | null
  description?: string | null
  created_at?: string | null
  created_by?: string | null
  image_url?: string | null
  is_public?: boolean | null
  updated_at?: string | null
  youtube_url?: string | null
  muscle_group?: {
    id: string
    name: string
    description?: string | null
    created_at?: string | null
  } | null
}

interface WorkoutExercise {
  id?: string
  exercise_id: string
  exercise?: Exercise
  sets: number
  reps: string
  rest_time?: number
  weight?: string
  notes?: string
  order_position: number
}

export default function NewClientWorkoutPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.id
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [client, setClient] = useState<ClientProfile | null>(null)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [muscleGroups, setMuscleGroups] = useState<any[]>([])
  
  const [workoutName, setWorkoutName] = useState("")
  const [workoutDescription, setWorkoutDescription] = useState("")
  const [selectedExercises, setSelectedExercises] = useState<WorkoutExercise[]>([])
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>("all")
  
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Verificar se o usuário é personal trainer
        if (currentUser.role !== "personal" && currentUser.role !== "admin") {
          router.push("/dashboard")
          toast({
            title: "Acesso negado",
            description: "Esta área é exclusiva para personal trainers.",
            variant: "destructive"
          })
          return
        }
        
        // Verificar se o personal é responsável por este cliente
        const { data: relationship, error: relationshipError } = await supabase
          .from("client_relationships")
          .select("*")
          .eq("personal_id", currentUser.id)
          .eq("client_id", clientId)
          .eq("status", "active")
          .maybeSingle()
        
        if (relationshipError) {
          throw relationshipError
        }
        
        if (!relationship) {
          router.push("/dashboard/clients")
          toast({
            title: "Cliente não encontrado",
            description: "Este cliente não está vinculado ao seu perfil ou foi removido.",
            variant: "destructive"
          })
          return
        }
        
        // Buscar perfil do cliente
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", clientId)
          .single()
        
        if (profileError) {
          throw profileError
        }
        
        setClient(profileData)
        
        // Buscar grupos musculares
        const { data: muscleGroupsData, error: muscleGroupsError } = await supabase
          .from("muscle_groups")
          .select("*")
          .order("name")
        
        if (muscleGroupsError) {
          throw muscleGroupsError
        }
        
        setMuscleGroups(muscleGroupsData || [])
        
        // Buscar exercícios
        const { data: exercisesData, error: exercisesError } = await supabase
          .from("exercises")
          .select(`
            *,
            muscle_group:muscle_groups(*)
          `)
          .order("name")
        
        if (exercisesError) {
          throw exercisesError
        }
        
        setExercises(exercisesData || [])
        
      } catch (error) {
        console.error("Erro ao inicializar página:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar os dados necessários. Tente novamente mais tarde.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [router, clientId])
  
  // Filtrar exercícios por grupo muscular
  const filteredExercises = selectedMuscleGroup && selectedMuscleGroup !== "all"
    ? exercises.filter(ex => ex.muscle_group_id === selectedMuscleGroup)
    : exercises
  
  // Adicionar exercício ao treino
  const handleAddExercise = (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId)
    if (!exercise) return
    
    const newExercise: WorkoutExercise = {
      exercise_id: exerciseId,
      exercise: exercise,
      sets: 3,
      reps: "10",
      rest_time: 60,
      order_position: selectedExercises.length + 1
    }
    
    setSelectedExercises([...selectedExercises, newExercise])
  }
  
  // Remover exercício do treino
  const handleRemoveExercise = (index: number) => {
    const updatedExercises = [...selectedExercises]
    updatedExercises.splice(index, 1)
    
    // Atualizar posições
    updatedExercises.forEach((ex, idx) => {
      ex.order_position = idx + 1
    })
    
    setSelectedExercises(updatedExercises)
  }
  
  // Atualizar detalhes do exercício
  const handleUpdateExercise = (index: number, field: string, value: any) => {
    const updatedExercises = [...selectedExercises]
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value
    }
    setSelectedExercises(updatedExercises)
  }
  
  // Salvar treino
  const handleSaveWorkout = async () => {
    try {
      setIsSaving(true)
      
      if (!workoutName.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "Por favor, informe um nome para o treino.",
          variant: "destructive"
        })
        return
      }
      
      if (selectedExercises.length === 0) {
        toast({
          title: "Sem exercícios",
          description: "Por favor, adicione pelo menos um exercício ao treino.",
          variant: "destructive"
        })
        return
      }
      
      const currentUser = await getCurrentUser()
      if (!currentUser) return
      
      // Inserir treino
      const { data: workoutData, error: workoutError } = await supabase
        .from("workouts")
        .insert({
          name: workoutName,
          description: workoutDescription || null,
          created_by: currentUser.id,
          assigned_to: clientId
        })
        .select("id")
        .single()
      
      if (workoutError) {
        throw workoutError
      }
      
      // Inserir exercícios do treino
      const workoutExercises = selectedExercises.map(ex => ({
        workout_id: workoutData.id,
        exercise_id: ex.exercise_id,
        sets: ex.sets,
        reps: ex.reps,
        rest_time: ex.rest_time || null,
        weight: ex.weight || null,
        notes: ex.notes || null,
        order_position: ex.order_position
      }))
      
      const { error: exercisesError } = await supabase
        .from("workout_exercises")
        .insert(workoutExercises)
      
      if (exercisesError) {
        throw exercisesError
      }
      
      toast({
        title: "Treino criado com sucesso!",
        description: "O treino foi criado e atribuído ao aluno."
      })
      
      // Redirecionar para a página do cliente
      router.push(`/dashboard/clients/${clientId}`)
      
    } catch (error) {
      console.error("Erro ao salvar treino:", error)
      toast({
        title: "Erro ao salvar treino",
        description: "Não foi possível salvar o treino. Tente novamente mais tarde.",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }
  
  // Obter as iniciais do nome do cliente
  function getInitials(name: string | null): string {
    if (!name) return "U"
    
    const nameParts = name.split(" ")
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase()
    
    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase()
  }
  
  if (isLoading || !client) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/clients/${clientId}`)}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <h2 className="text-3xl font-bold tracking-tight">Novo Treino</h2>
      </div>
      
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Dumbbell className="h-5 w-5 mr-2" />
                Detalhes do Treino
              </CardTitle>
              <CardDescription>
                Informações gerais do treino para {client.full_name || 'aluno'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="workout-name">Nome do treino</Label>
                <Input
                  id="workout-name"
                  placeholder="Ex: Treino A - Peito e Tríceps"
                  value={workoutName}
                  onChange={(e) => setWorkoutName(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workout-description">Descrição (opcional)</Label>
                <Textarea
                  id="workout-description"
                  placeholder="Instruções ou observações para o treino"
                  value={workoutDescription}
                  onChange={(e) => setWorkoutDescription(e.target.value)}
                  rows={4}
                />
              </div>
              
              <Button
                className="w-full"
                onClick={handleSaveWorkout}
                disabled={isSaving || !workoutName || selectedExercises.length === 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Treino
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Exercícios</CardTitle>
              <CardDescription>
                Selecione os exercícios para adicionar ao treino
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="muscle-group">Filtrar por grupo muscular</Label>
                <Select
                  value={selectedMuscleGroup}
                  onValueChange={setSelectedMuscleGroup}
                >
                  <SelectTrigger id="muscle-group">
                    <SelectValue placeholder="Todos os grupos musculares" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos musculares</SelectItem>
                    {muscleGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="h-[300px] overflow-y-auto border rounded-md">
                <div className="p-2 space-y-1">
                  {filteredExercises.map((exercise) => (
                    <div 
                      key={exercise.id}
                      className="p-2 flex justify-between items-center border-b last:border-0 hover:bg-muted/50"
                    >
                      <div>
                        <div className="font-medium">{exercise.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {exercise.muscle_group?.name}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAddExercise(exercise.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {filteredExercises.length === 0 && (
                    <div className="p-4 text-center text-muted-foreground">
                      Nenhum exercício encontrado
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Dumbbell className="h-5 w-5 mr-2" />
                Exercícios Adicionados
              </CardTitle>
              <CardDescription>
                Configure os detalhes dos exercícios adicionados ao treino
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedExercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 border rounded-md">
                  <Dumbbell className="h-16 w-16 text-muted-foreground mb-4 opacity-30" />
                  <h3 className="text-lg font-medium">Nenhum exercício adicionado</h3>
                  <p className="text-sm text-muted-foreground mt-2 mb-6 max-w-md text-center">
                    Selecione exercícios da lista ao lado para adicionar ao treino. 
                    Você poderá configurar séries, repetições e outros detalhes aqui.
                  </p>
                </div>
              ) : (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">#</TableHead>
                        <TableHead>Exercício</TableHead>
                        <TableHead className="w-20">Séries</TableHead>
                        <TableHead className="w-20">Reps</TableHead>
                        <TableHead className="w-20">Descanso</TableHead>
                        <TableHead className="w-32">Peso/Carga</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedExercises.map((exercise, index) => (
                        <TableRow key={index}>
                          <TableCell>{exercise.order_position}</TableCell>
                          <TableCell>
                            <div className="font-medium">{exercise.exercise?.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {exercise.exercise?.muscle_group?.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={1}
                              max={10}
                              value={exercise.sets}
                              onChange={(e) => handleUpdateExercise(index, "sets", parseInt(e.target.value, 10) || 1)}
                              className="h-8 w-16"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={exercise.reps}
                              onChange={(e) => handleUpdateExercise(index, "reps", e.target.value)}
                              className="h-8 w-16"
                              placeholder="10-12"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <Input
                                type="number"
                                min={0}
                                max={300}
                                value={exercise.rest_time || ""}
                                onChange={(e) => handleUpdateExercise(index, "rest_time", parseInt(e.target.value, 10) || 0)}
                                className="h-8 w-16"
                              />
                              <span className="ml-1 text-xs text-muted-foreground">seg</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={exercise.weight || ""}
                              onChange={(e) => handleUpdateExercise(index, "weight", e.target.value)}
                              className="h-8"
                              placeholder="Ex: 10kg ou Médio"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveExercise(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 