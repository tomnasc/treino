"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Calendar, Heart, X, User } from "lucide-react"
import { Alert, AlertDescription } from "@/app/components/ui/alert"
import { Button } from "@/app/components/ui/button"
import { supabase } from "@/app/lib/supabase"
import { getCurrentUser } from "@/app/lib/auth"

interface PhysicalProfileReminderProps {
  userId?: string
}

export function PhysicalProfileReminder({ userId }: PhysicalProfileReminderProps) {
  const [shouldShowReminder, setShouldShowReminder] = useState(false)
  const [lastUpdateDate, setLastUpdateDate] = useState<string | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasPersonalTrainer, setHasPersonalTrainer] = useState(false)

  useEffect(() => {
    checkPhysicalProfileStatus()
  }, [userId])

  async function checkPhysicalProfileStatus() {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) return

      // Verificar se o usuário já dispensou o lembrete hoje
      const dismissedKey = `physical-reminder-dismissed-${currentUser.id}`
      const dismissedDate = localStorage.getItem(dismissedKey)
      const today = new Date().toDateString()
      
      if (dismissedDate === today) {
        setIsDismissed(true)
        setLoading(false)
        return
      }

      // Usar função SQL otimizada para obter todas as informações
      const { data: reminderInfo, error } = await supabase
        .rpc('get_physical_reminder_info', { p_user_id: currentUser.id })

      if (error) {
        console.error("Erro ao verificar perfil físico:", error)
        setLoading(false)
        return
      }

      if (reminderInfo && reminderInfo.length > 0) {
        const info = reminderInfo[0]
        setShouldShowReminder(info.should_show)
        setHasPersonalTrainer(info.has_personal_trainer)
        
        if (info.last_update_date) {
          const lastUpdate = new Date(info.last_update_date)
          setLastUpdateDate(lastUpdate.toLocaleDateString("pt-BR"))
        } else {
          setLastUpdateDate(null)
        }
      }
    } catch (error) {
      console.error("Erro ao verificar status do perfil físico:", error)
    } finally {
      setLoading(false)
    }
  }

  function dismissReminder() {
    const currentUser = getCurrentUser()
    if (!currentUser) return

    // Marcar como dispensado por hoje
    const dismissedKey = `physical-reminder-dismissed-${userId || 'unknown'}`
    const today = new Date().toDateString()
    localStorage.setItem(dismissedKey, today)
    
    setIsDismissed(true)
  }

  if (loading || isDismissed || !shouldShowReminder) {
    return null
  }

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <Heart className="h-5 w-5 text-orange-600 mt-0.5" />
          <div className="space-y-2">
            <div className="font-medium text-orange-800 dark:text-orange-200">
              {!lastUpdateDate ? "Complete seu perfil físico!" : "Hora de atualizar seus dados físicos!"}
            </div>
            <AlertDescription className="text-orange-700 dark:text-orange-300">
              {!lastUpdateDate ? (
                <>
                  Para uma experiência personalizada e treinos mais eficazes, complete seu perfil físico com dados como altura, peso, medidas corporais e objetivos.
                  {hasPersonalTrainer && (
                    <span className="block mt-1">
                      Seu personal trainer também poderá acompanhar sua evolução com esses dados!
                    </span>
                  )}
                </>
              ) : (
                <>
                  Seus dados físicos foram atualizados pela última vez em {lastUpdateDate}. 
                  Atualize mensalmente para acompanhar sua evolução!
                  {hasPersonalTrainer && (
                    <span className="block mt-1">
                      Mantenha seu personal trainer informado sobre suas mudanças físicas.
                    </span>
                  )}
                </>
              )}
              <br />
              <span className="inline-flex items-center mt-2 text-sm">
                <User className="h-4 w-4 mr-1" />
                <strong>Dica:</strong> {hasPersonalTrainer 
                  ? "Trabalhe junto com seu personal trainer e considere também agendar uma consulta com um nutricionista para um acompanhamento completo."
                  : "Considere agendar uma consulta com um nutricionista para obter dados mais precisos e um acompanhamento profissional."
                }
              </span>
            </AlertDescription>
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              <Button asChild size="sm" className="bg-orange-600 hover:bg-orange-700">
                <Link href="/dashboard/profile">
                  <Calendar className="h-4 w-4 mr-2" />
                  {!lastUpdateDate ? "Preencher agora" : "Atualizar dados"}
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={dismissReminder}
                className="border-orange-300 text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900"
              >
                Lembrar depois
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={dismissReminder}
          className="h-8 w-8 p-0 text-orange-600 hover:bg-orange-100 dark:text-orange-400 dark:hover:bg-orange-900"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Fechar</span>
        </Button>
      </div>
    </Alert>
  )
} 