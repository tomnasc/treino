"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, ChevronLeft, ChevronRight, ClipboardList, LineChart, Play, RefreshCcw, Trash2, XCircle, TrendingUp } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Separator } from "@/app/components/ui/separator"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { WorkoutHistoryList } from "@/app/components/history/workout-history-list"
import { WorkoutProgressCharts } from "@/app/components/history/workout-progress-charts"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
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

export default function HistoryPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [workoutHistory, setWorkoutHistory] = useState<any[]>([])
  const [incompleteWorkouts, setIncompleteWorkouts] = useState<any[]>([])
  const [completedWorkouts, setCompletedWorkouts] = useState<any[]>([])
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null)
  
  useEffect(() => {
    async function fetchWorkoutHistory() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        const { data, error } = await supabase
          .from("workout_history")
          .select(`
            *,
            workout:workouts(*)
          `)
          .eq("user_id", currentUser.id)
          .order("started_at", { ascending: false })
          
        if (error) {
          throw error
        }
        
        setWorkoutHistory(data || [])
        
        // Separar treinos incompletos dos completos
        const incomplete = data?.filter(item => !item.completed) || []
        const completed = data?.filter(item => item.completed) || []
        
        setIncompleteWorkouts(incomplete)
        setCompletedWorkouts(completed)
      } catch (error) {
        console.error("Erro ao buscar histórico:", error)
        toast({
          title: "Erro ao carregar histórico",
          description: "Não foi possível carregar seu histórico de treinos.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchWorkoutHistory()
  }, [router])
  
  const handleDeleteHistory = async () => {
    if (!selectedHistoryId) return
    
    try {
      setIsDeleting(true)
      
      // Excluir histórico de exercícios relacionados
      const { error: exerciseHistoryError } = await supabase
        .from("exercise_history")
        .delete()
        .eq("workout_history_id", selectedHistoryId)
      
      if (exerciseHistoryError) {
        throw exerciseHistoryError
      }
      
      // Excluir o histórico do treino
      const { error: historyError } = await supabase
        .from("workout_history")
        .delete()
        .eq("id", selectedHistoryId)
      
      if (historyError) {
        throw historyError
      }
      
      // Atualizar a lista local
      setWorkoutHistory(prev => prev.filter(item => item.id !== selectedHistoryId))
      setIncompleteWorkouts(prev => prev.filter(item => item.id !== selectedHistoryId))
      setCompletedWorkouts(prev => prev.filter(item => item.id !== selectedHistoryId))
      
      toast({
        title: "Histórico excluído",
        description: "O registro foi removido do seu histórico.",
      })
    } catch (error) {
      console.error("Erro ao excluir histórico:", error)
      toast({
        title: "Erro ao excluir histórico",
        description: "Não foi possível excluir o registro. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setSelectedHistoryId(null)
    }
  }
  
  const handleResumeWorkout = (historyId: string, workoutId: string) => {
    // Armazenar o ID do histórico para continuar o treino
    sessionStorage.setItem("currentWorkoutHistoryId", historyId)
    
    // Verificar se existe dados de estado do treino
    if (typeof window !== 'undefined') {
      const savedState = localStorage.getItem(`workout_state_${historyId}`);
      
      // Se não houver estado salvo, criar um estado vazio para este histórico
      if (!savedState) {
        toast({
          title: "Preparando treino",
          description: "Inicializando treino do zero, já que não há dados de progresso salvos.",
        });
      } else {
        toast({
          title: "Retomando treino",
          description: "Retomando o treino de onde você parou.",
        });
      }
    }
    
    // Redirecionar para a página de treino
    router.push(`/dashboard/train?workout=${workoutId}`)
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Histórico e Relatórios</h2>
        <p className="text-muted-foreground">
          Acompanhe seu progresso e histórico de treinos realizados.
        </p>
      </div>

      <Tabs defaultValue="historico" className="space-y-4">
        <TabsList>
          <TabsTrigger value="historico">
            <ClipboardList className="mr-2 h-4 w-4" />
            Histórico
          </TabsTrigger>
          <TabsTrigger value="relatorios">
            <LineChart className="mr-2 h-4 w-4" />
            Relatórios
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="historico" className="space-y-4">
          {incompleteWorkouts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Treinos não concluídos</CardTitle>
                <CardDescription>
                  Treinos que você iniciou mas não concluiu. Você pode continuar de onde parou.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {incompleteWorkouts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                      <div>
                        <h3 className="font-medium">{item.workout?.name}</h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <CalendarIcon className="mr-1 h-3 w-3" />
                          {format(new Date(item.started_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setSelectedHistoryId(item.id)}
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
                              <AlertDialogAction onClick={handleDeleteHistory} disabled={isDeleting}>
                                {isDeleting ? "Excluindo..." : "Excluir"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                        <Button 
                          variant="outline" 
                          onClick={() => handleResumeWorkout(item.id, item.workout_id)}
                        >
                          <Play className="mr-2 h-4 w-4" />
                          Continuar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>Histórico de treinos</CardTitle>
              <CardDescription>
                Visualize todos os treinos que você realizou
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkoutHistoryList 
                workoutHistory={completedWorkouts} 
                onDelete={(id) => {
                  setSelectedHistoryId(id)
                }}
                isDeleting={isDeleting}
                onDeleteConfirm={handleDeleteHistory}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="relatorios" className="space-y-4">
          <WorkoutProgressCharts workoutHistory={workoutHistory} />
          
          <div className="flex justify-center mt-8">
            <Button onClick={() => router.push("/dashboard/performance")} variant="outline" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Ver análise de desempenho completa
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 