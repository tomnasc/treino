"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { BrainCircuit } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Textarea } from "@/app/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/app/components/ui/select"
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/app/components/ui/accordion"
import { Checkbox } from "@/app/components/ui/checkbox"
import { WorkoutGenerationInput } from "@/app/lib/huggingface"
import { AISettings, TrainingGoal } from "@/app/types/database.types"

const EXPERIENCE_LEVELS = [
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediário" },
  { value: "avancado", label: "Avançado" },
]

const EQUIPMENT_OPTIONS = [
  { id: "halteres", label: "Halteres" },
  { id: "barra", label: "Barra/Anilhas" },
  { id: "maquinas", label: "Máquinas" },
  { id: "cabos", label: "Cabos/Polias" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "peso_corporal", label: "Peso Corporal" },
  { id: "bola_suica", label: "Bola Suíça" },
  { id: "trx", label: "TRX/Suspensão" },
  { id: "bola_med", label: "Medicine Ball" },
  { id: "elasticos", label: "Bandas Elásticas" },
]

interface AISettingsFormProps {
  initialData: AISettings | null
  trainingGoals: TrainingGoal[]
  onSubmit: (data: WorkoutGenerationInput) => Promise<void>
  isGenerating: boolean
}

export function AISettingsForm({
  initialData,
  trainingGoals,
  onSubmit,
  isGenerating
}: AISettingsFormProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(() => {
    if (initialData?.available_equipment) {
      return initialData.available_equipment.split(',').map(e => e.trim())
    }
    return ["halteres", "barra", "maquinas"] // Equipamento padrão
  })

  const { register, handleSubmit, setValue, watch } = useForm<{
    goal: string
    experienceLevel: string
    frequency: number
    sessionDuration: number
    healthConditions: string
    preferences: string
  }>({
    defaultValues: {
      goal: initialData?.goal_id 
        ? trainingGoals.find(g => g.id === initialData.goal_id)?.name || ""
        : "",
      experienceLevel: initialData?.experience_level || "intermediario",
      frequency: initialData?.frequency || 4,
      sessionDuration: initialData?.session_duration || 60,
      healthConditions: initialData?.health_conditions || "",
      preferences: initialData?.preferences || "",
    }
  })

  const handleEquipmentChange = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedEquipment(prev => [...prev, id])
    } else {
      setSelectedEquipment(prev => prev.filter(item => item !== id))
    }
  }

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit({
      ...data,
      equipment: selectedEquipment
    })
  })

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="goal">Objetivo Principal <span className="text-red-500">*</span></Label>
          <Select
            value={watch("goal")}
            onValueChange={(value) => setValue("goal", value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione seu objetivo" />
            </SelectTrigger>
            <SelectContent>
              {trainingGoals.map((goal) => (
                <SelectItem key={goal.id} value={goal.name}>
                  {goal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="experienceLevel">Nível de Experiência <span className="text-red-500">*</span></Label>
          <Select
            value={watch("experienceLevel")}
            onValueChange={(value) => setValue("experienceLevel", value)}
            required
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione seu nível" />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="frequency">
              Frequência Semanal <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch("frequency").toString()}
              onValueChange={(value) => setValue("frequency", parseInt(value))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Dias por semana" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} {num === 1 ? 'dia' : 'dias'} por semana
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionDuration">
              Duração da Sessão <span className="text-red-500">*</span>
            </Label>
            <Select
              value={watch("sessionDuration").toString()}
              onValueChange={(value) => setValue("sessionDuration", parseInt(value))}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Minutos por sessão" />
              </SelectTrigger>
              <SelectContent>
                {[30, 45, 60, 75, 90, 120].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num} minutos
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="equipment">
            <AccordionTrigger>Equipamentos Disponíveis</AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                {EQUIPMENT_OPTIONS.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`equipment-${option.id}`}
                      checked={selectedEquipment.includes(option.id)}
                      onCheckedChange={(checked) => 
                        handleEquipmentChange(option.id, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`equipment-${option.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="health">
            <AccordionTrigger>Condições de Saúde</AccordionTrigger>
            <AccordionContent>
              <Textarea
                placeholder="Descreva quaisquer condições de saúde, lesões ou limitações que você tenha (ex: problema no joelho, dor nas costas...)"
                className="resize-none"
                {...register("healthConditions")}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="preferences">
            <AccordionTrigger>Preferências Pessoais</AccordionTrigger>
            <AccordionContent>
              <Textarea
                placeholder="Descreva suas preferências específicas para o treino (ex: foco em certos músculos, exercícios favoritos ou que não gosta...)"
                className="resize-none"
                {...register("preferences")}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      <Button type="submit" disabled={isGenerating} className="w-full">
        {isGenerating ? (
          <>
            <BrainCircuit className="mr-2 h-4 w-4 animate-pulse" />
            Gerando Treino...
          </>
        ) : (
          <>
            <BrainCircuit className="mr-2 h-4 w-4" />
            Gerar Treino Personalizado
          </>
        )}
      </Button>
    </form>
  )
} 