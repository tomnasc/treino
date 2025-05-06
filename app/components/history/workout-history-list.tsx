"use client"

import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, ChevronRight, Clock, Dumbbell, Trash2 } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { formatDuration } from "@/app/lib/utils"
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
import { useState } from "react"
import { Workout } from "@/app/types/database.types"

interface WorkoutHistoryItem {
  id: string
  workout_id: string
  started_at: string
  finished_at: string | null
  duration: number | null
  completed: boolean
  workout: Workout
}

interface WorkoutHistoryListProps {
  workoutHistory: WorkoutHistoryItem[]
  onDelete: (id: string) => void
  onDeleteConfirm: () => void
  isDeleting: boolean
}

export function WorkoutHistoryList({ 
  workoutHistory, 
  onDelete, 
  onDeleteConfirm, 
  isDeleting 
}: WorkoutHistoryListProps) {
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  
  if (workoutHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Sem histórico de treinos</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Você ainda não registrou nenhum treino completo.
        </p>
      </div>
    )
  }
  
  // Agrupar treinos por mês
  const groupedByMonth: Record<string, WorkoutHistoryItem[]> = {}
  
  workoutHistory.forEach(item => {
    const date = new Date(item.started_at)
    const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`
    const monthDisplay = format(date, "MMMM 'de' yyyy", { locale: ptBR })
    
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = []
    }
    
    groupedByMonth[monthKey].push({
      ...item,
      monthDisplay
    } as any)
  })
  
  return (
    <div className="space-y-6">
      {Object.entries(groupedByMonth).map(([monthKey, items]) => {
        // Pegar o display do mês do primeiro item
        const monthDisplay = (items[0] as any).monthDisplay
        
        return (
          <div key={monthKey} className="space-y-2">
            <h3 className="font-medium text-md capitalize">
              {monthDisplay}
            </h3>
            <div className="rounded-md border divide-y">
              {items.map(item => (
                <div key={item.id} className="flex items-center p-4">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.workout?.name}</h4>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(new Date(item.started_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      {item.duration && (
                        <div className="flex items-center">
                          <Clock className="mr-1 h-3 w-3" />
                          {formatDuration(item.duration)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover do histórico?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser desfeita. Isto removerá permanentemente este treino do seu histórico.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={onDeleteConfirm} disabled={isDeleting}>
                            {isDeleting ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
} 