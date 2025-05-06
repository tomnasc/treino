"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Sparkles } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import { subscriptionPlans } from "@/app/lib/stripe"
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
  )
} 