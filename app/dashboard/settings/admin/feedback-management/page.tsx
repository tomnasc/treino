"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getCurrentUser } from "@/app/lib/auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Loader2, LayoutDashboard, MessageSquareText, Dumbbell } from "lucide-react"
import { FeedbackManager } from "@/app/components/admin/feedback-manager"
import { TrainerRequestManager } from "@/app/components/admin/trainer-request-manager"

export default function FeedbackManagementPage() {
  const [adminId, setAdminId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser()
        if (user && user.role === "admin") {
          setAdminId(user.id)
        } else {
          // Redirecionar se não for admin
          router.push("/dashboard")
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

  if (!adminId) {
    return null // Será redirecionado pelo useEffect
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquareText className="h-7 w-7" />
          <span>Gerenciamento de Feedback</span>
        </h1>
        
        <a 
          href="/dashboard" 
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-300 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          <span>Voltar para o Dashboard</span>
        </a>
      </div>
      
      <Tabs defaultValue="feedbacks">
        <TabsList className="mb-6">
          <TabsTrigger value="feedbacks" className="gap-1.5">
            <MessageSquareText className="h-4 w-4" />
            <span>Feedbacks</span>
          </TabsTrigger>
          <TabsTrigger value="trainer-requests" className="gap-1.5">
            <Dumbbell className="h-4 w-4" />
            <span>Solicitações de Personal</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="feedbacks">
          <FeedbackManager adminId={adminId} />
        </TabsContent>
        
        <TabsContent value="trainer-requests">
          <TrainerRequestManager adminId={adminId} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 