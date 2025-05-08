"use client"

import { useState, useEffect } from "react"
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Grip, Save } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import { supabase } from "@/app/lib/supabase"
import { Workout } from "@/app/types/database.types"
import { toast } from "@/app/components/ui/use-toast"

interface WorkoutSequenceEditorProps {
  workouts: Workout[]
  onSave: () => void
}

export function WorkoutSequenceEditor({ workouts, onSave }: WorkoutSequenceEditorProps) {
  const [items, setItems] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Ordenar inicialmente pelos valores de sequence_order, se existirem
    const sortedWorkouts = [...workouts].sort((a, b) => {
      // Verifica se sequence_order existe e é diferente de zero (valor padrão)
      const aOrder = a.sequence_order && a.sequence_order > 0 ? a.sequence_order : 999999
      const bOrder = b.sequence_order && b.sequence_order > 0 ? b.sequence_order : 999999
      
      // Ordenação primária por sequence_order
      if (aOrder !== bOrder) return aOrder - bOrder
      
      // Ordenação secundária por data de criação (mais recentes primeiro)
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
      return bDate - aDate
    })
    
    setItems(sortedWorkouts)
  }, [workouts])

  const onDragEnd = (result: any) => {
    if (!result.destination) return
    
    const reorderedItems = Array.from(items)
    const [removed] = reorderedItems.splice(result.source.index, 1)
    reorderedItems.splice(result.destination.index, 0, removed)
    
    setItems(reorderedItems)
  }

  const saveSequence = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const workoutIds = items.map(workout => workout.id)
      
      const { data, error } = await supabase.rpc(
        'update_workout_sequence',
        {
          workout_ids: workoutIds,
          user_id: items[0]?.created_by // assumimos que todos os treinos têm o mesmo user_id
        }
      )
      
      if (error) throw error
      
      toast({
        title: "Sequência salva",
        description: "A ordem dos seus treinos foi atualizada com sucesso.",
      })
      
      onSave()
    } catch (err: any) {
      console.error("Erro ao salvar sequência:", err)
      setError(err.message || "Erro ao salvar a sequência de treinos.")
      
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível salvar a ordem dos treinos.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Arraste para reorganizar seus treinos</h3>
        <Button 
          onClick={saveSequence} 
          disabled={loading}
        >
          {loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Ordem
        </Button>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="border rounded-md">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="workouts">
            {(provided) => (
              <ul
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="divide-y"
              >
                {items.map((workout, index) => (
                  <Draggable key={workout.id} draggableId={workout.id} index={index}>
                    {(provided) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="p-4 bg-card flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium">{workout.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {workout.description || "Sem descrição"}
                          </p>
                        </div>
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing p-2"
                        >
                          <Grip className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      
      <p className="text-sm text-muted-foreground">
        Dica: A ordem definida aqui determinará qual será seu próximo treino no dashboard.
      </p>
    </div>
  )
} 