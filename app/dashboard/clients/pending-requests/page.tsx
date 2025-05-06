"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { TrainerPendingRequests } from "@/app/components/clients/trainer-pending-requests"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"

export default function PendingRequestsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function initialize() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Verificar se o usuário é personal trainer
        if (currentUser.role !== "personal" && currentUser.role !== "admin") {
          router.push("/dashboard")
          toast({
            title: "Acesso negado",
            description: "Esta área é exclusiva para personal trainers.",
            variant: "destructive"
          })
          return
        }
        
        setUserId(currentUser.id)
      } catch (error) {
        console.error("Erro ao inicializar página:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Ocorreu um erro ao carregar a página. Tente novamente.",
          variant: "destructive"
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [router])

  const handleBack = () => {
    router.push("/dashboard/clients")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Solicitações Pendentes</h2>
      </div>
      
      <p className="text-muted-foreground">
        Visualize e gerencie todas as solicitações que você enviou aos alunos e que ainda estão pendentes de confirmação.
      </p>
      
      {userId ? (
        <TrainerPendingRequests 
          userId={userId} 
          onRequestCancelled={() => {}} 
          compact={false}
        />
      ) : isLoading ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Sem acesso</CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  )
} 