export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      ai_settings: {
        Row: {
          available_equipment: string | null
          created_at: string | null
          experience_level: string | null
          frequency: number | null
          goal_id: string | null
          health_conditions: string | null
          id: string
          preferences: string | null
          session_duration: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_equipment?: string | null
          created_at?: string | null
          experience_level?: string | null
          frequency?: number | null
          goal_id?: string | null
          health_conditions?: string | null
          id?: string
          preferences?: string | null
          session_duration?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_equipment?: string | null
          created_at?: string | null
          experience_level?: string | null
          frequency?: number | null
          goal_id?: string | null
          health_conditions?: string | null
          id?: string
          preferences?: string | null
          session_duration?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: {
          goal: {
            foreignKeyName: "ai_settings_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "training_goals"
            referencedColumns: ["id"]
          }
          user: {
            foreignKeyName: "ai_settings_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        }
      }
      client_relationships: {
        Row: {
          client_id: string
          created_at: string | null
          id: string
          personal_id: string
          status: string
        }
        Insert: {
          client_id: string
          created_at?: string | null
          id?: string
          personal_id: string
          status?: string
        }
        Update: {
          client_id?: string
          created_at?: string | null
          id?: string
          personal_id?: string
          status?: string
        }
        Relationships: {
          client: {
            foreignKeyName: "client_relationships_client_id_fkey"
            columns: ["client_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          personal: {
            foreignKeyName: "client_relationships_personal_id_fkey"
            columns: ["personal_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        }
      }
      exercises: {
        Row: {
          id: string
          name: string
          description: string | null
          muscle_group_id: string | null
          image_url: string | null
          youtube_url: string | null
          created_by: string | null
          is_public: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          muscle_group_id?: string | null
          image_url?: string | null
          youtube_url?: string | null
          created_by?: string | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          muscle_group_id?: string | null
          image_url?: string | null
          youtube_url?: string | null
          created_by?: string | null
          is_public?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: {
          muscle_group: {
            foreignKeyName: "exercises_muscle_group_id_fkey"
            columns: ["muscle_group_id"]
            referencedRelation: "muscle_groups"
            referencedColumns: ["id"]
          }
          creator: {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        }
      }
      muscle_groups: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string | null
        }
        Relationships: {}
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          personal_id: string | null
          role: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_price_id: string | null
          subscription_status: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          personal_id?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          personal_id?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_price_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
        }
        Relationships: {
          personal: {
            foreignKeyName: "profiles_personal_id_fkey"
            columns: ["personal_id"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        }
      }
      training_goals: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string | null
        }
        Relationships: {}
      }
      workout_exercises: {
        Row: {
          id: string
          workout_id: string
          exercise_id: string
          sets: number
          reps: string
          rest_time: number | null
          weight: string | null
          notes: string | null
          order_position: number
          created_at: string | null
          exercise_type: "reps" | "time"
          time: string | null
        }
        Insert: {
          id?: string
          workout_id: string
          exercise_id: string
          sets: number
          reps: string
          rest_time?: number | null
          weight?: string | null
          notes?: string | null
          order_position: number
          created_at?: string | null
          exercise_type?: "reps" | "time"
          time?: string | null
        }
        Update: {
          id?: string
          workout_id?: string
          exercise_id?: string
          sets?: number
          reps?: string
          rest_time?: number | null
          weight?: string | null
          notes?: string | null
          order_position?: number
          created_at?: string | null
          exercise_type?: "reps" | "time"
          time?: string | null
        }
        Relationships: {
          exercise: {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          }
          workout: {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          }
        }
      }
      workouts: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          goal_id: string | null
          id: string
          is_ai_generated: boolean | null
          is_public: boolean | null
          name: string
          updated_at: string | null
          is_featured: boolean | null
          sequence_order: number | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          goal_id?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          is_featured?: boolean | null
          sequence_order?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          goal_id?: string | null
          id?: string
          is_ai_generated?: boolean | null
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          is_featured?: boolean | null
          sequence_order?: number | null
        }
        Relationships: {
          creator: {
            foreignKeyName: "workouts_created_by_fkey"
            columns: ["created_by"]
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
          goal: {
            foreignKeyName: "workouts_goal_id_fkey"
            columns: ["goal_id"]
            referencedRelation: "training_goals"
            referencedColumns: ["id"]
          }
        }
      }
    }
    Enums: {
      user_role: "free" | "premium" | "personal" | "admin"
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type UserRole = Database['public']['Enums']['user_role']
export type Workout = Database['public']['Tables']['workouts']['Row']
export type Exercise = Database['public']['Tables']['exercises']['Row'] & {
  exercise_type?: "reps" | "time"
}
export type MuscleGroup = Database['public']['Tables']['muscle_groups']['Row']
export type TrainingGoal = Database['public']['Tables']['training_goals']['Row']
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row']
export type AISettings = Database['public']['Tables']['ai_settings']['Row']
