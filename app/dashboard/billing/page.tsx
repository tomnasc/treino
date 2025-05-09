"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, CreditCard, Loader2, Plus, Sparkles, ArrowRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser, UserSession } from "@/app/lib/auth"
import { Badge } from "@/app/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"

export default function BillingPage() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPayment, setProcessingPayment] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Obter dados do usuário
  useEffect(() => {
    async function fetchUserData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        setUser(currentUser)
        setLoading(false)
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error)
        toast({
          title: "Erro ao carregar informações de assinatura",
          description: "Não foi possível carregar as informações da sua assinatura. Tente novamente.",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router])

  // Função para lidar com upgrade de plano
  const handleUpgradePlan = async (planId: string) => {
    setProcessingPayment(true)
    
    try {
      // Mapear os IDs internos para os IDs do Stripe
      const priceId = planId === "premium_monthly" 
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_MENSAL 
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_ANUAL;
      
      // Aqui você integraria com o Stripe ou outro gateway de pagamento
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          priceId,
          returnUrl: `${window.location.origin}/dashboard/billing`,
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao processar pagamento")
      }
      
      // Redirecionar para a página de checkout do Stripe
      window.location.href = data.url
    } catch (error) {
      console.error("Erro ao processar upgrade:", error)
      toast({
        title: "Erro ao processar pagamento",
        description: "Não foi possível iniciar o processo de pagamento. Tente novamente.",
        variant: "destructive",
      })
      setProcessingPayment(false)
    }
  }

  // Função para lidar com gerenciamento de assinatura
  const handleManageSubscription = async () => {
    setProcessingPayment(true)
    
    try {
      const response = await fetch("/api/stripe/customer-portal", {
        method: "POST",
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.message || "Erro ao acessar portal do cliente")
      }
      
      // Redirecionar para o portal do cliente do Stripe
      window.location.href = data.url
    } catch (error) {
      console.error("Erro ao acessar portal do cliente:", error)
      toast({
        title: "Erro ao acessar portal",
        description: "Não foi possível acessar o portal de gerenciamento da assinatura. Tente novamente.",
        variant: "destructive",
      })
      setProcessingPayment(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isPremium = user?.role === "premium"

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assinatura</h1>
          <p className="text-muted-foreground">
            Gerencie sua assinatura e acesse recursos premium do Treino na Mão.
          </p>
        </div>
        
        <Link
          href="/dashboard/planos"
          className="flex items-center text-sm font-medium text-primary hover:underline"
        >
          Ver todos os planos disponíveis
          <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </div>

      {/* Status da Assinatura */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            Status da Assinatura
            {isPremium && (
              <Badge className="ml-2 bg-primary/20 text-primary" variant="outline">
                Premium
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Informações sobre sua assinatura atual.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-1">
              <div className="font-medium">Plano atual</div>
              <div className="text-muted-foreground">
                {isPremium ? "Plano Premium" : "Plano Gratuito"}
              </div>
            </div>
            
            {isPremium && (
              <>
                <div className="grid gap-1">
                  <div className="font-medium">Status</div>
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle2 className="mr-1 h-4 w-4 text-green-500" />
                    Ativo
                  </div>
                </div>
                
                <div className="grid gap-1">
                  <div className="font-medium">Próxima cobrança</div>
                  <div className="text-muted-foreground">
                    15 de Junho de 2024
                  </div>
                </div>
                
                <div className="grid gap-1">
                  <div className="font-medium">Método de pagamento</div>
                  <div className="flex items-center text-muted-foreground">
                    <CreditCard className="mr-2 h-4 w-4" />
                    •••• •••• •••• 4242
                  </div>
                </div>
              </>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          {isPremium ? (
            <Button 
              variant="outline" 
              onClick={handleManageSubscription}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Gerenciar assinatura
            </Button>
          ) : (
            <Button 
              onClick={() => handleUpgradePlan("premium_monthly")}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Fazer upgrade para Premium
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Planos Disponíveis */}
      {!isPremium && (
        <Tabs defaultValue="monthly" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="monthly">Mensal</TabsTrigger>
            <TabsTrigger value="yearly">Anual (20% de desconto)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="monthly" className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Plano Gratuito</CardTitle>
                  <CardDescription>Para usuários casuais</CardDescription>
                  <div className="mt-2 text-3xl font-bold">R$ 0</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Até 3 treinos</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Funcionalidades básicas</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Suporte via email</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled>
                    Plano Atual
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <Badge className="mb-2 w-fit bg-primary/20 text-primary" variant="outline">
                    Popular
                  </Badge>
                  <CardTitle>Plano Premium</CardTitle>
                  <CardDescription>Para atletas dedicados</CardDescription>
                  <div className="mt-2 text-3xl font-bold">R$ 6,97<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Geração ilimitada de treinos com IA</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Treinos personalizados exclusivos</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Análises avançadas de progresso</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Suporte prioritário</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Acesso aos serviços de personal trainer</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Sem limite de treinos cadastrados</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgradePlan("premium_monthly")}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Assinar agora"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="yearly" className="mt-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Plano Gratuito</CardTitle>
                  <CardDescription>Para usuários casuais</CardDescription>
                  <div className="mt-2 text-3xl font-bold">R$ 0</div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Até 3 treinos</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Funcionalidades básicas</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Suporte via email</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" className="w-full" disabled>
                    Plano Atual
                  </Button>
                </CardFooter>
              </Card>
              
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <Badge className="mb-2 w-fit bg-primary/20 text-primary" variant="outline">
                    Melhor valor
                  </Badge>
                  <CardTitle>Plano Premium Anual</CardTitle>
                  <CardDescription>Economize com o plano anual</CardDescription>
                  <div className="mt-2 text-3xl font-bold">R$ 66,90<span className="text-sm font-normal text-muted-foreground">/ano</span></div>
                  <p className="text-sm text-muted-foreground mt-1">Apenas R$ 5,58 por mês</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Geração ilimitada de treinos com IA</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Treinos personalizados exclusivos</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Análises avançadas de progresso</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Suporte prioritário</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Acesso aos serviços de personal trainer</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Sem limite de treinos cadastrados</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      <span>Economia significativa em relação ao plano mensal</span>
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgradePlan("premium_yearly")}
                    disabled={processingPayment}
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Assinar anual com desconto"
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
      
      {!isPremium && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 mt-6">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <span className="font-medium">Importante:</span> Se você cancelar sua assinatura premium, perderá acesso aos serviços de personal trainer imediatamente, mas poderá continuar usando os treinos já criados.
          </p>
        </div>
      )}

      {/* Benefícios Premium */}
      <Card>
        <CardHeader>
          <CardTitle>Benefícios Premium</CardTitle>
          <CardDescription>
            Conheça todos os recursos exclusivos do plano premium.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <Sparkles className="h-8 w-8 text-primary" />
              <h3 className="text-center font-medium">Treinos Ilimitados</h3>
              <p className="text-center text-sm text-muted-foreground">
                Crie e salve quantos treinos desejar sem limites.
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <h3 className="text-center font-medium">Exercícios Exclusivos</h3>
              <p className="text-center text-sm text-muted-foreground">
                Acesso a uma biblioteca expandida de exercícios avançados.
              </p>
            </div>
            
            <div className="flex flex-col items-center space-y-2 rounded-lg border p-4">
              <CreditCard className="h-8 w-8 text-primary" />
              <h3 className="text-center font-medium">Sem Anúncios</h3>
              <p className="text-center text-sm text-muted-foreground">
                Experiência limpa e sem interrupções durante seus treinos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 