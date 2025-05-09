"use client"

import { useEffect, useState } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Plus, Trash2, GripVertical, Info, Search, Loader2, Save, Video, Edit } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Exercise, WorkoutExercise } from "@/app/types/database.types"
import { supabase } from "@/app/lib/supabase"
import { useToast } from "@/app/hooks/use-toast"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { YouTubePlayer } from "@/app/components/ui/youtube-player"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/app/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"

interface WorkoutExerciseEditorProps {
  workoutId: string
  initialExercises: (WorkoutExercise & { exercise: Exercise })[]
  onExercisesUpdated: (exercises: (WorkoutExercise & { exercise: Exercise })[]) => void
}

export function WorkoutExerciseEditor({
  workoutId,
  initialExercises,
  onExercisesUpdated,
}: WorkoutExerciseEditorProps) {
  const { toast } = useToast()
  const [exercises, setExercises] = useState<(WorkoutExercise & { exercise: Exercise })[]>(initialExercises)
  const [allExercises, setAllExercises] = useState<Exercise[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [showNewExerciseForm, setShowNewExerciseForm] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState("")
  const [newExerciseDescription, setNewExerciseDescription] = useState("")
  const [newExerciseType, setNewExerciseType] = useState<"reps" | "time">("reps")
  const [newExerciseYoutubeUrl, setNewExerciseYoutubeUrl] = useState("")
  const [newExerciseData, setNewExerciseData] = useState({
    sets: 3,
    reps: "12",
    time: "60",
    weight: "",
    rest_time: 60,
    notes: "",
    exercise_type: "reps" as "reps" | "time"
  })
  const [isEditingExercise, setIsEditingExercise] = useState(false)
  const [isAddingExercise, setIsAddingExercise] = useState(false)
  const [exerciseToEdit, setExerciseToEdit] = useState<(WorkoutExercise & { exercise: Exercise }) | null>(null)
  const [editingYoutubeUrl, setEditingYoutubeUrl] = useState("")

  useEffect(() => {
    async function fetchExercises() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("exercises")
          .select("*")

        if (error) {
          throw error
        }

        setAllExercises(data || [])
      } catch (error) {
        console.error("Erro ao buscar exercícios:", error)
        toast({
          title: "Erro ao carregar exercícios",
          description: "Não foi possível carregar a lista de exercícios.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchExercises()
  }, [])

  const filteredExercises = allExercises.filter(exercise => 
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (exercise.description && exercise.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleDragEnd = async (result: any) => {
    if (!result.destination) return

    const reorderedExercises = Array.from(exercises)
    const [removed] = reorderedExercises.splice(result.source.index, 1)
    reorderedExercises.splice(result.destination.index, 0, removed)

    // Atualizar as posições
    const updatedExercises = reorderedExercises.map((exercise, index) => ({
      ...exercise,
      order_position: index + 1,
    }))

    setExercises(updatedExercises)
    onExercisesUpdated(updatedExercises)

    // Salvar as novas posições no banco de dados
    try {
      setIsSaving(true)
      
      for (const exercise of updatedExercises) {
        await supabase
          .from("workout_exercises")
          .update({ order_position: exercise.order_position })
          .eq("id", exercise.id)
      }
      
      toast({
        title: "Ordem atualizada",
        description: "A ordem dos exercícios foi atualizada com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao atualizar ordem:", error)
      toast({
        title: "Erro ao atualizar ordem",
        description: "Não foi possível salvar a nova ordem dos exercícios.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddExercise = async () => {
    if (!selectedExercise) return

    try {
      setIsSaving(true)

      // Verificar se há limite de exercícios para usuários gratuitos
      const { data: canAddExercise, error: limitError } = await supabase
        .rpc('check_free_user_exercise_limits', {
          workout_id: workoutId
        })
        
      if (limitError) {
        throw limitError
      }
      
      if (canAddExercise === false) {
        toast({
          title: "Limite atingido",
          description: "Usuários gratuitos podem adicionar no máximo 7 exercícios por treino. Faça upgrade para o plano premium para ter exercícios ilimitados.",
          variant: "destructive",
        })
        setIsSaving(false)
        return
      }

      // Calcular a próxima posição
      const nextPosition = exercises.length > 0 
        ? Math.max(...exercises.map(e => e.order_position)) + 1
        : 1

      // Criar objeto com dados básicos
      const exerciseData: any = {
        workout_id: workoutId,
        exercise_id: selectedExercise.id,
        order_position: nextPosition,
        sets: newExerciseData.sets,
        weight: newExerciseData.weight || null,
        rest_time: newExerciseData.rest_time || null,
        notes: newExerciseData.notes || null,
        // Sempre incluir o tipo de exercício
        exercise_type: newExerciseData.exercise_type,
      }

      // Adicionar campos conforme o tipo de exercício
      if (newExerciseData.exercise_type === 'reps') {
        exerciseData.reps = newExerciseData.reps
        // Garantir que o campo time esteja nulo para exercícios de repetições
        exerciseData.time = null
      } else {
        exerciseData.time = newExerciseData.time
        // Para exercícios de tempo, usar um valor padrão para reps (já que o banco não aceita null)
        exerciseData.reps = "0"
      }

      // Adicionar o exercício ao treino
      const { data, error } = await supabase
        .from("workout_exercises")
        .insert(exerciseData)
        .select("*, exercise:exercises(*)")
        .single()

      if (error) {
        throw error
      }

      // Normalizar o exercício adicionado para garantir tipo correto
      const normalizedExercise = { ...data };
      if (normalizedExercise.exercise_type === 'time' && !normalizedExercise.time) {
        normalizedExercise.time = newExerciseData.time;
      }

      // Adicionar o novo exercício à lista
      const updatedExercises = [...exercises, normalizedExercise as any]
      setExercises(updatedExercises)
      onExercisesUpdated(updatedExercises)

      // Limpar os campos
      setSelectedExercise(null)
      setNewExerciseData({
        sets: 3,
        reps: "12",
        time: "60",
        weight: "",
        rest_time: 60,
        notes: "",
        exercise_type: "reps"
      })

      toast({
        title: "Exercício adicionado",
        description: "O exercício foi adicionado ao treino com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao adicionar exercício:", error)
      toast({
        title: "Erro ao adicionar exercício",
        description: "Não foi possível adicionar o exercício ao treino.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemoveExercise = async (exerciseId: string) => {
    try {
      setIsSaving(true)

      // Remover o exercício do banco de dados
      const { error } = await supabase
        .from("workout_exercises")
        .delete()
        .eq("id", exerciseId)

      if (error) {
        throw error
      }

      // Remover o exercício da lista
      const updatedExercises = exercises.filter(e => e.id !== exerciseId)
      
      // Reordenar os exercícios restantes
      const reorderedExercises = updatedExercises.map((exercise, index) => ({
        ...exercise,
        order_position: index + 1,
      }))
      
      // Atualizar as posições no banco de dados
      for (const exercise of reorderedExercises) {
        await supabase
          .from("workout_exercises")
          .update({ order_position: exercise.order_position })
          .eq("id", exercise.id)
      }

      setExercises(reorderedExercises)
      onExercisesUpdated(reorderedExercises)

      toast({
        title: "Exercício removido",
        description: "O exercício foi removido do treino com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao remover exercício:", error)
      toast({
        title: "Erro ao remover exercício",
        description: "Não foi possível remover o exercício do treino.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const createNewExercise = async () => {
    if (!newExerciseName) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para o exercício.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSaving(true)
      const { data: currentUser } = await supabase.auth.getUser()
      
      // Criar objeto de dados para inserção
      const exerciseData: any = {
        name: newExerciseName,
        description: newExerciseDescription || null,
        created_by: currentUser.user?.id,
        youtube_url: newExerciseYoutubeUrl || null
      }

      // Adicionar exercise_type se suportado
      if (newExerciseType) {
        exerciseData.exercise_type = newExerciseType
      }
      
      // Criar o novo exercício
      const { data, error } = await supabase
        .from("exercises")
        .insert(exerciseData)
        .select()
        .single()

      if (error) {
        throw error
      }

      // Atualizar a lista de exercícios
      setAllExercises([...allExercises, data])
      
      // Selecionar o exercício recém-criado
      setSelectedExercise(data)
      
      // Atualizar tipo do exercício nas configurações
      setNewExerciseData({
        ...newExerciseData,
        exercise_type: (data as any).exercise_type || "reps"
      })
      
      // Limpar o formulário e escondê-lo
      setNewExerciseName("")
      setNewExerciseDescription("")
      setNewExerciseType("reps")
      setNewExerciseYoutubeUrl("")
      setShowNewExerciseForm(false)
      
      // Atualizar o termo de busca para mostrar o novo exercício
      setSearchTerm(data.name)
      
      toast({
        title: "Exercício criado",
        description: "O exercício foi criado com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao criar exercício:", error)
      toast({
        title: "Erro ao criar exercício",
        description: "Não foi possível criar o exercício.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Atualizar o tipo de exercício quando um exercício for selecionado
  useEffect(() => {
    if (selectedExercise) {
      setNewExerciseData(prev => ({
        ...prev,
        exercise_type: (selectedExercise as any).exercise_type as "reps" | "time" || "reps"
      }))
    }
  }, [selectedExercise])

  // Adicionar função para iniciar a edição de um exercício
  const handleEditExercise = (exercise: WorkoutExercise & { exercise: Exercise }) => {
    // Verificar se o exercício é baseado em tempo para configurar corretamente
    const isTimeBased = isTimeBasedExercise(exercise);
    
    setExerciseToEdit(exercise)
    setEditingYoutubeUrl(exercise.exercise.youtube_url || "")
    setNewExerciseData({
      ...newExerciseData,
      sets: exercise.sets,
      reps: exercise.reps || "12",
      time: exercise.time || "60",
      weight: exercise.weight || "",
      rest_time: exercise.rest_time || 60,
      notes: exercise.notes || "",
      // Definir o tipo correto com base na verificação
      exercise_type: isTimeBased ? "time" : "reps",
    })
    setIsEditingExercise(true)
  }

  // Adicionar função para salvar as alterações do exercício
  const handleUpdateExercise = async () => {
    if (!exerciseToEdit) return

    try {
      setIsSaving(true)

      // Atualizar a URL do YouTube se tiver sido alterada
      if (editingYoutubeUrl !== exerciseToEdit.exercise.youtube_url) {
        const { error: exerciseError } = await supabase
          .from("exercises")
          .update({
            youtube_url: editingYoutubeUrl || null
          })
          .eq("id", exerciseToEdit.exercise.id)

        if (exerciseError) {
          throw exerciseError
        }
      }

      // Criar objeto de dados para atualização
      const exerciseData: any = {
        sets: newExerciseData.sets,
        weight: newExerciseData.weight || null,
        rest_time: newExerciseData.rest_time || null,
        notes: newExerciseData.notes || null,
        // Sempre incluir o tipo de exercício
        exercise_type: newExerciseData.exercise_type,
      }

      // Adicionar campos conforme o tipo de exercício
      if (newExerciseData.exercise_type === 'reps') {
        exerciseData.reps = newExerciseData.reps
        // Garantir que o campo time esteja nulo para exercícios de repetições
        exerciseData.time = null
      } else {
        exerciseData.time = newExerciseData.time
        // Para exercícios de tempo, usar um valor padrão para reps (já que o banco não aceita null)
        exerciseData.reps = "0"
      }

      // Atualizar o exercício
      const { data, error } = await supabase
        .from("workout_exercises")
        .update(exerciseData)
        .eq("id", exerciseToEdit.id)
        .select("*, exercise:exercises(*)")
        .single()

      if (error) {
        throw error
      }

      // Normalizar o exercício atualizado para garantir tipo correto
      const normalizedExercise = { ...data };
      if (normalizedExercise.exercise_type === 'time' && !normalizedExercise.time) {
        normalizedExercise.time = newExerciseData.time;
      }

      // Atualizar a lista de exercícios
      const updatedExercises = exercises.map(e => 
        e.id === exerciseToEdit.id ? normalizedExercise as any : e
      )
      
      setExercises(updatedExercises)
      onExercisesUpdated(updatedExercises)

      // Limpar os campos
      setExerciseToEdit(null)
      setIsEditingExercise(false)
      setEditingYoutubeUrl("")
      setNewExerciseData({
        sets: 3,
        reps: "12",
        time: "60",
        weight: "",
        rest_time: 60,
        notes: "",
        exercise_type: "reps"
      })

      toast({
        title: "Exercício atualizado",
        description: "As informações do exercício foram atualizadas com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao atualizar exercício:", error)
      toast({
        title: "Erro ao atualizar exercício",
        description: "Não foi possível atualizar as informações do exercício.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Quando o usuário fecha a tela de edição, limpar os dados
  const handleExitEditing = () => {
    setExerciseToEdit(null)
    setIsEditingExercise(false)
    setEditingYoutubeUrl("")
    setNewExerciseData({
      sets: 3,
      reps: "12",
      time: "60",
      weight: "",
      rest_time: 60,
      notes: "",
      exercise_type: "reps"
    })
  }

  // Função auxiliar para determinar se o exercício é baseado em tempo
  const isTimeBasedExercise = (item: WorkoutExercise & { exercise: Exercise }) => {
    // Verifica o tipo como string para comparação mais segura
    const exerciseTypeStr = String(item.exercise_type || "").toLowerCase();
    
    return (
      exerciseTypeStr === "time" || 
      // Se tiver um valor de time definido, consideramos como exercício baseado em tempo
      (item.time !== null && item.time !== undefined && String(item.time).trim() !== "") ||
      // Se o valor de reps for "0" ou vazio e tiver tempo, consideramos como exercício baseado em tempo
      ((item.reps === "0" || item.reps === "") && item.time)
    );
  };

  // Função auxiliar para obter o valor apropriado
  const getExerciseValue = (item: WorkoutExercise & { exercise: Exercise }) => {
    if (isTimeBasedExercise(item)) {
      return `${item.time || '0'}s`;
    }
    return item.reps || "N/A";
  };

  // Função para limpar e fechar o modal de adição de exercícios
  const handleCloseAddExerciseDialog = () => {
    setSelectedExercise(null)
    setNewExerciseData({
      sets: 3,
      reps: "12",
      time: "60",
      weight: "",
      rest_time: 60,
      notes: "",
      exercise_type: "reps"
    })
    setShowNewExerciseForm(false)
    setIsAddingExercise(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Exercícios do Treino</h3>
        
        <Dialog open={isEditingExercise} onOpenChange={setIsEditingExercise}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 z-10 bg-background pt-6 pb-2">
              <DialogTitle>Editar Exercício</DialogTitle>
              <DialogDescription>
                Atualize as informações do exercício.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              {exerciseToEdit && (
                <div className="space-y-4">
                  <div className="border rounded-md p-3 bg-muted/20">
                    <div className="font-medium flex items-center">
                      {exerciseToEdit.exercise.name}
                      {exerciseToEdit.exercise.youtube_url && (
                        <div className="ml-2">
                          <YouTubePlayer
                            url={exerciseToEdit.exercise.youtube_url}
                            buttonVariant="outline"
                            buttonSize="sm"
                            label="Ver vídeo de demonstração"
                            className="h-7 px-2 py-1 text-xs"
                          />
                        </div>
                      )}
                    </div>
                    {exerciseToEdit.exercise.description && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {exerciseToEdit.exercise.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="youtube-url-edit">Link do YouTube (opcional)</Label>
                      <Input
                        id="youtube-url-edit"
                        placeholder="Ex: https://www.youtube.com/watch?v=exemplo"
                        value={editingYoutubeUrl}
                        onChange={(e) => setEditingYoutubeUrl(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        URL para vídeo demonstrativo do exercício
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="exercise-type-edit">Tipo de Medida</Label>
                      <Select
                        value={newExerciseData.exercise_type}
                        onValueChange={(value: "reps" | "time") => 
                          setNewExerciseData({
                            ...newExerciseData,
                            exercise_type: value
                          })
                        }
                      >
                        <SelectTrigger id="exercise-type-edit">
                          <SelectValue placeholder="Selecione o tipo de medida" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reps">Repetições</SelectItem>
                          <SelectItem value="time">Tempo (segundos)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sets-edit">Séries</Label>
                        <Input
                          id="sets-edit"
                          type="number"
                          min={1}
                          value={newExerciseData.sets}
                          onChange={(e) => setNewExerciseData({
                            ...newExerciseData,
                            sets: parseInt(e.target.value) || 1
                          })}
                        />
                      </div>
                      
                      {newExerciseData.exercise_type === "reps" ? (
                        <div className="space-y-2">
                          <Label htmlFor="reps-edit">Repetições</Label>
                          <Input
                            id="reps-edit"
                            placeholder="Ex: 12 ou 10-12"
                            value={newExerciseData.reps}
                            onChange={(e) => setNewExerciseData({
                              ...newExerciseData,
                              reps: e.target.value
                            })}
                          />
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label htmlFor="time-edit">Tempo (segundos)</Label>
                          <Input
                            id="time-edit"
                            placeholder="Ex: 60"
                            value={newExerciseData.time}
                            onChange={(e) => setNewExerciseData({
                              ...newExerciseData,
                              time: e.target.value
                            })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="weight-edit">Peso (kg)</Label>
                        <Input
                          id="weight-edit"
                          placeholder="Opcional"
                          value={newExerciseData.weight}
                          onChange={(e) => setNewExerciseData({
                            ...newExerciseData,
                            weight: e.target.value
                          })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="rest-edit">Descanso (segundos)</Label>
                        <Input
                          id="rest-edit"
                          type="number"
                          min={0}
                          value={newExerciseData.rest_time}
                          onChange={(e) => setNewExerciseData({
                            ...newExerciseData,
                            rest_time: parseInt(e.target.value) || 0
                          })}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes-edit">Observações</Label>
                      <Textarea
                        id="notes-edit"
                        placeholder="Observações sobre o exercício..."
                        value={newExerciseData.notes}
                        onChange={(e) => setNewExerciseData({
                          ...newExerciseData,
                          notes: e.target.value
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter className="sticky bottom-0 bg-background py-4">
              <Button
                variant="outline"
                onClick={handleExitEditing}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleUpdateExercise}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAddingExercise} onOpenChange={setIsAddingExercise}>
          <DialogTrigger asChild>
            <Button onClick={() => setIsAddingExercise(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Exercício
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="sticky top-0 z-10 bg-background pt-6 pb-2">
              <DialogTitle>Adicionar Exercício ao Treino</DialogTitle>
              <DialogDescription>
                Selecione um exercício e configure suas séries, repetições e outros detalhes.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                {/* Seleção de exercício */}
                {!showNewExerciseForm ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="exercise-search">Buscar Exercício</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="exercise-search"
                          placeholder="Digite o nome do exercício..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <Button variant="outline" size="icon">
                          <Search className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="h-48 md:h-64 overflow-y-auto border rounded-md p-2">
                      {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : filteredExercises.length > 0 ? (
                        <div className="space-y-2">
                          {filteredExercises.map((exercise) => (
                            <div
                              key={exercise.id}
                              className={`p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                                selectedExercise?.id === exercise.id ? "bg-primary/10 border border-primary/20" : ""
                              }`}
                              onClick={() => setSelectedExercise(exercise)}
                            >
                              <div className="font-medium flex items-center">
                                {exercise.name}
                                {exercise.youtube_url && (
                                  <div className="ml-2">
                                    <YouTubePlayer
                                      url={exercise.youtube_url}
                                      buttonVariant="outline"
                                      buttonSize="sm"
                                      label="Ver vídeo"
                                      className="h-7 px-2 py-1 text-xs"
                                    />
                                  </div>
                                )}
                              </div>
                              {exercise.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {exercise.description}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center p-4">
                          <p className="text-muted-foreground text-sm mb-4 text-center">
                            {searchTerm
                              ? "Nenhum exercício encontrado com esse termo."
                              : "Busque pelo nome do exercício."}
                          </p>
                          {searchTerm && (
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setShowNewExerciseForm(true)
                                setNewExerciseName(searchTerm)
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Criar Exercício
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-medium">Novo Exercício</h3>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setShowNewExerciseForm(false)}
                      >
                        Voltar
                      </Button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="exercise-name">Nome do Exercício *</Label>
                        <Input
                          id="exercise-name"
                          placeholder="Ex: Supino Reto"
                          value={newExerciseName}
                          onChange={(e) => setNewExerciseName(e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="exercise-description">Descrição</Label>
                        <Textarea
                          id="exercise-description"
                          placeholder="Descrição opcional do exercício..."
                          value={newExerciseDescription}
                          onChange={(e) => setNewExerciseDescription(e.target.value)}
                          className="min-h-[80px]"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="exercise-youtube">Link do YouTube (opcional)</Label>
                        <Input
                          id="exercise-youtube"
                          placeholder="Ex: https://www.youtube.com/watch?v=exemplo"
                          value={newExerciseYoutubeUrl}
                          onChange={(e) => setNewExerciseYoutubeUrl(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Adicione um vídeo que demonstre como executar o exercício corretamente.
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="exercise-type">Tipo de Medida</Label>
                        <Select
                          value={newExerciseType}
                          onValueChange={(value: "reps" | "time") => setNewExerciseType(value)}
                        >
                          <SelectTrigger id="exercise-type">
                            <SelectValue placeholder="Selecione o tipo de medida" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reps">Repetições</SelectItem>
                            <SelectItem value="time">Tempo</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Selecione como o exercício é medido: por número de repetições ou por tempo.
                        </p>
                      </div>
                      
                      <div className="pt-2">
                        <Button 
                          onClick={createNewExercise} 
                          disabled={!newExerciseName || isSaving}
                          className="w-full sm:w-auto"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Criando...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Criar Exercício
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedExercise && !showNewExerciseForm && (
                  <div className="border rounded-md p-3 bg-muted/20">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="font-medium flex items-center">
                          {selectedExercise.name}
                          {selectedExercise.youtube_url && (
                            <div className="ml-2">
                              <YouTubePlayer
                                url={selectedExercise.youtube_url}
                                buttonVariant="outline"
                                buttonSize="sm"
                                label="Ver vídeo de demonstração"
                                className="h-7 px-2 py-1 text-xs"
                              />
                            </div>
                          )}
                        </div>
                        {selectedExercise.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedExercise.description}
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedExercise(null)}
                        className="mt-1 sm:mt-0"
                      >
                        Alterar
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Configurações do exercício */}
                {selectedExercise && !showNewExerciseForm && (
                  <div className="space-y-4 pt-2">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="exercise-type-config">Tipo de Medida</Label>
                        <Select
                          value={newExerciseData.exercise_type}
                          onValueChange={(value: "reps" | "time") => 
                            setNewExerciseData({
                              ...newExerciseData,
                              exercise_type: value
                            })
                          }
                        >
                          <SelectTrigger id="exercise-type-config">
                            <SelectValue placeholder="Selecione o tipo de medida" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="reps">Repetições</SelectItem>
                            <SelectItem value="time">Tempo (segundos)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sets">Séries</Label>
                          <Input
                            id="sets"
                            type="number"
                            min={1}
                            value={newExerciseData.sets}
                            onChange={(e) => setNewExerciseData({
                              ...newExerciseData,
                              sets: parseInt(e.target.value) || 1
                            })}
                          />
                        </div>
                        
                        {newExerciseData.exercise_type === "reps" ? (
                          <div className="space-y-2">
                            <Label htmlFor="reps">Repetições</Label>
                            <Input
                              id="reps"
                              placeholder="Ex: 12 ou 10-12"
                              value={newExerciseData.reps}
                              onChange={(e) => setNewExerciseData({
                                ...newExerciseData,
                                reps: e.target.value
                              })}
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Label htmlFor="time">Tempo (segundos)</Label>
                            <Input
                              id="time"
                              placeholder="Ex: 60"
                              value={newExerciseData.time}
                              onChange={(e) => setNewExerciseData({
                                ...newExerciseData,
                                time: e.target.value
                              })}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="weight">Peso (kg)</Label>
                          <Input
                            id="weight"
                            placeholder="Opcional"
                            value={newExerciseData.weight}
                            onChange={(e) => setNewExerciseData({
                              ...newExerciseData,
                              weight: e.target.value
                            })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="rest">Descanso (segundos)</Label>
                          <Input
                            id="rest"
                            type="number"
                            min={0}
                            value={newExerciseData.rest_time}
                            onChange={(e) => setNewExerciseData({
                              ...newExerciseData,
                              rest_time: parseInt(e.target.value) || 0
                            })}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea
                        id="notes"
                        placeholder="Observações sobre o exercício..."
                        value={newExerciseData.notes}
                        onChange={(e) => setNewExerciseData({
                          ...newExerciseData,
                          notes: e.target.value
                        })}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="sticky bottom-0 bg-background py-4">
              <Button 
                variant="outline" 
                onClick={handleCloseAddExerciseDialog}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleAddExercise} 
                disabled={(!selectedExercise || isSaving) || showNewExerciseForm}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adicionando...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {exercises.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="exercises">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-2"
              >
                {exercises.map((exercise, index) => (
                  <Draggable
                    key={exercise.id}
                    draggableId={exercise.id}
                    index={index}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="bg-card rounded-md mb-3"
                      >
                        <div className="flex items-start p-3 rounded-md border">
                          <div
                            {...provided.dragHandleProps}
                            className="pt-1 pr-3 text-muted-foreground cursor-grab"
                          >
                            <GripVertical size={16} />
                          </div>
                          
                          <div className="flex-1">
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3">
                              <div className="sm:col-span-8">
                                <div className="font-medium">
                                  {exercise.exercise.name}
                                  {exercise.exercise.youtube_url && (
                                    <div className="ml-2 inline-block">
                                      <YouTubePlayer
                                        url={exercise.exercise.youtube_url}
                                        buttonVariant="outline"
                                        buttonSize="sm"
                                        label="Ver vídeo"
                                        className="h-7 px-2 py-1 text-xs"
                                      />
                                    </div>
                                  )}
                                </div>
                                {exercise.exercise.description && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {exercise.exercise.description}
                                  </p>
                                )}
                              </div>
                              
                              <div className="sm:col-span-3 grid grid-cols-2 gap-x-2 gap-y-1 mt-1 sm:mt-0 text-sm">
                                <div>
                                  <span className="text-xs text-muted-foreground">Séries:</span>
                                  <span className="ml-1">{exercise.sets}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground">
                                    {isTimeBasedExercise(exercise) ? 'Tempo:' : 'Reps:'}
                                  </span>
                                  <span className="ml-1">{getExerciseValue(exercise)}</span>
                                </div>
                                {exercise.weight && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">Peso:</span>
                                    <span className="ml-1">{exercise.weight}kg</span>
                                  </div>
                                )}
                                {exercise.rest_time && (
                                  <div>
                                    <span className="text-xs text-muted-foreground">Descanso:</span>
                                    <span className="ml-1">{exercise.rest_time}s</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="sm:col-span-1 flex sm:flex-col gap-2 justify-end items-center sm:items-end">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => handleEditExercise(exercise)}
                                  title="Editar exercício"
                                >
                                  <Edit size={14} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveExercise(exercise.id)}
                                  title="Remover exercício"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="border border-dashed rounded-md p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Info className="h-6 w-6 text-primary" />
          </div>
          <h3 className="mt-3 text-sm font-medium">Sem exercícios</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Este treino ainda não possui exercícios. Adicione um exercício para começar.
          </p>
        </div>
      )}
    </div>
  )
} 