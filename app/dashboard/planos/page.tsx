"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Separator } from "@/app/components/ui/separator"
import { useToast } from "@/app/hooks/use-toast"
import { SubscriptionPlans } from "@/app/components/payment/subscription-plans"
import { SubscriptionManagement } from "@/app/components/payment/subscription-management"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { getStripeClient, createCheckoutSession, createCustomerPortalSession } from "@/app/lib/stripe"
import { Profile } from "@/app/types/database.types"
import Link from "next/link"

export default function PlansPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  const [isLoading, setIsLoading] = useState(true)
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false)
  const [isManagingSubscription, setIsManagingSubscription] = useState(false)
  const [selectedPriceId, setSelectedPriceId] = useState<string | null>(null)
  const [user, setUser] = useState<Profile | null>(null)
  
  useEffect(() => {
    async function initialize() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Buscar perfil do usuário
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", currentUser.id)
          .single()
        
        if (profileError) {
          throw profileError
        }
        
        setUser(profileData)
        
        // Verificar query params para processar pagamento concluído
        const urlParams = new URLSearchParams(window.location.search)
        const success = urlParams.get('success')
        const sessionId = urlParams.get('session_id')
        
        if (success === 'true' && sessionId) {
          toast({
            title: "Pagamento realizado com sucesso!",
            description: "Sua assinatura premium está ativa. Aproveite todos os recursos!",
          })
          
          // Remover query params da URL
          window.history.replaceState({}, document.title, "/dashboard/planos")
          
          // Atualizar local
          await fetchUpdatedProfile(currentUser.id)
        }
        
      } catch (error) {
        console.error("Erro ao inicializar página:", error)
        toast({
          title: "Erro ao carregar dados",
          description: "Não foi possível carregar as informações da sua assinatura.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    initialize()
  }, [router])
  
  async function fetchUpdatedProfile(userId: string) {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single()
      
      if (profileError) {
        throw profileError
      }
      
      setUser(profileData)
      
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
    }
  }
  
  const handleSubscription = async (priceId: string) => {
    try {
      setIsCreatingCheckout(true)
      setSelectedPriceId(priceId)
      
      if (!user) return
      
      // URL de retorno após o pagamento
      const returnUrl = `${window.location.origin}/dashboard/planos`
      
      // Verificar/criar customer ID
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId,
          returnUrl,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao criar sessão de checkout')
      }
      
      const { sessionId } = await response.json()
      
      // Redirecionar para o checkout do Stripe
      const stripe = await getStripeClient()
      if (!stripe) {
        throw new Error("Não foi possível inicializar o Stripe")
      }
      
      const { error } = await stripe.redirectToCheckout({ sessionId })
      
      if (error) {
        throw error
      }
      
    } catch (error: any) {
      console.error("Erro ao processar assinatura:", error)
      toast({
        title: "Erro ao processar assinatura",
        description: error.message || "Não foi possível iniciar o processo de pagamento.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingCheckout(false)
    }
  }
  
  const handleManageSubscription = async () => {
    try {
      setIsManagingSubscription(true)
      
      if (!user?.stripe_customer_id) {
        toast({
          title: "Erro",
          description: "Não foi possível encontrar sua assinatura.",
          variant: "destructive",
        })
        return
      }
      
      // URL de retorno após o gerenciamento
      const returnUrl = `${window.location.origin}/dashboard/planos`
      
      // Criar portal do cliente
      const response = await fetch('/api/stripe/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl,
        }),
      })
      
      if (!response.ok) {
        throw new Error('Erro ao criar portal do cliente')
      }
      
      const { url } = await response.json()
      
      // Redirecionar para o portal do cliente
      window.location.href = url
      
    } catch (error: any) {
      console.error("Erro ao gerenciar assinatura:", error)
      toast({
        title: "Erro ao gerenciar assinatura",
        description: error.message || "Não foi possível abrir o portal de gerenciamento.",
        variant: "destructive",
      })
    } finally {
      setIsManagingSubscription(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }
  
  // Verificar se o usuário tem uma assinatura ativa
  const isSubscribed = user?.subscription_status === 'active' || user?.subscription_status === 'trialing'
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Planos Premium</h2>
          <p className="text-muted-foreground">
            Desbloqueie recursos avançados e maximize seus resultados com um plano premium
          </p>
        </div>
        
        {isSubscribed && (
          <Link
            href="/dashboard/billing"
            className="flex items-center text-sm font-medium text-primary hover:underline"
          >
            Ver detalhes da assinatura
            <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-primary" />
                {isSubscribed ? "Gerenciar Assinatura" : "Escolha seu plano"}
              </CardTitle>
              <CardDescription>
                {isSubscribed 
                  ? "Sua assinatura premium está ativa. Gerencie sua assinatura ou veja os detalhes do seu plano."
                  : "Escolha o plano que melhor se adapta às suas necessidades"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isSubscribed && user ? (
                <SubscriptionManagement 
                  user={user}
                  onManageSubscription={handleManageSubscription}
                  isLoading={isManagingSubscription}
                />
              ) : (
                <SubscriptionPlans
                  user={user}
                  onSelectPlan={handleSubscription}
                  isLoading={isCreatingCheckout}
                  selectedPriceId={selectedPriceId}
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Vantagens premium</CardTitle>
              <CardDescription>
                Recursos exclusivos para assinantes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="mr-3 rounded-full bg-primary/10 p-1 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Treinos ilimitados com IA</h4>
                    <p className="text-sm text-muted-foreground">
                      Crie quantos treinos personalizados quiser usando nossa tecnologia de IA avançada
                    </p>
                  </div>
                </li>
                <Separator className="my-2" />
                <li className="flex items-start">
                  <div className="mr-3 rounded-full bg-primary/10 p-1 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Análises avançadas</h4>
                    <p className="text-sm text-muted-foreground">
                      Acesse gráficos e análises detalhadas do seu progresso para maximizar seus resultados
                    </p>
                  </div>
                </li>
                <Separator className="my-2" />
                <li className="flex items-start">
                  <div className="mr-3 rounded-full bg-primary/10 p-1 text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Suporte prioritário</h4>
                    <p className="text-sm text-muted-foreground">
                      Receba suporte rápido e prioritário para qualquer questão ou dúvida
                    </p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 