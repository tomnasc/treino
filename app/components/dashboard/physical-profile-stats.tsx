"use client"

import { useState, useEffect } from "react"
import { Calendar, TrendingUp, User } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { supabase } from "@/app/lib/supabase"

interface PhysicalProfileStatsProps {
  userId: string
}

export function PhysicalProfileStats({ userId }: PhysicalProfileStatsProps) {
  const [stats, setStats] = useState<{
    lastUpdate: string | null
    daysSince: number | null
    totalUpdates: number
    hasData: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [userId])

  async function loadStats() {
    try {
      // Buscar informações do perfil físico
      const { data: physicalProfile } = await supabase
        .from("physical_profiles")
        .select("updated_at, created_at")
        .eq("user_id", userId)
        .maybeSingle()

      if (physicalProfile) {
        const lastUpdate = new Date(physicalProfile.updated_at)
        const daysSince = Math.floor((new Date().getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24))
        
        setStats({
          lastUpdate: lastUpdate.toLocaleDateString("pt-BR"),
          daysSince,
          totalUpdates: 1, // Por enquanto, podemos expandir isso no futuro
          hasData: true
        })
      } else {
        setStats({
          lastUpdate: null,
          daysSince: null,
          totalUpdates: 0,
          hasData: false
        })
      }
    } catch (error) {
      console.error("Erro ao carregar estatísticas do perfil físico:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Acompanhamento Físico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!stats?.hasData) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Perfil Físico
          </CardTitle>
          <CardDescription>
            Complete seu perfil físico para acompanhar sua evolução
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Preencha dados como altura, peso, medidas corporais e objetivos para uma experiência personalizada.
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusBadge = () => {
    if (!stats.daysSince) return null
    
    if (stats.daysSince <= 7) {
      return <Badge variant="secondary" className="bg-green-100 text-green-700">Atualizado</Badge>
    } else if (stats.daysSince <= 30) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">Em dia</Badge>
    } else {
      return <Badge variant="destructive">Desatualizado</Badge>
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Acompanhamento Físico
          {getStatusBadge()}
        </CardTitle>
        <CardDescription>
          Histórico de atualizações do seu perfil físico
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Última atualização:</span>
            </div>
            <span className="text-sm font-medium">{stats.lastUpdate}</span>
          </div>
          
          {stats.daysSince !== null && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Há quantos dias:</span>
              <span className="text-sm font-medium">
                {stats.daysSince === 0 ? "Hoje" : 
                 stats.daysSince === 1 ? "1 dia" : 
                 `${stats.daysSince} dias`}
              </span>
            </div>
          )}

          {stats.daysSince && stats.daysSince > 30 && (
            <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700">
                💡 <strong>Dica:</strong> Atualize seus dados mensalmente para acompanhar sua evolução com precisão!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 