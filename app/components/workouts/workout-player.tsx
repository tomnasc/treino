"use client"

import { useEffect, useState, useRef } from "react"
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle, 
  Clock, 
  Loader2, 
  Pause, 
  Play, 
  RefreshCcw, 
  XCircle,
  Video,
  AlertTriangle,
  ChevronRight,
  List
} from "lucide-react"
import Image from "next/image"

import { Button } from "@/app/components/ui/button"
import { Exercise, Workout, WorkoutExercise } from "@/app/types/database.types"
import { supabase } from "@/app/lib/supabase"
import { useToast } from "@/app/hooks/use-toast"
import { Progress } from "@/app/components/ui/progress"
import { Input } from "@/app/components/ui/input"
import { Textarea } from "@/app/components/ui/textarea"
import { YouTubePlayer } from "@/app/components/ui/youtube-player"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
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
import { cn } from "@/app/lib/utils"

interface WorkoutPlayerProps {
  workout: Workout
  exercises: (WorkoutExercise & { exercise: Exercise })[]
  onFinish: () => void
}

export function WorkoutPlayer({ workout, exercises, onFinish }: WorkoutPlayerProps) {
  const { toast } = useToast()
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentSetIndex, setCurrentSetIndex] = useState(0)
  const [isResting, setIsResting] = useState(false)
  const [restTimeLeft, setRestTimeLeft] = useState(0)
  const [restEndTime, setRestEndTime] = useState<number | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [workoutDuration, setWorkoutDuration] = useState(0)
  const [workoutStartTime, setWorkoutStartTime] = useState(new Date())
  const [pausedTime, setPausedTime] = useState(0)
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [exercisesCompleted, setExercisesCompleted] = useState<string[]>([])
  const [showRemainingExercises, setShowRemainingExercises] = useState(false)
  const [exerciseTimeLeft, setExerciseTimeLeft] = useState(0)
  const [isExerciseTimerRunning, setIsExerciseTimerRunning] = useState(false)
  const [exerciseEndTime, setExerciseEndTime] = useState<number | null>(null)
  const [isButtonEnabled, setIsButtonEnabled] = useState(false)
  const [showPendingExercisesDialog, setShowPendingExercisesDialog] = useState(false)
  const [pendingExercisesList, setPendingExercisesList] = useState<(WorkoutExercise & { exercise: Exercise })[]>([])

  // Ref para armazenar valores dos inputs como backup
  const inputValuesRef = useRef<Record<string, string>>({});

  // Histórico de exercícios completados
  const [exerciseHistory, setExerciseHistory] = useState<Record<string, {
    sets_completed: number
    actual_reps: string
    actual_weight: string
    notes: string
    reps_history: number[] // Array de repetições realizadas em cada série
  }>>({})

  // Adicionar referência para controlar exibição de toasts
  const toastShownRef = useRef<Record<string, boolean>>({});

  const currentExercise = exercises[currentExerciseIndex]
  const totalExercises = exercises.length
  const totalSets = currentExercise ? currentExercise.sets : 0
  const isLastExercise = currentExerciseIndex === totalExercises - 1
  const isLastSet = currentSetIndex === totalSets - 1
  const workoutHistoryId = typeof window !== 'undefined' ? sessionStorage.getItem("currentWorkoutHistoryId") : null
  const progress = ((currentExerciseIndex * 100) / totalExercises) + 
                   ((currentSetIndex + 1) * (100 / totalExercises) / totalSets)

  // Definir valores padrão para exercícios por tempo
  const exerciseType = currentExercise?.exercise_type || 'reps'
  const exerciseTime = currentExercise?.time || '0'

  // Função para mostrar toast apenas uma vez
  const showToastOnce = (key: string, toastConfig: any) => {
    if (toastShownRef.current[key]) return;
    
    toast(toastConfig);
    toastShownRef.current[key] = true;
    
    // Limpar após algum tempo para permitir que o mesmo toast seja mostrado novamente mais tarde, se necessário
    setTimeout(() => {
      toastShownRef.current[key] = false;
    }, 5000);
  };

  // Verificar se há um estado salvo do treino - VERSÃO SIMPLIFICADA E CORRIGIDA
  useEffect(() => {
    if (!workoutHistoryId) return;
    
    // Função para carregar e inicializar o estado do treino
    const loadWorkoutState = async () => {
      console.log("Iniciando carregamento do estado do treino:", workoutHistoryId);
      
      // Configurar estado inicial
      const initialHistory: Record<string, {
        sets_completed: number
        actual_reps: string
        actual_weight: string
        notes: string
        reps_history: number[]
      }> = {};
      
      // Criar histórico inicial vazio para cada exercício
      exercises.forEach(exercise => {
        initialHistory[exercise.id] = {
          sets_completed: 0,
          actual_reps: "",
          actual_weight: exercise.weight || "",
          notes: "",
          reps_history: []
        };
      });
      
      // PARTE 1: Verificar dados no banco de dados
      try {
        const { data, error } = await supabase
          .from("exercise_history")
          .select("*")
          .eq("workout_history_id", workoutHistoryId);
          
        if (error) throw error;
        
        let completedExerciseIds: string[] = [];
        
        // Se temos dados no banco, aplicar ao histórico inicial
        if (data && data.length > 0) {
          console.log("Dados encontrados no banco:", data.length, "registros");
          
          data.forEach(record => {
            if (initialHistory[record.workout_exercise_id]) {
              initialHistory[record.workout_exercise_id] = {
                ...initialHistory[record.workout_exercise_id],
                sets_completed: record.sets_completed || 0,
                actual_reps: record.actual_reps || "",
                actual_weight: record.actual_weight || "",
                notes: record.notes || "",
                reps_history: record.reps_history_json || []
              };
              
              // Verificar se o exercício está completo
              const exercise = exercises.find(ex => ex.id === record.workout_exercise_id);
              if (exercise && record.sets_completed >= exercise.sets) {
                completedExerciseIds.push(record.workout_exercise_id);
              }
            }
          });
        }
        
        // PARTE 2: Verificar dados no localStorage
        let savedState = localStorage.getItem(`workout_state_${workoutHistoryId}`);
        if (!savedState) {
          savedState = sessionStorage.getItem(`workout_state_backup_${workoutHistoryId}`);
        }
        
        // Valores padrão
        let exerciseIndex = 0;
        let setIndex = 0;
        let exercises_completed = completedExerciseIds;
        let duration = 0;
        
        // Se temos um estado salvo, atualizar os valores
        if (savedState) {
          try {
            const parsedState = JSON.parse(savedState);
            console.log("Estado local encontrado");
            
            exerciseIndex = typeof parsedState.currentExerciseIndex === 'number' ? 
              Math.min(parsedState.currentExerciseIndex, exercises.length - 1) : 0;
              
            setIndex = typeof parsedState.currentSetIndex === 'number' ? 
              parsedState.currentSetIndex : 0;
              
            duration = parsedState.workoutDuration || 0;
            
            // Recuperar o tempo pausado
            const savedPausedTime = parsedState.pausedTime || 0;
            setPausedTime(savedPausedTime);
            
            // Combinar exercícios completos
            if (parsedState.exercisesCompleted && Array.isArray(parsedState.exercisesCompleted)) {
              exercises_completed = Array.from(
                new Set([...completedExerciseIds, ...parsedState.exercisesCompleted])
              );
            }
            
            // Mesclar histórico de exercícios do estado local
            if (parsedState.exerciseHistory) {
              Object.keys(parsedState.exerciseHistory).forEach(exId => {
                if (initialHistory[exId]) {
                  // Sempre usar o maior valor para sets_completed
                  const localSets = parsedState.exerciseHistory[exId].sets_completed || 0;
                  const dbSets = initialHistory[exId].sets_completed;
                  
                  initialHistory[exId] = {
                    ...initialHistory[exId],
                    ...parsedState.exerciseHistory[exId],
                    // Garantir que não perdemos progresso
                    sets_completed: Math.max(localSets, dbSets)
                  };
                }
              });
            }
          } catch (error) {
            console.error("Erro ao processar estado local:", error);
          }
        } else if (completedExerciseIds.length > 0) {
          // Se não temos estado local, mas temos dados no banco,
          // calcular o próximo exercício/série não completo
          for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            if (!completedExerciseIds.includes(ex.id)) {
              exerciseIndex = i;
              
              // Verificar qual série está pendente
              const completedSets = initialHistory[ex.id].sets_completed;
              setIndex = Math.min(completedSets, ex.sets - 1);
              
              break;
            }
          }
        }
        
        // PARTE 3: Aplicar o estado final
        // Aplicar somente uma vez, com valores consolidados
        setExerciseHistory(initialHistory);
        setCurrentExerciseIndex(exerciseIndex);
        setCurrentSetIndex(setIndex);
        setExercisesCompleted(exercises_completed);
        
        // Configurar o cronômetro para continuar de onde parou
        setWorkoutDuration(duration);
        
        // Ajustar a hora de início para manter a duração
        // Adicionar o tempo pausado para ter um cálculo correto
        const calculatedStartTime = new Date();
        calculatedStartTime.setSeconds(calculatedStartTime.getSeconds() - duration - Math.floor(pausedTime / 1000));
        setWorkoutStartTime(calculatedStartTime);
        
        console.log(`Estado restaurado: Exercício ${exerciseIndex + 1}, Série ${setIndex + 1}, Duração: ${duration}s, Pausado: ${Math.floor(pausedTime / 1000)}s`);
        
        // Mostrar alerta uma única vez
        showToastOnce('treino-retomado', {
          title: "Treino retomado",
          description: `Retomando treino do exercício ${exerciseIndex + 1}, série ${setIndex + 1}.`
        });
        
      } catch (error) {
        console.error("Erro ao carregar estado do treino:", error);
        
        // Em caso de erro, usar valores iniciais simples
        setExerciseHistory(initialHistory);
      }
    };
    
    // Iniciar o carregamento
    loadWorkoutState();
    
    // Evitar dependências que causam reexecução desnecessária
  }, [workoutHistoryId]); // Dependências mínimas para evitar múltiplas inicializações

  // Adicionar listener para evento de saída do navegador
  useEffect(() => {
    if (!workoutHistoryId) return;
    
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Salvar estado final antes de sair
      console.log("Salvando estado final antes de sair da página");
      
      try {
        const finalState = {
          currentExerciseIndex,
          currentSetIndex, 
          exercisesCompleted,
          workoutDuration,
          exerciseHistory,
          pausedTime,
          lastUpdated: new Date().toISOString()
        };
        
        const stateJSON = JSON.stringify(finalState);
        
        // Usar localStorage.setItem síncrono para garantir que seja salvo antes de sair
        localStorage.setItem(`workout_state_${workoutHistoryId}`, stateJSON);
        sessionStorage.setItem(`workout_state_backup_${workoutHistoryId}`, stateJSON);
        
        // Também salvar como backup adicional
        localStorage.setItem(`workout_emergency_backup_${workoutHistoryId}`, stateJSON);
      } catch (error) {
        console.error("Erro ao salvar estado final:", error);
      }
      
      // Padrão para mostrar um diálogo de confirmação (pode não funcionar em todos os navegadores)
      event.preventDefault();
      event.returnValue = "Tem certeza que deseja sair? Seu progresso será salvo, mas talvez você prefira encerrar o treino adequadamente.";
      return event.returnValue;
    };
    
    // Adicionar event listener para beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Adicionar listener para visibilitychange para salvar quando o app for para background
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.log("Página ficou em segundo plano, salvando estado");
        try {
          const backgroundState = {
            currentExerciseIndex,
            currentSetIndex, 
            exercisesCompleted,
            workoutDuration,
            exerciseHistory,
            pausedTime,
            lastUpdated: new Date().toISOString()
          };
          
          const stateJSON = JSON.stringify(backgroundState);
          localStorage.setItem(`workout_state_${workoutHistoryId}`, stateJSON);
          sessionStorage.setItem(`workout_state_backup_${workoutHistoryId}`, stateJSON);
        } catch (error) {
          console.error("Erro ao salvar estado em segundo plano:", error);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [workoutHistoryId, currentExerciseIndex, currentSetIndex, exercisesCompleted, workoutDuration, exerciseHistory]);

  // Adicionar um efeito para carregar valores de input quando o exercício atual mudar
  useEffect(() => {
    if (!currentExercise || !workoutHistoryId) return;
    
    // Pré-carregar valores do exercício atual nos inputs
    try {
      const exerciseId = currentExercise.id;
      console.log(`Exercício alterado para: ${exerciseId}, carregando valores...`);
      
      // Carregar valores do localStorage
      const inputValues = JSON.parse(localStorage.getItem(`workout_input_values_${workoutHistoryId}`) || '{}');
      
      // Verificar todos os campos
      const fields = ['actual_reps', 'actual_weight', 'notes'];
      fields.forEach(field => {
        const key = `${exerciseId}_${field}`;
        if (inputValues[key]) {
          console.log(`Pré-carregando ${field}: ${inputValues[key]}`);
          inputValuesRef.current[key] = inputValues[key];
          
          // Também atualizar o estado diretamente
          setExerciseHistory(prev => {
            if (!prev[exerciseId]) return prev; // Se não existe no estado, não atualizar
            
            return {
              ...prev,
              [exerciseId]: {
                ...prev[exerciseId],
                [field]: inputValues[key]
              }
            };
          });
        }
      });
    } catch (error) {
      console.error("Erro ao pré-carregar valores de input:", error);
    }
  }, [currentExercise, workoutHistoryId]);

  // Timer para o tempo de descanso
  useEffect(() => {
    let timer: NodeJS.Timeout

    if (isResting && !isPaused) {
      // Inicializar o tempo de término apenas se ainda não estiver definido
      if (restEndTime === null && restTimeLeft > 0) {
        const endTimeMs = Date.now() + restTimeLeft * 1000;
        setRestEndTime(endTimeMs);
      }
      
      timer = setInterval(() => {
        if (restEndTime !== null) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((restEndTime - now) / 1000));
          
          setRestTimeLeft(remaining);
          
          if (remaining <= 0) {
            setIsResting(false);
            setRestEndTime(null);
            playSound('rest-complete');
          }
        }
      }, 500) // Verificar a cada meio segundo para maior precisão
    }

    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isResting, isPaused, restEndTime])

  // Timer para a duração total do treino
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (!isPaused) {
      timer = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = now - workoutStartTime.getTime();
        // Usar o tempo pausado acumulado para calcular o tempo total
        setWorkoutDuration(Math.floor(elapsed / 1000) - Math.floor(pausedTime / 1000));
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [workoutStartTime, isPaused, pausedTime]);

  // Função auxiliar para tocar sons
  const playSound = (type: 'rest-complete' | 'exercise-complete' | 'set-complete') => {
    try {
      const audio = new Audio(
        type === 'rest-complete' 
          ? '/sounds/rest-complete.mp3' 
          : type === 'exercise-complete'
            ? '/sounds/exercise-complete.mp3'
            : '/sounds/set-complete.mp3'
      )
      audio.play()
    } catch (error) {
      console.error('Erro ao tocar som:', error)
    }
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    return [
      hours > 0 ? String(hours).padStart(2, '0') : null,
      String(minutes).padStart(2, '0'),
      String(secs).padStart(2, '0')
    ].filter(Boolean).join(':')
  }

  const startRest = () => {
    const restTime = currentExercise.rest_time || 60
    setRestTimeLeft(restTime)
    setRestEndTime(null) // Limpar o tempo de término anterior
    setIsResting(true)
  }

  // Função auxiliar para verificar se todas as séries atingiram o número alvo de repetições
  const allSetsReachedTargetReps = (exerciseId: string, targetReps: number) => {
    const history = exerciseHistory[exerciseId];
    const exercise = exercises.find(ex => ex.id === exerciseId);
    const exerciseType = exercise?.exercise_type || 'reps';
    
    // Verifica se o número de séries completadas é igual ao total de séries
    if (history.sets_completed !== totalSets) return false;
    
    // Para exercícios baseados em tempo, consideramos qualquer valor registrado como válido
    if (exerciseType === 'time') {
      return history.reps_history.length === totalSets;
    }
    
    // Para exercícios baseados em repetições, verificamos o alvo
    return history.reps_history.length === totalSets && 
           history.reps_history.every(reps => reps >= targetReps);
  }

  const handleCompleteSet = async () => {
    // Impedir múltiplas chamadas enquanto está salvando
    if (isSaving) {
      console.log("Operação de salvamento em andamento, ignorando solicitação");
      return;
    }
    
    // Se o botão estiver desabilitado, não prosseguir
    if (!isButtonEnabled) {
      console.log("Botão desabilitado, ignorando ação de completar série");
      return;
    }
    
    try {
      // 1. Validar as repetições (somente para exercícios baseados em repetições)
      const exerciseType = currentExercise.exercise_type || 'reps';
      let actualReps = 0;
      let targetReps = 0;
      
      if (exerciseType === 'reps') {
        const actualRepsValue = getInputValue(currentExercise.id, 'actual_reps', '');
        
        if (!actualRepsValue) {
          showToastOnce('reps-required', {
            title: "Repetições não informadas",
            description: "Por favor, informe quantas repetições você fez.",
            variant: "destructive",
          });
          return;
        }
        
        actualReps = parseInt(actualRepsValue);
        targetReps = parseInt(currentExercise.reps);
        
        if (isNaN(actualReps)) {
          showToastOnce('reps-invalid', {
            title: "Repetições inválidas",
            description: "Por favor, informe um número válido de repetições.",
            variant: "destructive",
          });
          return;
        }
        
        // Dica sobre repetições apenas para exercícios baseados em repetições
        if (!isNaN(targetReps) && actualReps < targetReps * 0.5) {
          showToastOnce('reps-tip', {
            title: "Dica de treino",
            description: "Considere reduzir o peso na próxima série para conseguir mais repetições.",
          });
        }
      } else {
        // Para exercícios baseados em tempo, usar o tempo do exercício como as repetições
        // (já que o usuário não informa isso manualmente)
        const timeInSeconds = parseInt(currentExercise.time || '0');
        // Salvar o tempo do exercício como as "repetições" para manter consistência no banco de dados
        handleUpdateHistory(currentExercise.id, 'actual_reps', timeInSeconds.toString());
        actualReps = timeInSeconds;
      }

      // 2. Preparar para a transição de estado
      setIsSaving(true);
      
      // 3. Atualizar histórico de repetições
      const exerciseId = currentExercise.id;
      
      setExerciseHistory(prev => {
        // Garantir que o exercício existe no histórico
        const prevExercise = prev[exerciseId] || {
          sets_completed: 0,
          actual_reps: actualReps.toString(),
          actual_weight: getInputValue(exerciseId, 'actual_weight', ''),
          notes: getInputValue(exerciseId, 'notes', ''),
          reps_history: []
        };
        
        // Criar uma cópia do array de repetições
        const updatedRepsHistory = [...prevExercise.reps_history];
        
        // Atualizar a série atual
        if (currentSetIndex < updatedRepsHistory.length) {
          updatedRepsHistory[currentSetIndex] = actualReps;
        } else {
          updatedRepsHistory.push(actualReps);
        }
        
        // Retornar novo histórico com repetições atualizadas
        return {
          ...prev,
          [exerciseId]: {
            ...prevExercise,
            sets_completed: prevExercise.sets_completed + 1,
            reps_history: updatedRepsHistory,
            actual_reps: actualReps.toString()
          }
        };
      });
      
      // 4. Determinar próximos valores
      const isLastSet = currentSetIndex === totalSets - 1;
      const isLastExercise = currentExerciseIndex === totalExercises - 1;
      
      const nextSetIndex = isLastSet ? 0 : currentSetIndex + 1;
      const nextExerciseIndex = isLastSet 
        ? (isLastExercise ? currentExerciseIndex : currentExerciseIndex + 1) 
        : currentExerciseIndex;
      
      // 5. Salvar no banco de dados (aguardar conclusão)
      console.log(`Salvando dados do exercício ${exerciseId}`);
      const saveResult = await saveExerciseHistory(exerciseId);
      
      if (!saveResult) {
        console.warn("Falha ao salvar no banco, mas continuando com dados locais");
      }
      
      // 7. Atualizar estado para próxima série/exercício
      console.log(`Passando para - Exercício: ${nextExerciseIndex + 1}, Série: ${nextSetIndex + 1}`);
      
      if (isLastSet) {
        // Se for a última série, marcar exercício como concluído
        setExercisesCompleted(prev => {
          if (prev.includes(exerciseId)) return prev;
          return [...prev, exerciseId];
        });
        
        // Se for o último exercício, terminar treino
        if (isLastExercise) {
          completeWorkout();
        } else {
          // Passar para o próximo exercício
          setCurrentExerciseIndex(nextExerciseIndex);
          setCurrentSetIndex(nextSetIndex);
          
          // Tocar som de conclusão
          playSound('exercise-complete');
        }
      } else {
        // Passar para a próxima série
        setCurrentSetIndex(nextSetIndex);
        
        // Tocar som
        playSound('set-complete');
        
        // Iniciar tempo de descanso
        if (currentExercise.rest_time && currentExercise.rest_time > 0) {
          startRest();
        }
      }
      
      // 8. Atualizar estado completo para garantir persistência
      const updatedState = {
        currentExerciseIndex: nextExerciseIndex,
        currentSetIndex: nextSetIndex,
        exercisesCompleted: isLastSet 
          ? [...exercisesCompleted, exerciseId]
          : exercisesCompleted,
        workoutDuration,
        lastUpdated: new Date().toISOString()
      };
      
      // Salvar estado em localStorage e sessionStorage
      if (workoutHistoryId) {
        try {
          localStorage.setItem(
            `workout_state_${workoutHistoryId}`, 
            JSON.stringify(updatedState)
          );
          sessionStorage.setItem(
            `workout_state_backup_${workoutHistoryId}`, 
            JSON.stringify(updatedState)
          );
        } catch (storageError) {
          console.error("Erro ao salvar estado atualizado:", storageError);
        }
      }
      
    } catch (error) {
      console.error("Erro ao completar série:", error);
      showToastOnce('complete-set-error', {
        title: "Erro inesperado",
        description: "Ocorreu um erro ao completar a série.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkipRest = () => {
    setIsResting(false)
    setRestEndTime(null)
  }

  const handleSkipExercise = async () => {
    // Salvar o progresso atual
    await saveExerciseHistory(currentExercise.id)
    
    if (isLastExercise) {
      completeWorkout()
    } else {
      setCurrentExerciseIndex(prev => prev + 1)
      setCurrentSetIndex(0)
    }
  }

  const togglePause = () => {
    setIsPaused(prev => {
      const newPausedState = !prev;
      
      if (newPausedState) {
        // Começando uma pausa - salvar o momento atual
        setPauseStartTime(Date.now());
      } else {
        // Terminando uma pausa - calcular quanto tempo ficou pausado
        if (pauseStartTime !== null) {
          const pauseDuration = Date.now() - pauseStartTime;
          setPausedTime(prev => prev + pauseDuration);
          setPauseStartTime(null);
        }
        
        // Se estiver saindo do modo pausado e estiver no descanso
        if (isResting && restTimeLeft > 0) {
          // Recalcular o tempo de término baseado no tempo restante
          setRestEndTime(Date.now() + restTimeLeft * 1000);
        }
      }
      
      return newPausedState;
    });
  };

  const saveExerciseHistory = async (exerciseId: string) => {
    if (!workoutHistoryId) return;
    
    try {
      setIsSaving(true);
      
      const history = exerciseHistory[exerciseId];
      if (!history) {
        console.error(`Tentativa de salvar histórico para exercício inexistente: ${exerciseId}`);
        return;
      }
      
      console.log(`Salvando histórico para exercício ${exerciseId}:`, {
        sets_completed: history.sets_completed,
        reps: history.actual_reps,
        weight: history.actual_weight,
        reps_history: history.reps_history
      });
      
      // 1. Sempre salvar dados locais primeiro para evitar perda em caso de erro de rede
      try {
        // Salvar no localStorage para persistência
        const savedData = localStorage.getItem(`workout_${workout.id}_data`) || "{}";
        const parsed = JSON.parse(savedData);
        
        // Salvar pesos e notas para uso em treinos futuros
        const updatedData = {
          ...parsed,
          [exerciseId]: {
            actual_weight: history.actual_weight,
            notes: history.notes
          }
        };
        
        localStorage.setItem(`workout_${workout.id}_data`, JSON.stringify(updatedData));
        
        // Salvar estado completo do treino
        const workoutState = {
          currentExerciseIndex,
          currentSetIndex,
          exercisesCompleted,
          workoutDuration,
          exerciseHistory,
          pausedTime,
          lastUpdated: new Date().toISOString()
        };
        
        const stateJSON = JSON.stringify(workoutState);
        localStorage.setItem(`workout_state_${workoutHistoryId}`, stateJSON);
        sessionStorage.setItem(`workout_state_backup_${workoutHistoryId}`, stateJSON);
        
        console.log("Dados locais salvos com sucesso");
      } catch (localError) {
        console.error("Erro ao salvar dados localmente:", localError);
      }
      
      // 2. Preparar dados para o banco
      const historyData = {
        sets_completed: history.sets_completed,
        actual_reps: history.actual_reps,
        actual_weight: history.actual_weight || null,
        notes: history.notes || null,
        reps_history_json: history.reps_history || []
      };
      
      // 3. Verificar se já existe um registro
      const { data: existingData, error: checkError } = await supabase
        .from("exercise_history")
        .select("id")
        .eq("workout_history_id", workoutHistoryId)
        .eq("workout_exercise_id", exerciseId)
        .limit(1)
        .maybeSingle(); // Usando maybeSingle em vez de single para evitar erro quando não encontra
        
      if (checkError) {
        console.error(`Erro ao verificar histórico existente: ${checkError.message}`);
      }
      
      // 4. Salvar no banco (com retry automático)
      let retryCount = 0;
      const maxRetries = 3;
      let saveSuccess = false;
      
      while (!saveSuccess && retryCount < maxRetries) {
        try {
          let result;
          
          if (existingData?.id) {
            // Atualizar registro existente
            console.log(`Atualizando registro existente ID ${existingData.id}`);
            result = await supabase
              .from("exercise_history")
              .update(historyData)
              .eq("id", existingData.id)
              .select(); // Adicionando select() para evitar erro 406
          } else {
            // Criar novo registro
            console.log("Criando novo registro de histórico");
            result = await supabase
              .from("exercise_history")
              .insert({
                workout_history_id: workoutHistoryId,
                workout_exercise_id: exerciseId,
                ...historyData
              })
              .select(); // Adicionando select() para evitar erro 406
          }
          
          if (result.error) {
            throw result.error;
          }
          
          saveSuccess = true;
          console.log("Dados salvos com sucesso no banco de dados!");
        } catch (dbError) {
          retryCount++;
          console.error(`Erro ao salvar no banco de dados (tentativa ${retryCount}/${maxRetries}):`, dbError);
          
          if (retryCount >= maxRetries) {
            // Só mostrar erro ao usuário na última tentativa
            showToastOnce('db-save-error', {
              title: "Falha ao salvar no servidor",
              description: "Seus dados foram salvos localmente e serão sincronizados mais tarde.",
              variant: "default"
            });
          } else {
            // Esperar antes de tentar novamente
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      return saveSuccess;
    } catch (error) {
      console.error("Erro geral ao salvar histórico:", error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const checkPendingExercises = () => {
    const incomplete = exercises
      .filter(exercise => !exercisesCompleted.includes(exercise.id))
      .filter(exercise => exercise.id !== currentExercise.id || currentSetIndex < exercise.sets - 1)
    
    return incomplete.length > 0 ? incomplete : null
  }

  const handleSelectExercise = async (index: number) => {
    if (isSaving) {
      console.log("Operação de salvamento em andamento, aguardando...");
      return;
    }
    
    try {
      // Começar salvamento
      setIsSaving(true);
      
      // Salvar progresso do exercício atual antes de mudar
      await saveExerciseHistory(currentExercise.id);
      
      // Obter o exercício selecionado
      const selectedExercise = exercises[index];
      if (!selectedExercise) {
        console.error(`Exercício inválido: índice ${index}`);
        return;
      }
      
      // Determinar o índice da série para o exercício selecionado
      let newSetIndex = 0;
      
      if (exerciseHistory[selectedExercise.id]) {
        const completedSets = exerciseHistory[selectedExercise.id].sets_completed || 0;
        const totalSets = selectedExercise.sets;
        
        // Se todas as séries estiverem completas, começar da primeira
        // Se não, começar da primeira série não completa
        newSetIndex = completedSets >= totalSets ? 0 : Math.min(completedSets, totalSets - 1);
        
        console.log(`Selecionando exercício ${index + 1} (${selectedExercise.exercise.name}), começando da série ${newSetIndex + 1} (${completedSets} de ${totalSets} séries completadas)`);
      } else {
        console.log(`Selecionando exercício ${index + 1}, começando da série 1`);
      }
      
      // Mudar para o exercício selecionado
      setCurrentExerciseIndex(index);
      setCurrentSetIndex(newSetIndex);
      setShowRemainingExercises(false);
      
      // Salvar estado atualizado
      if (workoutHistoryId) {
        try {
          const workoutState = {
            currentExerciseIndex: index,
            currentSetIndex: newSetIndex,
            exercisesCompleted,
            workoutDuration,
            exerciseHistory,
            lastUpdated: new Date().toISOString()
          };
          
          const stateJSON = JSON.stringify(workoutState);
          localStorage.setItem(`workout_state_${workoutHistoryId}`, stateJSON);
          sessionStorage.setItem(`workout_state_backup_${workoutHistoryId}`, stateJSON);
          
          console.log(`Estado salvo após mudar para exercício ${index + 1}, série ${newSetIndex + 1}`);
        } catch (error) {
          console.error("Erro ao salvar estado após mudar exercício:", error);
        }
      }
    } catch (error) {
      console.error("Erro ao selecionar exercício:", error);
      showToastOnce('select-exercise-error', {
        title: "Erro ao mudar exercício",
        description: "Não foi possível mudar para o exercício selecionado.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const completeWorkout = async () => {
    if (!workoutHistoryId) return
    
    // Verificar se há exercícios pendentes
    const pendingExercises = checkPendingExercises()
    
    if (pendingExercises && pendingExercises.length > 0) {
      // Armazenar a lista de exercícios pendentes no estado
      setPendingExercisesList(pendingExercises);
      
      // Mostrar o diálogo de exercícios pendentes diretamente
      setShowPendingExercisesDialog(true);
      return;
    }
    
    // Se não houver exercícios pendentes, finalizar normalmente
    finishWorkoutForcefully()
  }
  
  const finishWorkoutForcefully = async () => {
    if (!workoutHistoryId) return
    
    try {
      setIsFinishing(true)
      
      // Marcar o treino como concluído
      const { error } = await supabase
        .from("workout_history")
        .update({
          completed: true,
          finished_at: new Date().toISOString(),
          duration: workoutDuration
        })
        .eq("id", workoutHistoryId)
        
      if (error) {
        throw error
      }
      
      console.log("Treino finalizado no banco de dados, limpando dados locais");
      
      // Limpar TODOS os dados do treino para garantir que não cause problemas em futuros treinos
      try {
        // Limpar dados no localStorage
        localStorage.removeItem(`workout_state_${workoutHistoryId}`);
        // Limpar backup no sessionStorage
        sessionStorage.removeItem(`workout_state_backup_${workoutHistoryId}`);
        // Limpar qualquer histórico temporário
        sessionStorage.removeItem('temp_exercise_history');
        localStorage.removeItem('temp_exercise_history_backup');
        // Remover ID do treino atual
        sessionStorage.removeItem("currentWorkoutHistoryId");
        
        console.log("Todos os dados do treino foram limpos com sucesso");
      } catch (error) {
        console.error("Erro ao limpar dados do treino:", error);
      }
      
      showToastOnce('workout-completed', {
        title: "Treino concluído!",
        description: "Seu treino foi concluído com sucesso.",
      });
      
      // Chamar o callback de conclusão
      onFinish()
    } catch (error) {
      console.error("Erro ao finalizar treino:", error)
      showToastOnce('finish-workout-error', {
        title: "Erro ao finalizar treino",
        description: "Não foi possível finalizar o treino corretamente.",
        variant: "destructive",
      });
    } finally {
      setIsFinishing(false)
    }
  }

  // Função para persistir imediatamente um valor específico
  const persistInputValue = (exerciseId: string, field: string, value: string) => {
    // Salvar na ref para acesso rápido e imediato
    inputValuesRef.current[`${exerciseId}_${field}`] = value;
    
    // Salvar no localStorage para persistência
    if (workoutHistoryId) {
      try {
        const inputValues = JSON.parse(localStorage.getItem(`workout_input_values_${workoutHistoryId}`) || '{}');
        inputValues[`${exerciseId}_${field}`] = value;
        localStorage.setItem(`workout_input_values_${workoutHistoryId}`, JSON.stringify(inputValues));
      } catch (error) {
        console.error("Erro ao persistir valor de input:", error);
      }
    }
  };

  // Função para recuperar um valor específico
  const getInputValue = (exerciseId: string, field: string, fallbackValue: string = ''): string => {
    // Tentar obter da ref primeiro (mais rápido)
    const refValue = inputValuesRef.current[`${exerciseId}_${field}`];
    if (refValue !== undefined) {
      return refValue;
    }
    
    // Tentar obter do localStorage
    if (workoutHistoryId) {
      try {
        const inputValues = JSON.parse(localStorage.getItem(`workout_input_values_${workoutHistoryId}`) || '{}');
        const storedValue = inputValues[`${exerciseId}_${field}`];
        if (storedValue !== undefined) {
          // Atualizar a ref para futuras consultas
          inputValuesRef.current[`${exerciseId}_${field}`] = storedValue;
          return storedValue;
        }
      } catch (error) {
        console.error("Erro ao recuperar valor de input:", error);
      }
    }
    
    // Finalmente, tentar do estado
    if (exerciseHistory[exerciseId]) {
      if (field === 'actual_reps' && exerciseHistory[exerciseId].actual_reps !== undefined) {
        return exerciseHistory[exerciseId].actual_reps;
      }
      if (field === 'actual_weight' && exerciseHistory[exerciseId].actual_weight !== undefined) {
        return exerciseHistory[exerciseId].actual_weight;
      }
      if (field === 'notes' && exerciseHistory[exerciseId].notes !== undefined) {
        return exerciseHistory[exerciseId].notes;
      }
    }
    
    return fallbackValue;
  };

  // Verificar se exercício mudou - configurar timer quando for por tempo
  useEffect(() => {
    if (!currentExercise) return;
    
    const exerciseType = currentExercise.exercise_type || 'reps';
    
    // Resetar estado do botão
    setIsButtonEnabled(false);
    
    // Se for exercício por tempo, configurar o timer
    if (exerciseType === 'time') {
      const timeInSeconds = parseInt(currentExercise.time || '0');
      setExerciseTimeLeft(timeInSeconds);
      setExerciseEndTime(Date.now() + timeInSeconds * 1000);
      setIsExerciseTimerRunning(true);
      setIsPaused(false);
    }
  }, [currentExercise, currentSetIndex]);

  // Função para iniciar o timer do exercício
  const startExerciseTimer = () => {
    if (exerciseType === 'time') {
      const timeInSeconds = parseInt(currentExercise.time || '0');
      setExerciseTimeLeft(timeInSeconds);
      setExerciseEndTime(Date.now() + timeInSeconds * 1000);
      setIsExerciseTimerRunning(true);
      setIsPaused(false);
      setIsButtonEnabled(false);
    }
  };

  // Modificar função handleUpdateHistory para verificar se as repetições habilitam o botão
  const handleUpdateHistory = (
    exerciseId: string, 
    field: 'actual_reps' | 'actual_weight' | 'notes', 
    value: string
  ) => {
    console.log(`Atualizando campo ${field} para exercício ${exerciseId}:`, value);
    
    // Persistir o valor imediatamente
    persistInputValue(exerciseId, field, value);
    
    // Se estamos atualizando repetições e o exercício é baseado em repetições,
    // verificar se devemos habilitar o botão
    if (field === 'actual_reps' && exerciseType === 'reps') {
      setIsButtonEnabled(!!value && parseInt(value) > 0);
    }
    
    // Verificar se esse exercício já existe no estado
    if (!exerciseHistory[exerciseId]) {
      console.warn(`Exercício ${exerciseId} não encontrado no histórico. Criando registro.`);
      setExerciseHistory(prev => ({
        ...prev,
        [exerciseId]: {
          sets_completed: 0,
          actual_reps: field === 'actual_reps' ? value : '',
          actual_weight: field === 'actual_weight' ? value : '',
          notes: field === 'notes' ? value : '',
          reps_history: []
        }
      }));
      return;
    }
    
    // Atualizar o estado
    setExerciseHistory(prev => {
      const updatedExercise = {
        ...prev[exerciseId],
        [field]: value
      };
      
      const updatedHistory = {
        ...prev,
        [exerciseId]: updatedExercise
      };
      
      // Salvar o estado completo
      if (workoutHistoryId) {
        try {
          const workoutState = {
            currentExerciseIndex,
            currentSetIndex,
            exercisesCompleted,
            workoutDuration,
            exerciseHistory: updatedHistory,
            lastUpdated: new Date().toISOString()
          };
          
          const stateJSON = JSON.stringify(workoutState);
          localStorage.setItem(`workout_state_${workoutHistoryId}`, stateJSON);
          sessionStorage.setItem(`workout_state_backup_${workoutHistoryId}`, stateJSON);
          
          console.log(`Estado salvo após atualizar exercício ${exerciseId}`);
        } catch (error) {
          console.error("Erro ao salvar estado após atualização de campo:", error);
        }
      }
      
      return updatedHistory;
    });
  };

  // Timer para exercícios baseados em tempo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (exerciseType === 'time' && isExerciseTimerRunning && !isPaused) {
      // Usar setInterval para melhor precisão e funcionamento em segundo plano
      timer = setInterval(() => {
        if (exerciseEndTime !== null) {
          const now = Date.now();
          const remaining = Math.max(0, Math.floor((exerciseEndTime - now) / 1000));
          
          setExerciseTimeLeft(remaining);
          
          // Quando chegar a zero, habilitar o botão de concluir
          if (remaining <= 0) {
            setIsExerciseTimerRunning(false);
            setIsButtonEnabled(true);
            playSound('set-complete');
            clearInterval(timer);
          }
        }
      }, 500);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [exerciseType, isExerciseTimerRunning, isPaused, exerciseEndTime]);
  
  // Atualizar o tempo de término quando pausar/despausar o exercício
  useEffect(() => {
    if (exerciseType === 'time' && isExerciseTimerRunning) {
      if (isPaused) {
        // Quando pausar, salvar o tempo restante
        console.log("Exercício pausado com", exerciseTimeLeft, "segundos restantes");
      } else if (exerciseTimeLeft > 0) {
        // Quando despausar, calcular novo tempo de término
        setExerciseEndTime(Date.now() + exerciseTimeLeft * 1000);
        console.log("Exercício retomado, novo tempo de término em", exerciseTimeLeft, "segundos");
      }
    }
  }, [isPaused, exerciseType, isExerciseTimerRunning, exerciseTimeLeft]);

  // Verificar se o input de repetições foi preenchido
  useEffect(() => {
    if (exerciseType === 'reps') {
      const repsValue = getInputValue(currentExercise?.id || '', 'actual_reps', '');
      setIsButtonEnabled(!!repsValue && parseInt(repsValue) > 0);
    }
  }, [exerciseType, currentExercise?.id, exerciseHistory]);

  // Função para resetar o timer do exercício
  const resetExerciseTimer = () => {
    if (exerciseType === 'time') {
      const timeInSeconds = parseInt(currentExercise.time || '0');
      setExerciseTimeLeft(timeInSeconds);
      setExerciseEndTime(null);
      setIsExerciseTimerRunning(false);
      setIsPaused(false);
      setIsButtonEnabled(false);
    }
  };

  if (!currentExercise) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">Nenhum exercício disponível</h3>
          <Button className="mt-4" onClick={onFinish}>
            Voltar ao treino
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <AlertDialog open={showPendingExercisesDialog} onOpenChange={setShowPendingExercisesDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Exercícios pendentes</AlertDialogTitle>
            <AlertDialogDescription>
              Os seguintes exercícios ainda não foram concluídos:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 max-h-[300px] overflow-y-auto">
            <ul className="space-y-2">
              {pendingExercisesList.map((exercise) => (
                <li key={exercise.id} className="flex justify-between items-center p-2 rounded-md hover:bg-accent">
                  <span>{exercise.exercise.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowPendingExercisesDialog(false)}>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowPendingExercisesDialog(false);
              finishWorkoutForcefully();
            }}>
              Finalizar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{workout.name}</h2>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="mr-1 h-4 w-4" />
          {formatTime(workoutDuration)}
        </div>
      </div>

      <Progress value={progress} className="h-2" />
      
      <div className="flex justify-between text-sm text-muted-foreground mb-4">
        <span>Exercício {currentExerciseIndex + 1} de {totalExercises}</span>
        <span>Série {currentSetIndex + 1} de {totalSets}</span>
      </div>

      {isResting ? (
        <Card className="bg-muted/30">
          <CardHeader className="text-center">
            <CardTitle>Tempo de Descanso</CardTitle>
            <CardDescription>
              Próxima série: {currentExercise.exercise.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="text-5xl font-bold mb-6">{formatTime(restTimeLeft)}</div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={togglePause}>
                {isPaused ? (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Continuar
                  </>
                ) : (
                  <>
                    <Pause className="mr-2 h-4 w-4" />
                    Pausar
                  </>
                )}
              </Button>
              <Button onClick={handleSkipRest}>
                <ArrowRight className="mr-2 h-4 w-4" />
                Pular Descanso
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <CardTitle className="text-xl">{currentExercise.exercise.name}</CardTitle>
                <CardDescription>
                  Série {currentSetIndex + 1} de {totalSets}
                </CardDescription>
              </div>
              <Button variant="outline" size="icon" onClick={togglePause}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="flex flex-col md:flex-row justify-between gap-6">
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">
                      {currentExercise.exercise_type === 'time' ? 'Tempo' : 'Repetições'}
                    </h4>
                    <div className="text-2xl font-bold">
                      {currentExercise.exercise_type === 'time' 
                        ? `${currentExercise.time} seg` 
                        : currentExercise.reps}
                    </div>
                  </div>
                  {currentExercise.weight && (
                    <div>
                      <h4 className="text-sm font-medium mb-1">Peso</h4>
                      <div className="text-2xl font-bold">{currentExercise.weight} kg</div>
                    </div>
                  )}
                </div>

                {/* Adicionar cronômetro para exercícios baseados em tempo */}
                {exerciseType === 'time' && (
                  <div className="mb-6 p-4 border rounded-lg">
                    <div className="flex flex-col items-center">
                      <h4 className="text-sm font-medium mb-2">Cronômetro</h4>
                      <div className="text-4xl font-bold mb-4">{formatTime(exerciseTimeLeft)}</div>
                      <div className="flex space-x-2 flex-wrap gap-2 justify-center">
                        {!isExerciseTimerRunning && exerciseTimeLeft === parseInt(exerciseTime) ? (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={startExerciseTimer}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Play className="mr-2 h-4 w-4" />
                            Iniciar
                          </Button>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={togglePause}
                              disabled={!isExerciseTimerRunning && exerciseTimeLeft === 0}
                            >
                              {isPaused ? (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Continuar
                                </>
                              ) : (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Pausar
                                </>
                              )}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={resetExerciseTimer}
                            >
                              <RefreshCcw className="mr-2 h-4 w-4" />
                              Reiniciar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {currentExercise.exercise.youtube_url && (
                  <div className="my-4">
                    <YouTubePlayer
                      url={currentExercise.exercise.youtube_url}
                      label="Ver vídeo de demonstração"
                      buttonVariant="secondary"
                      className="w-full"
                      iconOnly={false}
                    />
                  </div>
                )}
                
                {currentExercise.notes && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-1">Observações</h4>
                    <p className="text-sm text-muted-foreground">{currentExercise.notes}</p>
                  </div>
                )}
                
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-medium">Anotações para esta série</h4>
                  <div className="grid grid-cols-2 gap-4">
                    {exerciseType === 'reps' && (
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          Repetições feitas
                        </label>
                        <Input 
                          value={getInputValue(currentExercise.id, 'actual_reps', exerciseHistory[currentExercise.id]?.actual_reps || '')} 
                          onChange={(e) => {
                            const value = e.target.value;
                            console.log("Input de repetições alterado:", value);
                            handleUpdateHistory(currentExercise.id, 'actual_reps', value);
                          }}
                          onBlur={(e) => {
                            // Ao perder o foco, garantir que o valor foi salvo
                            const value = e.target.value;
                            persistInputValue(currentExercise.id, 'actual_reps', value);
                          }}
                          placeholder="Informe repetições"
                          type="number"
                          min="0"
                          className="focus:border-primary"
                        />
                      </div>
                    )}
                    <div className={`space-y-1 ${exerciseType === 'reps' ? '' : 'col-span-2'}`}>
                      <label className="text-xs text-muted-foreground">
                        Peso usado (kg)
                      </label>
                      <Input 
                        value={getInputValue(currentExercise.id, 'actual_weight', exerciseHistory[currentExercise.id]?.actual_weight || '')} 
                        onChange={(e) => {
                          const value = e.target.value;
                          console.log("Input de peso alterado:", value);
                          handleUpdateHistory(currentExercise.id, 'actual_weight', value);
                        }}
                        onBlur={(e) => {
                          // Ao perder o foco, garantir que o valor foi salvo
                          const value = e.target.value;
                          persistInputValue(currentExercise.id, 'actual_weight', value);
                        }}
                        placeholder="Informe o peso"
                        type="number"
                        step="0.1"
                        min="0"
                        className="focus:border-primary"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">
                      Observações
                    </label>
                    <Textarea 
                      value={getInputValue(currentExercise.id, 'notes', exerciseHistory[currentExercise.id]?.notes || '')} 
                      onChange={(e) => {
                        const value = e.target.value;
                        console.log("Input de notas alterado:", value);
                        handleUpdateHistory(currentExercise.id, 'notes', value);
                      }}
                      onBlur={(e) => {
                        // Ao perder o foco, garantir que o valor foi salvo
                        const value = e.target.value;
                        persistInputValue(currentExercise.id, 'notes', value);
                      }}
                      placeholder="Adicione observações se necessário..."
                      rows={2}
                      className="focus:border-primary"
                    />
                  </div>
                </div>
              </div>
              
              {currentExercise.exercise.image_url && (
                <div className="flex-shrink-0 w-full md:w-48 h-48 overflow-hidden rounded-lg bg-muted">
                  <Image
                    src={currentExercise.exercise.image_url}
                    alt={currentExercise.exercise.name}
                    width={200}
                    height={200}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 p-4 sm:p-6">
            <div className="flex gap-2 flex-wrap">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Pular Exercício
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Pular exercício?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja pular este exercício? Seu progresso nas séries já concluídas será salvo.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSkipExercise}>
                      Pular Exercício
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button 
                variant="outline" 
                onClick={() => setShowRemainingExercises(prev => !prev)}
              >
                <List className="mr-2 h-4 w-4" />
                Exercícios
              </Button>
            </div>
            
            <Button 
              onClick={handleCompleteSet} 
              className="w-full sm:w-auto mt-2 sm:mt-0"
              disabled={!isButtonEnabled && !isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {isLastSet && isLastExercise ? 'Concluir Treino' : 'Concluir Série'}
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      )}
      
      {showRemainingExercises && (
        <Card className="mt-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg">Exercícios do Treino</CardTitle>
            <CardDescription>
              Selecione um exercício para mudar a ordem
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {exercises.map((exercise, index) => {
                const isCompleted = exercisesCompleted.includes(exercise.id);
                const isCurrent = index === currentExerciseIndex;
                const exerciseType = exercise.exercise_type || 'reps';
                
                return (
                  <div 
                    key={exercise.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-md border cursor-pointer",
                      isCurrent ? "bg-accent" : "",
                      isCompleted ? "opacity-60" : ""
                    )}
                    onClick={() => handleSelectExercise(index)}
                  >
                    <div className="flex items-center gap-2">
                      {isCompleted && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {isCurrent && <ChevronRight className="h-4 w-4" />}
                      <span className={cn(
                        isCompleted ? "line-through" : "",
                        isCurrent ? "font-bold" : ""
                      )}>
                        {index + 1}. {exercise.exercise.name}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-nowrap">
                      {exercise.sets} séries x {exerciseType === 'time' 
                        ? `${exercise.time || '0'} seg` 
                        : `${exercise.reps} reps`}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}