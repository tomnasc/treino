"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles, X } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import { subscriptionPlans, freeUserLimitations } from "@/app/lib/stripe"
import { useToast } from "@/app/hooks/use-toast"
import { Profile } from "@/app/types/database.types"

interface SubscriptionPlansProps {
  user: Profile | null
  onSelectPlan: (priceId: string) => void
  isLoading: boolean
  selectedPriceId: string | null
}

export function SubscriptionPlans({ 
  user, 
  onSelectPlan, 
  isLoading, 
  selectedPriceId 
}: SubscriptionPlansProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const isSubscribed = user?.subscription_status === 'active' || user?.subscription_status === 'trialing'
  const currentPlan = user?.subscription_price_id
  
  const handleSelectPlan = (priceId: string | undefined) => {
    if (!priceId) {
      toast({
        title: "Erro",
        description: "ID do plano não encontrado. Tente novamente mais tarde.",
        variant: "destructive",
      })
      return
    }
    
    onSelectPlan(priceId)
  }
  
  return (
    <div className="space-y-8">
      {/* Plano Gratuito com Limitações */}
      <Card className="border-muted bg-muted/20">
        <CardHeader>
          <CardTitle>Plano Gratuito</CardTitle>
          <CardDescription>Recursos básicos com limitações</CardDescription>
          <div className="mt-2">
            <span className="text-3xl font-bold">R$ 0</span>
          </div>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm font-medium text-destructive">Limitações do plano gratuito:</p>
          <ul className="space-y-2">
            {freeUserLimitations.map((limitation) => (
              <li key={limitation} className="flex items-start">
                <X className="h-5 w-5 text-destructive mr-2 mt-0.5 flex-shrink-0" />
                <span>{limitation}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 p-3 border rounded-md bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <span className="font-medium">Importante:</span> Se você cancelar sua assinatura premium, perderá acesso aos serviços de personal trainer imediatamente.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full" 
            variant="outline"
            disabled={true}
          >
            Seu plano atual
          </Button>
        </CardFooter>
      </Card>

      {/* Planos Premium */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {subscriptionPlans.map((plan) => {
          const isCurrent = currentPlan === plan.stripePriceId
          const isSelected = selectedPriceId === plan.stripePriceId
          
          return (
            <Card 
              key={plan.id}
              className={`relative overflow-hidden ${isCurrent ? 'border-primary' : ''}`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1 text-xs font-medium">
                  Plano atual
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-primary" />
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground ml-1">
                    /{plan.interval === 'month' ? 'mês' : 'ano'}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => handleSelectPlan(plan.stripePriceId)}
                  disabled={isCurrent || isLoading || isSelected}
                  variant={isCurrent ? "outline" : "default"}
                >
                  {isLoading && isSelected ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-current"></div>
                      Processando
                    </>
                  ) : isCurrent ? (
                    "Seu plano atual"
                  ) : (
                    `Assinar ${plan.interval === 'month' ? 'mensal' : 'anual'}`
                  )}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
} 