"use client"

import { useState, useEffect } from "react"
import { Star, StarOff, Search, User, Dumbbell } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Badge } from "@/app/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/app/components/ui/table"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"
import { Workout } from "@/app/types/database.types"

interface FeaturedWorkoutsProps {
  maxFeatured?: number
}

export function FeaturedWorkouts({ maxFeatured = 10 }: FeaturedWorkoutsProps) {
  const [workouts, setWorkouts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [featuredCount, setFeaturedCount] = useState(0)
  const { toast } = useToast()

  // Carregar treinos
  useEffect(() => {
    loadWorkouts()
  }, [])

  const loadWorkouts = async () => {
    try {
      setIsLoading(true)
      
      // Carregar treinos públicos
      const { data, error } = await supabase
        .from("workouts")
        .select(`
          *,
          creator:profiles!created_by(full_name, email),
          goal:training_goals(name)
        `)
        .eq("is_public", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
      
      if (error) throw error
      
      setWorkouts(data || [])
      setFeaturedCount(data?.filter(w => w.is_featured).length || 0)
      
    } catch (error) {
      console.error("Erro ao carregar treinos:", error)
      toast({
        title: "Erro ao carregar treinos",
        description: "Não foi possível carregar os treinos. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filtrar treinos por termo de busca
  const filteredWorkouts = workouts.filter((workout) => {
    const searchTerm = searchQuery.toLowerCase()
    return (
      workout.name.toLowerCase().includes(searchTerm) ||
      (workout.description && workout.description.toLowerCase().includes(searchTerm)) ||
      (workout.creator && workout.creator.full_name && workout.creator.full_name.toLowerCase().includes(searchTerm)) ||
      (workout.goal && workout.goal.name && workout.goal.name.toLowerCase().includes(searchTerm))
    )
  })

  // Alternar destaque de treino
  const toggleFeatured = async (workout: any) => {
    try {
      setUpdatingId(workout.id)
      
      const newFeaturedState = !workout.is_featured
      
      // Verificar se atingiu o limite de treinos em destaque
      if (newFeaturedState && featuredCount >= maxFeatured) {
        toast({
          title: "Limite de destaques atingido",
          description: `Você só pode ter ${maxFeatured} treinos em destaque. Remova um destaque antes de adicionar outro.`,
          variant: "destructive",
        })
        return
      }
      
      // Atualizar o estado do treino
      const { error } = await supabase
        .from("workouts")
        .update({ is_featured: newFeaturedState })
        .eq("id", workout.id)
      
      if (error) throw error
      
      // Atualizar a contagem de destaques
      setFeaturedCount(prevCount => 
        newFeaturedState ? prevCount + 1 : prevCount - 1
      )
      
      // Atualizar a lista de treinos
      setWorkouts(prevWorkouts =>
        prevWorkouts.map(w =>
          w.id === workout.id ? { ...w, is_featured: newFeaturedState } : w
        )
      )
      
      toast({
        title: newFeaturedState ? "Treino destacado" : "Destaque removido",
        description: newFeaturedState
          ? "O treino foi adicionado aos destaques."
          : "O treino foi removido dos destaques.",
      })
      
    } catch (error) {
      console.error("Erro ao atualizar treino:", error)
      toast({
        title: "Erro ao atualizar treino",
        description: "Não foi possível atualizar o status de destaque do treino. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Treinos em Destaque</CardTitle>
        <CardDescription>
          Gerencie os treinos destacados na plataforma. 
          Máximo: {maxFeatured} treinos destacados. Atual: {featuredCount} treinos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar treinos..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        ) : filteredWorkouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Dumbbell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Nenhum treino encontrado</h3>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery
                ? "Não encontramos treinos com este termo de busca."
                : "Não há treinos públicos cadastrados no sistema."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Criador</TableHead>
                  <TableHead>Objetivo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWorkouts.map((workout) => (
                  <TableRow key={workout.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        {workout.is_featured && (
                          <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        )}
                        {workout.name}
                      </div>
                      {workout.description && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {workout.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          {workout.creator?.full_name || "Usuário removido"}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {workout.goal ? (
                        <Badge variant="outline">{workout.goal.name}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sem objetivo</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {workout.is_featured ? (
                        <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-500">
                          Destacado
                        </Badge>
                      ) : (
                        <Badge variant="outline">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updatingId === workout.id}
                        onClick={() => toggleFeatured(workout)}
                        className={
                          workout.is_featured 
                            ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
                            : ""
                        }
                      >
                        {updatingId === workout.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : workout.is_featured ? (
                          <>
                            <StarOff className="mr-2 h-4 w-4" />
                            Remover
                          </>
                        ) : (
                          <>
                            <Star className="mr-2 h-4 w-4" />
                            Destacar
                          </>
                        )}
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
  )
} 