"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Plus, Search, Filter, ArrowUpDown, ListOrdered } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/app/components/ui/sheet"
import { getCurrentUser, UserSession } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { Workout } from "@/app/types/database.types"
import { WorkoutSequenceEditor } from "@/app/components/workouts/workout-sequence-editor"

type SortOrderType = 'asc' | 'desc' | 'seq';

export default function WorkoutsPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserSession | null>(null)
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrderType>('seq')
  const [isReorderSheetOpen, setIsReorderSheetOpen] = useState(false)
  const [hasPremiumWorkouts, setHasPremiumWorkouts] = useState(false)

  async function fetchWorkouts() {
    try {
      setIsLoading(true)
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      setUser(currentUser)

      // Verificar se o usuário tem treinos ocultos (foi premium no passado)
      if (currentUser.role === 'free') {
        const { count, error: hiddenError } = await supabase
          .from("workouts")
          .select("id", { count: 'exact', head: true })
          .eq("created_by", currentUser.id)
          .eq("is_hidden", true)
          
        setHasPremiumWorkouts(count !== null && count > 0)
      }

      // Usar a função list_available_workouts que já filtra conforme o tipo de usuário
      const { data, error } = await supabase
        .rpc('list_available_workouts', {
          p_user_id: currentUser.id
        })

      if (error) {
        console.error("Erro ao buscar treinos:", error)
        
        // Fallback para busca direta caso a função não exista
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("workouts")
          .select("*")
          .eq("created_by", currentUser.id)
          .order('created_at', { ascending: sortOrder === 'asc' })
        
        if (fallbackError) {
          console.error("Erro no fallback:", fallbackError)
        } else {
          setWorkouts(fallbackData || [])
        }
      } else {
        if (sortOrder !== 'seq' && data) {
          // Ordenar por data se não for a ordenação por sequência
          const sortedByDate = [...data].sort((a, b) => {
            const aDate = a.created_at ? new Date(a.created_at).getTime() : 0
            const bDate = b.created_at ? new Date(b.created_at).getTime() : 0
            return sortOrder === 'asc' ? aDate - bDate : bDate - aDate
          })
          setWorkouts(sortedByDate)
        } else {
          setWorkouts(data || [])
        }
      }
    } catch (error) {
      console.error("Erro:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkouts()
  }, [router, sortOrder])

  const filteredWorkouts = workouts.filter(workout => 
    workout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (workout.description && workout.description.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const toggleSortOrder = () => {
    setSortOrder(prev => {
      if (prev === 'seq') return 'desc'
      if (prev === 'desc') return 'asc'
      return 'seq'
    })
  }

  const handleReorderComplete = () => {
    setIsReorderSheetOpen(false)
    setSortOrder('seq')
    fetchWorkouts()
  }

  const getSortLabel = () => {
    switch (sortOrder) {
      case 'desc': return 'Mais novos'
      case 'asc': return 'Mais antigos'
      case 'seq': return 'Sequência'
      default: return 'Ordenar'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Meus Treinos</h2>
        <p className="text-muted-foreground">
          Gerencie e acompanhe seus treinos personalizados.
        </p>
      </div>

      {user?.role === 'free' && hasPremiumWorkouts && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
          <h3 className="font-medium text-amber-800 dark:text-amber-300">Treinos premium ocultos</h3>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            Você tem treinos criados durante seu período premium que estão ocultos. 
            Faça upgrade para o plano premium para acessá-los novamente.
          </p>
          <Button variant="outline" size="sm" className="mt-2" asChild>
            <Link href="/dashboard/planos">Ver planos premium</Link>
          </Button>
        </div>
      )}

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
        
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="w-full xs:w-auto" onClick={toggleSortOrder}>
            <ArrowUpDown className="mr-2 h-4 w-4" />
            {getSortLabel()}
          </Button>
          
          <Sheet open={isReorderSheetOpen} onOpenChange={setIsReorderSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="w-full xs:w-auto">
                <ListOrdered className="mr-2 h-4 w-4" />
                Reordenar
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Reordenar Treinos</SheetTitle>
                <SheetDescription>
                  Defina a ordem de execução dos seus treinos arrastando-os para a posição desejada.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <WorkoutSequenceEditor 
                  workouts={workouts} 
                  onSave={handleReorderComplete} 
                />
              </div>
            </SheetContent>
          </Sheet>
          
          <Button asChild className="w-full xs:w-auto">
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
            <Link 
              key={workout.id} 
              href={`/dashboard/workouts/${workout.id}`}
              className="block group"
            >
              <div className="rounded-lg border p-4 transition-colors hover:border-primary hover:bg-muted/50">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{workout.name}</h3>
                    {workout.is_ai_generated && (
                      <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary">
                        IA
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {workout.description || "Sem descrição"}
                  </p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">
                      {workout.created_at ? new Date(workout.created_at).toLocaleDateString() : 'Data não disponível'}
                    </span>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Ver detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
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
      )}
    </div>
  )
} 