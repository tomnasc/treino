"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CreditCard, ExternalLink, Info, Settings } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card"
import { Progress } from "@/app/components/ui/progress"
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip"
import { useToast } from "@/app/hooks/use-toast"
import { Profile } from "@/app/types/database.types"
import { subscriptionPlans } from "@/app/lib/stripe"

interface SubscriptionManagementProps {
  user: Profile
  onManageSubscription: () => void
  isLoading: boolean
}

export function SubscriptionManagement({ 
  user, 
  onManageSubscription,
  isLoading
}: SubscriptionManagementProps) {
  const { toast } = useToast()
  
  // Encontrar o plano atual
  const currentPlan = subscriptionPlans.find(plan => 
    plan.stripePriceId === user.subscription_price_id
  )
  
  const isActive = user.subscription_status === 'active' || user.subscription_status === 'trialing'
  const statusText = getStatusText(user.subscription_status)
  const statusColor = getStatusColor(user.subscription_status)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-primary" />
          Sua assinatura
        </CardTitle>
        <CardDescription>
          Gerencie detalhes do seu plano premium
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Status</span>
            <div className="flex items-center">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                {statusText}
              </span>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 ml-1 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-[200px] text-xs">
                      {getStatusDescription(user.subscription_status)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Plano</span>
            <span className="font-medium">{currentPlan?.name || "Plano Premium"}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Preço</span>
            <span className="font-medium">{currentPlan?.price || "—"}</span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Período</span>
            <span className="font-medium">
              {currentPlan?.interval === 'month' ? 'Mensal' : currentPlan?.interval === 'year' ? 'Anual' : '—'}
            </span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <Button 
          className="w-full" 
          variant="outline"
          onClick={onManageSubscription}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-current"></div>
              Processando
            </>
          ) : (
            <>
              <Settings className="h-4 w-4 mr-2" />
              Gerenciar assinatura
            </>
          )}
        </Button>
        
        <div className="text-xs text-muted-foreground text-center">
          Você será redirecionado para o portal do Stripe para gerenciar pagamentos, 
          cancelar ou atualizar sua assinatura.
        </div>
      </CardFooter>
    </Card>
  )
}

// Função auxiliar para obter o texto do status
function getStatusText(status: string | null): string {
  switch (status) {
    case 'active':
      return 'Ativa'
    case 'trialing':
      return 'Em período de teste'
    case 'canceled':
      return 'Cancelada'
    case 'incomplete':
      return 'Incompleta'
    case 'incomplete_expired':
      return 'Expirada'
    case 'past_due':
      return 'Pagamento atrasado'
    case 'unpaid':
      return 'Não paga'
    default:
      return 'Desconhecido'
  }
}

// Função auxiliar para obter a cor do status
function getStatusColor(status: string | null): string {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'bg-green-100 text-green-800'
    case 'canceled':
    case 'incomplete_expired':
    case 'unpaid':
      return 'bg-red-100 text-red-800'
    case 'incomplete':
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Função auxiliar para obter a descrição do status
function getStatusDescription(status: string | null): string {
  switch (status) {
    case 'active':
      return 'Sua assinatura está ativa e os pagamentos estão em dia.'
    case 'trialing':
      return 'Você está em um período de teste. O pagamento será cobrado quando o teste terminar.'
    case 'canceled':
      return 'Sua assinatura foi cancelada. Você ainda terá acesso até o final do período atual.'
    case 'incomplete':
      return 'O pagamento inicial para sua assinatura falhou. Por favor, atualize seu método de pagamento.'
    case 'incomplete_expired':
      return 'A assinatura expirou porque o pagamento inicial falhou.'
    case 'past_due':
      return 'O pagamento mais recente para sua assinatura falhou. Por favor, atualize seu método de pagamento.'
    case 'unpaid':
      return 'A assinatura está suspensa devido a pagamentos não realizados.'
    default:
      return 'Status desconhecido. Entre em contato com o suporte para mais informações.'
  }
} 