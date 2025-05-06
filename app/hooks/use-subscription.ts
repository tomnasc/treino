import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentUser } from '@/app/lib/auth'
import { supabase } from '@/app/lib/supabase'
import { Profile } from '@/app/types/database.types'
import { useToast } from './use-toast'

export interface SubscriptionStatus {
  isLoading: boolean
  isPremium: boolean
  user: Profile | null
  checkSubscription: () => Promise<boolean>
}

export function useSubscription(redirectOnFailure = false): SubscriptionStatus {
  const [isLoading, setIsLoading] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [user, setUser] = useState<Profile | null>(null)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async (): Promise<boolean> => {
    try {
      setIsLoading(true)

      const currentUser = await getCurrentUser()
      if (!currentUser) {
        if (redirectOnFailure) {
          router.push('/login')
        }
        return false
      }

      // Buscar perfil do usuário
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single()

      if (profileError) {
        throw profileError
      }

      setUser(profileData)

      // Verificar status da assinatura
      const hasActiveSubscription = 
        profileData?.role === 'premium' && 
        (profileData?.subscription_status === 'active' || 
         profileData?.subscription_status === 'trialing')

      setIsPremium(hasActiveSubscription)

      if (!hasActiveSubscription && redirectOnFailure) {
        toast({
          title: "Acesso restrito",
          description: "Este recurso está disponível apenas para assinantes premium.",
          variant: "destructive",
        })
        router.push('/dashboard/planos')
        return false
      }

      return hasActiveSubscription
    } catch (error) {
      console.error('Erro ao verificar assinatura:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  return {
    isLoading,
    isPremium,
    user,
    checkSubscription
  }
} 