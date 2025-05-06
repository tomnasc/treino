"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { Save } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { TrainingGoal } from "@/app/types/database.types"
import { supabase } from "@/app/lib/supabase"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select"

import { Switch } from "@/app/components/ui/switch"

interface WorkoutFormProps {
  workout?: {
    id?: string
    name: string
    description?: string | null
    goal_id?: string | null
    is_public?: boolean
  }
  onSubmit: (data: {
    name: string
    description: string
    goal_id?: string
    is_public: boolean
  }) => Promise<void>
  isLoading?: boolean
}

export function WorkoutForm({ workout, onSubmit, isLoading = false }: WorkoutFormProps) {
  const [trainingGoals, setTrainingGoals] = useState<TrainingGoal[]>([])
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: workout?.name || "",
      description: workout?.description || "",
      goal_id: workout?.goal_id || "none",
      is_public: workout?.is_public || false,
    },
  })

  const isPublic = watch("is_public")
  
  useEffect(() => {
    async function fetchTrainingGoals() {
      const { data } = await supabase.from("training_goals").select("*")
      if (data) {
        setTrainingGoals(data)
      }
    }

    fetchTrainingGoals()
  }, [])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome do Treino <span className="text-red-500">*</span></Label>
          <Input
            id="name"
            {...register("name", { required: "Nome é obrigatório" })}
            placeholder="Ex: Treino ABC - Peito/Costas/Pernas"
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            {...register("description")}
            placeholder="Descreva o objetivo e detalhes do treino"
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo</Label>
          <Select
            value={watch("goal_id")}
            onValueChange={(value) => setValue("goal_id", value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um objetivo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum objetivo específico</SelectItem>
              {trainingGoals.map((goal) => (
                <SelectItem key={goal.id} value={goal.id}>
                  {goal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="is_public"
            checked={isPublic}
            onCheckedChange={(checked) => setValue("is_public", checked)}
          />
          <Label htmlFor="is_public">Tornar treino público</Label>
        </div>
        {isPublic && (
          <p className="text-sm text-muted-foreground">
            Treinos públicos podem ser vistos e copiados por outros usuários.
          </p>
        )}
      </div>

      <Button type="submit" disabled={isLoading}>
        <Save className="mr-2 h-4 w-4" />
        {isLoading ? "Salvando..." : "Salvar Treino"}
      </Button>
    </form>
  )
} 