"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldAlert, Target } from "lucide-react"

import { getCurrentUser } from "@/app/lib/auth"
import { useToast } from "@/app/hooks/use-toast"
import AdvancedRecommendationsPanel from "@/app/components/recommendations/AdvancedRecommendationsPanel"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Alert, AlertDescription } from "@/app/components/ui/alert"

export default function RecommendationsPage() {
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
          description: "Não foi possível carregar seus dados.",
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
          <h2 className="text-3xl font-bold tracking-tight">Recomendações Personalizadas</h2>
          <p className="text-muted-foreground">
            Sugestões inteligentes de exercícios baseadas no seu perfil e desempenho.
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Recurso Premium</CardTitle>
            <CardDescription>
              As recomendações personalizadas estão disponíveis apenas para assinantes premium.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="py-4 text-center">
              <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="mb-4">
                Faça um upgrade para o plano premium para desbloquear:
              </p>
              <ul className="text-sm text-muted-foreground space-y-2 mb-6">
                <li>• Análise inteligente do seu histórico de treinos</li>
                <li>• Recomendações baseadas em equilíbrio muscular</li>
                <li>• Sugestões alinhadas com seus objetivos</li>
                <li>• Prevenção de lesões e desequilíbrios</li>
                <li>• Ações específicas para cada treino</li>
                <li>• Otimização contínua baseada no seu progresso</li>
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
        <h2 className="text-3xl font-bold tracking-tight">Recomendações Personalizadas</h2>
        <p className="text-muted-foreground">
          Análise inteligente dos seus treinos com sugestões específicas de melhorias.
        </p>
      </div>

      <Alert>
        <Target className="h-4 w-4" />
        <AlertDescription>
          Sistema avançado de análise que fornece métricas detalhadas, detecta desequilíbrios musculares, 
          oferece substituições inteligentes e cria planos semanais otimizados.
        </AlertDescription>
      </Alert>

      <div className="space-y-1">
        <h3 className="text-lg font-medium">Análise Avançada dos Seus Treinos</h3>
        <p className="text-sm text-muted-foreground">
          Painel completo com métricas, desequilíbrios, substituições inteligentes, planejamento semanal e acompanhamento de progresso
        </p>
      </div>
      
      {userId ? (
        <AdvancedRecommendationsPanel userId={userId} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar recomendações</CardTitle>
            <CardDescription>
              Não foi possível carregar suas recomendações personalizadas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-4">
              Ocorreu um erro ao tentar acessar suas recomendações. Por favor, tente novamente mais tarde.
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