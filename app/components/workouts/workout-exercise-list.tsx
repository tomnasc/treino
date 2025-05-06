"use client"

import { Exercise, WorkoutExercise } from "@/app/types/database.types"
import Image from "next/image"
import { Video } from "lucide-react"
import { YouTubePlayer } from "@/app/components/ui/youtube-player"
import { Button } from "@/app/components/ui/button"
import { cn } from "@/app/lib/utils"
import { useEffect, useState } from "react"

interface WorkoutExerciseListProps {
  exercises: (WorkoutExercise & { exercise: Exercise })[]
  readOnly?: boolean
}

export function WorkoutExerciseList({ exercises, readOnly = true }: WorkoutExerciseListProps) {
  // Estado normalizado para exercícios
  const [normalizedExercises, setNormalizedExercises] = useState<(WorkoutExercise & { exercise: Exercise })[]>([]);

  // Processar e normalizar os exercícios quando o componente é montado ou quando exercises muda
  useEffect(() => {
    const normalized = exercises.map(exercise => {
      // Criar uma cópia segura do exercício
      const normalizedExercise = { ...exercise };
      
      // Verificar se exercise_type está definido corretamente
      const hasTime = normalizedExercise.time !== null && 
                       normalizedExercise.time !== undefined && 
                       String(normalizedExercise.time).trim() !== "";
                       
      // Se o tipo não estiver definido corretamente mas tiver tempo, corrigir como "time"
      if (hasTime && 
         (normalizedExercise.exercise_type !== "time" && 
          normalizedExercise.exercise_type !== "reps")) {
        normalizedExercise.exercise_type = "time";
      }
      
      return normalizedExercise;
    });
    
    setNormalizedExercises(normalized);
    
    // Debug
    console.log("Exercícios normalizados:", normalized.map(item => ({
      id: item.id,
      name: item.exercise.name,
      exercise_type: item.exercise_type,
      time: item.time,
      reps: item.reps
    })));
  }, [exercises]);

  if (!normalizedExercises.length) {
    return (
      <div className="text-center py-6 border border-dashed rounded-lg">
        <p className="text-muted-foreground">Nenhum exercício encontrado.</p>
      </div>
    )
  }

  // Função auxiliar para determinar se o exercício é baseado em tempo
  const isTimeBasedExercise = (item: WorkoutExercise & { exercise: Exercise }) => {
    // Verifica o tipo como string para comparação mais segura
    const exerciseTypeStr = String(item.exercise_type || "").toLowerCase();
    
    return (
      exerciseTypeStr === "time" || 
      // Se tiver um valor de time definido, consideramos como exercício baseado em tempo
      (item.time !== null && item.time !== undefined && String(item.time).trim() !== "") ||
      // Se não tiver repetições mas tiver tempo, é baseado em tempo
      ((!item.reps || item.reps === "0" || item.reps === "") && item.time)
    );
  };

  // Função auxiliar para obter o valor apropriado
  const getExerciseValue = (item: WorkoutExercise & { exercise: Exercise }) => {
    if (isTimeBasedExercise(item)) {
      return `${item.time || '0'}s`;
    }
    return item.reps || "N/A";
  };

  return (
    <div className="divide-y">
      {normalizedExercises.map((item) => (
        <div key={item.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-1 w-full">
              <div className="flex items-center">
                <span className="font-medium text-muted-foreground mr-2">
                  {item.order_position}.
                </span>
                <h4 className="font-semibold">{item.exercise.name}</h4>
              </div>
              
              {item.exercise.description && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.exercise.description}
                </p>
              )}
              
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Séries</span>
                  <p className="text-sm">{item.sets}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {isTimeBasedExercise(item) ? 'Tempo' : 'Repetições'}
                  </span>
                  <p className="text-sm">
                    {getExerciseValue(item)}
                  </p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Peso</span>
                  <p className="text-sm">{item.weight || "Não especificado"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Descanso</span>
                  <p className="text-sm">{item.rest_time ? `${item.rest_time}s` : "Não especificado"}</p>
                </div>
              </div>
              
              {item.notes && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-muted-foreground">Observações</span>
                  <p className="text-sm whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}

              {item.exercise.youtube_url && (
                <div className="mt-3">
                  <YouTubePlayer 
                    url={item.exercise.youtube_url} 
                    buttonVariant="secondary"
                    buttonSize="sm"
                    label="Ver vídeo de demonstração"
                    className="flex items-center"
                  />
                </div>
              )}
            </div>
            
            {item.exercise.image_url && (
              <div className="sm:ml-4 flex-shrink-0 mt-2 sm:mt-0 order-first sm:order-last">
                <div className="h-16 w-16 overflow-hidden rounded-md bg-muted">
                  <Image
                    src={item.exercise.image_url}
                    alt={item.exercise.name}
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
} 