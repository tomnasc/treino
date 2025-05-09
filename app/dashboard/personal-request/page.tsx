"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/app/lib/auth"
import { TrainerRequestForm } from "@/app/components/trainer/trainer-request-form"
import { Loader2, Dumbbell } from "lucide-react"

export default function PersonalRequestPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser()
        if (user) {
          setUserId(user.id)
          
          // Se já for personal trainer, redirecionar
          if (user.role === "personal" || user.role === "admin") {
            router.push("/dashboard")
          }
        } else {
          // Redirecionar para login se não estiver autenticado
          router.push("/login")
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!userId) {
    return null // Será redirecionado pelo useEffect
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <Dumbbell className="h-7 w-7" />
        <span>Torne-se um Personal Trainer</span>
      </h1>
      
      <div className="grid gap-6">
        <div className="p-6 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-100 dark:border-blue-900">
          <h2 className="text-xl font-semibold text-blue-800 dark:text-blue-300 mb-3">
            Benefícios de ser um Personal Trainer na plataforma
          </h2>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 text-lg leading-none mt-0.5">•</span>
              <span className="text-blue-700 dark:text-blue-300">Gerencie seus clientes em um único lugar</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 text-lg leading-none mt-0.5">•</span>
              <span className="text-blue-700 dark:text-blue-300">Crie treinos personalizados para cada cliente</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 text-lg leading-none mt-0.5">•</span>
              <span className="text-blue-700 dark:text-blue-300">Acompanhe o progresso e evolução dos seus clientes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 dark:text-blue-400 text-lg leading-none mt-0.5">•</span>
              <span className="text-blue-700 dark:text-blue-300">Expanda sua base de clientes com a visibilidade na plataforma</span>
            </li>
          </ul>
        </div>

        <TrainerRequestForm userId={userId} />
      </div>
    </div>
  )
} 