"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, BarChart3, TrendingUp, ShieldAlert } from "lucide-react"

import { getCurrentUser } from "@/app/lib/auth"
import { useToast } from "@/app/hooks/use-toast"
import { PerformanceAnalysis } from "@/app/components/history/performance-analysis"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"

export default function PerformancePage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPremiumUser, setIsPremiumUser] = useState(false)
  
  useEffect(() => {
    async function fetchUserData() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Verificar se o usuário tem acesso a essa funcionalidade
        const hasAccess = ["premium", "personal", "admin"].includes(currentUser.role)
        setIsPremiumUser(hasAccess)
        
        setUserId(currentUser.id)
        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar seus dados de desempenho.",
          variant: "destructive",
        })
        setIsLoading(false)
        router.push("/dashboard")
      }
    }
    
    fetchUserData()
  }, [router, toast])
  
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  
  if (!isPremiumUser) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Análise de Desempenho</h2>
          <p className="text-muted-foreground">
            Dados personalizados sobre seu progresso e recomendações para melhorar seus resultados.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Recurso Premium</CardTitle>
            <CardDescription>
              A análise de desempenho completa está disponível apenas para assinantes premium.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-4 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="mb-4">
                Faça um upgrade para o plano premium para desbloquear:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Análise detalhada do seu progresso</li>
                <li>• Recomendações personalizadas</li>
                <li>• Identificação de desequilíbrios musculares</li>
                <li>• Acompanhamento de evolução de carga</li>
                <li>• Timeline de conquistas</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => router.push("/dashboard/planos")}>
              Ver planos premium
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Análise de Desempenho</h2>
        <p className="text-muted-foreground">
          Dados personalizados sobre seu progresso e recomendações para melhorar seus resultados.
        </p>
      </div>
      
      {userId ? (
        <PerformanceAnalysis userId={userId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar dados</CardTitle>
            <CardDescription>
              Não foi possível carregar seus dados de desempenho.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-4">
              Ocorreu um erro ao tentar acessar seus dados. Por favor, tente novamente mais tarde.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => window.location.reload()} variant="outline">
              Tentar novamente
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  )
} 