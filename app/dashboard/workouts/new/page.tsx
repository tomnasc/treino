"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Loader2, Save } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { WorkoutForm } from "@/app/components/workouts/workout-form"

export default function NewWorkoutPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [canCreateWorkout, setCanCreateWorkout] = useState(true)
  
  useEffect(() => {
    async function checkUserLimits() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Verificar se é um usuário gratuito
        if (currentUser.role === 'free') {
          // Consultar função no banco para verificar se o usuário atingiu o limite
          const { data, error } = await supabase
            .rpc('check_free_user_workout_limits', {
              user_id: currentUser.id
            })
            
          if (error) {
            console.error("Erro ao verificar limites:", error)
            return
          }
          
          setCanCreateWorkout(data)
          
          if (!data) {
            toast({
              title: "Limite atingido",
              description: "Usuários gratuitos podem criar apenas 1 treino. Faça upgrade para o plano premium para criar treinos ilimitados.",
              variant: "destructive",
            })
          }
        }
      } catch (error) {
        console.error("Erro ao verificar limites:", error)
      }
    }
    
    checkUserLimits()
  }, [router, toast])
  
  const handleCreateWorkout = async (data: {
    name: string
    description: string
    goal_id?: string
    is_public: boolean
  }) => {
    try {
      setIsLoading(true)
      
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      
      // Verificar novamente se pode criar treino (usuário gratuito)
      if (currentUser.role === 'free') {
        const { data: canCreate, error } = await supabase
          .rpc('check_free_user_workout_limits', {
            user_id: currentUser.id
          })
          
        if (error) {
          throw error
        }
        
        if (!canCreate) {
          toast({
            title: "Limite atingido",
            description: "Usuários gratuitos podem criar apenas 1 treino. Faça upgrade para o plano premium para criar treinos ilimitados.",
            variant: "destructive",
          })
          router.push("/dashboard/planos")
          return
        }
      }
      
      const { data: workoutData, error } = await supabase
        .from("workouts")
        .insert({
          name: data.name,
          description: data.description || null,
          created_by: currentUser.id,
          goal_id: data.goal_id === "none" ? null : data.goal_id || null,
          is_public: data.is_public,
          is_ai_generated: false,
        })
        .select()
        .single()
        
      if (error) {
        throw error
      }
      
      toast({
        title: "Treino criado com sucesso",
        description: "Agora você pode adicionar exercícios ao seu treino.",
      })
      
      router.push(`/dashboard/workouts/${workoutData.id}/edit`)
    } catch (error) {
      console.error("Erro ao criar treino:", error)
      toast({
        title: "Erro ao criar treino",
        description: "Ocorreu um erro ao criar o treino. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/workouts">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Novo Treino</h2>
        </div>
        {isLoading && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </div>
        )}
      </div>
      
      <div className="rounded-lg border p-6">
        {canCreateWorkout ? (
          <WorkoutForm onSubmit={handleCreateWorkout} isLoading={isLoading} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Limite de treinos atingido</h3>
            <p className="text-muted-foreground mb-4">
              Usuários gratuitos podem criar apenas 1 treino. Faça upgrade para o plano premium para criar treinos ilimitados.
            </p>
            <Button asChild>
              <Link href="/dashboard/planos">
                Ver planos premium
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 