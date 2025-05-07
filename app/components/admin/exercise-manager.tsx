"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash, Search, Save, X, Dumbbell } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form"
import { Input } from "@/app/components/ui/input"
import { Textarea } from "@/app/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Checkbox } from "@/app/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/app/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"
import { Exercise, MuscleGroup } from "@/app/types/database.types"

// Tipo estendido para incluir os dados do grupo muscular
interface ExerciseWithMuscleGroup extends Exercise {
  muscle_group?: {
    name: string;
  };
}

const exerciseFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  description: z.string().optional(),
  muscle_group_id: z.string().min(1, "Selecione um grupo muscular"),
  youtube_url: z.string().url("URL inválida").optional().or(z.literal("")),
  is_public: z.boolean(),
})

type ExerciseFormValues = z.infer<typeof exerciseFormSchema>

interface ExerciseManagerProps {
  userId: string
}

export function ExerciseManager({ userId }: ExerciseManagerProps) {
  const [exercises, setExercises] = useState<ExerciseWithMuscleGroup[]>([])
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingExercise, setEditingExercise] = useState<ExerciseWithMuscleGroup | null>(null)
  const [exerciseToDelete, setExerciseToDelete] = useState<ExerciseWithMuscleGroup | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseFormSchema),
    defaultValues: {
      name: "",
      description: "",
      muscle_group_id: "",
      youtube_url: "",
      is_public: true,
    },
  })

  // Carregar exercícios e grupos musculares
  useEffect(() => {
    loadExercisesAndMuscleGroups()
  }, [])

  const loadExercisesAndMuscleGroups = async () => {
    try {
      setIsLoading(true)
      
      // Carregar grupos musculares
      const { data: groupsData, error: groupsError } = await supabase
        .from("muscle_groups")
        .select("*")
        .order("name")
      
      if (groupsError) throw groupsError
      
      setMuscleGroups(groupsData || [])
      
      // Carregar exercícios
      const { data: exercisesData, error: exercisesError } = await supabase
        .from("exercises")
        .select(`
          *,
          muscle_group:muscle_groups(name)
        `)
        .order("name")
      
      if (exercisesError) throw exercisesError
      
      setExercises(exercisesData || [])
      
    } catch (error) {
      console.error("Erro ao carregar dados:", error)
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os exercícios. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar exercícios por termo de busca
  const filteredExercises = exercises.filter((exercise) => {
    const searchTerm = searchQuery.toLowerCase()
    return (
      exercise.name.toLowerCase().includes(searchTerm) ||
      (exercise.description && exercise.description.toLowerCase().includes(searchTerm)) ||
      (exercise.muscle_group && exercise.muscle_group.name.toLowerCase().includes(searchTerm))
    )
  })

  // Abrir diálogo para editar exercício
  const handleEdit = (exercise: ExerciseWithMuscleGroup) => {
    setEditingExercise(exercise)
    
    form.reset({
      name: exercise.name,
      description: exercise.description || "",
      muscle_group_id: exercise.muscle_group_id || "",
      youtube_url: exercise.youtube_url || "",
      is_public: exercise.is_public === false ? false : true,
    })
    
    setShowAddDialog(true)
  }

  // Abrir diálogo para criar exercício
  const handleAddNew = () => {
    setEditingExercise(null)
    
    form.reset({
      name: "",
      description: "",
      muscle_group_id: "",
      youtube_url: "",
      is_public: true,
    })
    
    setShowAddDialog(true)
  }

  // Salvar exercício (novo ou editado)
  const onSubmit = async (values: ExerciseFormValues) => {
    try {
      setIsSubmitting(true)
      
      const exerciseData = {
        name: values.name,
        description: values.description || null,
        muscle_group_id: values.muscle_group_id,
        youtube_url: values.youtube_url || null,
        is_public: values.is_public,
        created_by: userId,
        updated_at: new Date().toISOString(),
      }
      
      if (editingExercise) {
        // Atualizar exercício existente
        const { error } = await supabase
          .from("exercises")
          .update(exerciseData)
          .eq("id", editingExercise.id)
        
        if (error) throw error
        
        toast({
          title: "Exercício atualizado",
          description: "O exercício foi atualizado com sucesso.",
        })
      } else {
        // Criar novo exercício
        const { error } = await supabase
          .from("exercises")
          .insert({
            ...exerciseData,
            created_at: new Date().toISOString(),
          })
        
        if (error) throw error
        
        toast({
          title: "Exercício criado",
          description: "O novo exercício foi criado com sucesso.",
        })
      }
      
      // Recarregar lista de exercícios
      await loadExercisesAndMuscleGroups()
      
      // Fechar diálogo
      setShowAddDialog(false)
      
    } catch (error) {
      console.error("Erro ao salvar exercício:", error)
      toast({
        title: "Erro ao salvar exercício",
        description: "Não foi possível salvar o exercício. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Excluir exercício
  const handleDelete = async () => {
    if (!exerciseToDelete) return
    
    try {
      setIsSubmitting(true)
      
      // Verificar se o exercício está em uso em algum treino
      const { data: usageData, error: usageError } = await supabase
        .from("workout_exercises")
        .select("id")
        .eq("exercise_id", exerciseToDelete.id)
        .limit(1)
      
      if (usageError) throw usageError
      
      if (usageData && usageData.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Este exercício está sendo usado em um ou mais treinos e não pode ser excluído.",
          variant: "destructive",
        })
        return
      }
      
      // Excluir exercício
      const { error } = await supabase
        .from("exercises")
        .delete()
        .eq("id", exerciseToDelete.id)
      
      if (error) throw error
      
      toast({
        title: "Exercício excluído",
        description: "O exercício foi excluído com sucesso.",
      })
      
      // Recarregar lista de exercícios
      await loadExercisesAndMuscleGroups()
      
    } catch (error) {
      console.error("Erro ao excluir exercício:", error)
      toast({
        title: "Erro ao excluir exercício",
        description: "Não foi possível excluir o exercício. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setExerciseToDelete(null)
    }
  }

  // Obter o nome do grupo muscular
  const getMuscleGroupName = (exercise: ExerciseWithMuscleGroup) => {
    if (exercise.muscle_group) {
      return exercise.muscle_group.name
    }
    
    const group = muscleGroups.find(g => g.id === exercise.muscle_group_id)
    return group ? group.name : "Desconhecido"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gerenciar Exercícios</CardTitle>
        <CardDescription>
          Adicione, edite e exclua os exercícios padrão do sistema.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercícios..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Button onClick={handleAddNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Exercício
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : filteredExercises.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum exercício encontrado</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery
                ? "Não encontramos exercícios com este termo de busca."
                : "Não há exercícios cadastrados. Crie um novo exercício."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Grupo Muscular</TableHead>
                  <TableHead>Público</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExercises.map((exercise) => (
                  <TableRow key={exercise.id}>
                    <TableCell className="font-medium">{exercise.name}</TableCell>
                    <TableCell>{getMuscleGroupName(exercise)}</TableCell>
                    <TableCell>
                      {exercise.is_public ? (
                        <span className="text-green-600 text-sm">Sim</span>
                      ) : (
                        <span className="text-gray-500 text-sm">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(exercise)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setExerciseToDelete(exercise)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Diálogo para adicionar/editar exercício */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingExercise ? "Editar Exercício" : "Novo Exercício"}
            </DialogTitle>
            <DialogDescription>
              {editingExercise
                ? "Altere as informações do exercício conforme necessário."
                : "Preencha as informações para criar um novo exercício."
              }
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do exercício" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição do exercício (opcional)" 
                        rows={3}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="muscle_group_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grupo Muscular</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um grupo muscular" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {muscleGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="youtube_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do YouTube</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://www.youtube.com/watch?v=..." 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      URL para vídeo demonstrativo (opcional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="is_public"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Exercício Público</FormLabel>
                      <FormDescription>
                        Se marcado, este exercício estará disponível para todos os usuários.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : editingExercise ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Alterações
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Exercício
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação para excluir */}
      <AlertDialog open={!!exerciseToDelete} onOpenChange={(isOpen) => !isOpen && setExerciseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Exercício?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O exercício será permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
} 