import { Profile } from "./database.types"

// Estendendo o tipo Profile para incluir informações específicas de clientes
export interface ClientProfile extends Profile {
  last_workout_date?: string | null
  total_workouts?: number
  completed_workouts?: number
  current_streak?: number
  longest_streak?: number
  relationship_status?: 'active' | 'inactive' | 'pending'
}

// Interface para gestão da relação personal/cliente
export interface ClientRelationship {
  id: string
  personal_id: string
  client_id: string
  created_at: string
  status: 'active' | 'inactive' | 'pending'
  client?: ClientProfile
  personal?: Profile
}

// Interface para criar um novo treino personalizado
export interface ClientWorkoutCreation {
  client_id: string
  name: string
  description?: string
  exercises: {
    exercise_id: string
    sets: number
    reps: string
    rest_time?: number
    weight?: string
    notes?: string
    order_position: number
  }[]
} 