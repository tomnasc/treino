"use client"

import { useState } from "react"
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
        <WorkoutForm onSubmit={handleCreateWorkout} isLoading={isLoading} />
      </div>
    </div>
  )
} 