"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Activity, Dumbbell, Calendar, Award } from "lucide-react"

import { getCurrentUser, UserSession } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { Workout } from "@/app/types/database.types"

export default function DashboardPage() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([])
  const [upcomingWorkout, setUpcomingWorkout] = useState<Workout | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) return
        setUser(currentUser)

        // Carregar treinos recentes
        const { data: workoutsData, error: workoutsError } = await supabase
          .from("workouts")
          .select("*")
          .eq("created_by", currentUser.id)
          .order("created_at", { ascending: false })
          .limit(3)

        if (workoutsError) {
          console.error("Erro ao carregar treinos:", workoutsError)
        } else {
          setRecentWorkouts(workoutsData)
          // Vamos usar o primeiro treino como "próximo treino" por enquanto
          if (workoutsData.length > 0) {
            setUpcomingWorkout(workoutsData[0])
          }
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          {loading ? "Carregando..." : `Olá, ${user?.fullName || "treino na mão"}!`}
        </h2>
        <p className="text-muted-foreground">
          Bem-vindo ao seu dashboard. Aqui você pode gerenciar seus treinos e acompanhar seu progresso.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/workouts"
          className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-3 space-y-2">
            <h3 className="font-medium">Meus Treinos</h3>
            <p className="text-sm text-muted-foreground">
              Gerencie seus treinos e crie novos
            </p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>

        <Link
          href="/dashboard/train"
          className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
            <Activity className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-3 space-y-2">
            <h3 className="font-medium">Treinar Agora</h3>
            <p className="text-sm text-muted-foreground">
              Inicie uma sessão de treino
            </p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>

        <Link
          href="/dashboard/progress"
          className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-3 space-y-2">
            <h3 className="font-medium">Meu Progresso</h3>
            <p className="text-sm text-muted-foreground">
              Veja seu histórico e estatísticas
            </p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>

        <Link
          href="/dashboard/achievements"
          className="group relative overflow-hidden rounded-lg border p-6 hover:border-primary"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div className="mt-3 space-y-2">
            <h3 className="font-medium">Conquistas</h3>
            <p className="text-sm text-muted-foreground">
              Veja suas conquistas e medalhas
            </p>
          </div>
          <ArrowRight className="absolute bottom-4 right-4 h-5 w-5 text-primary opacity-0 transition-opacity group-hover:opacity-100" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Treinos Recentes</h3>
            <Link
              href="/dashboard/workouts"
              className="text-sm text-primary hover:underline"
            >
              Ver todos
            </Link>
          </div>
          
          {loading ? (
            <div className="flex h-[200px] items-center justify-center rounded-lg border">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : recentWorkouts.length > 0 ? (
            <ul className="space-y-2">
              {recentWorkouts.map((workout) => (
                <li key={workout.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{workout.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {workout.description || "Sem descrição"}
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/workouts/${workout.id}`}
                      className="rounded-full p-2 hover:bg-muted"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span className="sr-only">Ver treino</span>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">
                Você ainda não tem treinos
              </p>
              <Link
                href="/dashboard/workouts/new"
                className="mt-4 text-sm text-primary hover:underline"
              >
                Criar um treino
              </Link>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Próximo Treino</h3>
          
          {loading ? (
            <div className="flex h-[200px] items-center justify-center rounded-lg border">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : upcomingWorkout ? (
            <div className="rounded-lg border p-6">
              <h4 className="text-lg font-medium">{upcomingWorkout.name}</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                {upcomingWorkout.description || "Sem descrição"}
              </p>
              
              <div className="mt-6">
                <Link
                  href={`/dashboard/train?workout=${upcomingWorkout.id}`}
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
                >
                  Iniciar Treino
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] flex-col items-center justify-center rounded-lg border p-8 text-center">
              <p className="text-muted-foreground">
                Nenhum treino planejado
              </p>
              <Link
                href="/dashboard/workouts"
                className="mt-4 text-sm text-primary hover:underline"
              >
                Escolher um treino
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 