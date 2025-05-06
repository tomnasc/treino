"use client"

import { useEffect, useState } from "react"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { Loader2, ArrowUpRight, ArrowDownRight, Users, TrendingUp, BarChart3 } from "lucide-react"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Badge } from "@/app/components/ui/badge"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"

interface UserCountStats {
  free: number
  premium: number
  personal: number
  admin: number
  total: number
}

interface MonthlyStats {
  month: string
  signups: number
  conversions: number
}

interface UsageStats {
  feature: string
  count: number
  percentage: number
}

export function SystemStatistics() {
  const [isLoading, setIsLoading] = useState(true)
  const [userStats, setUserStats] = useState<UserCountStats>({
    free: 0,
    premium: 0,
    personal: 0,
    admin: 0,
    total: 0
  })
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats[]>([])
  const [usageStats, setUsageStats] = useState<UsageStats[]>([])
  const [conversionRate, setConversionRate] = useState<number>(0)
  const [conversionTrend, setConversionTrend] = useState<"up" | "down" | "neutral">("neutral")
  const { toast } = useToast()

  useEffect(() => {
    async function fetchStatistics() {
      try {
        setIsLoading(true)
        
        // Buscar contagem de usuários por tipo
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("role")

        if (profilesError) {
          throw profilesError
        }

        // Calcular estatísticas de usuários
        const userCounts = {
          free: profilesData.filter(p => p.role === "free").length,
          premium: profilesData.filter(p => p.role === "premium").length,
          personal: profilesData.filter(p => p.role === "personal").length,
          admin: profilesData.filter(p => p.role === "admin").length,
          total: profilesData.length
        }
        
        setUserStats(userCounts)
        
        // Calcular taxa de conversão
        const convRate = userCounts.total > 0 
          ? (userCounts.premium / userCounts.total) * 100 
          : 0
          
        setConversionRate(parseFloat(convRate.toFixed(1)))
        
        // Dados simulados para tendência de conversão (em uma implementação real, viria do banco de dados)
        // Comparando com o mês anterior, por exemplo
        const previousRate = 7.5 // Simulado: taxa do mês anterior
        if (convRate > previousRate) {
          setConversionTrend("up")
        } else if (convRate < previousRate) {
          setConversionTrend("down")
        } else {
          setConversionTrend("neutral")
        }
        
        // Dados simulados para estatísticas mensais (últimos 6 meses)
        // Em uma implementação real, isso viria de uma consulta SQL agregada por mês
        const simulatedMonthlyData: MonthlyStats[] = [
          { month: "Jan", signups: 12, conversions: 2 },
          { month: "Fev", signups: 19, conversions: 3 },
          { month: "Mar", signups: 15, conversions: 4 },
          { month: "Abr", signups: 22, conversions: 6 },
          { month: "Mai", signups: 28, conversions: 8 },
          { month: "Jun", signups: 35, conversions: 10 }
        ]
        setMonthlyStats(simulatedMonthlyData)
        
        // Dados simulados para estatísticas de uso
        // Em uma implementação real, isso viria de logs de uso do aplicativo
        const simulatedUsageData: UsageStats[] = [
          { feature: "Treinos", count: 450, percentage: 35 },
          { feature: "Histórico", count: 320, percentage: 25 },
          { feature: "Gerador IA", count: 250, percentage: 20 },
          { feature: "Perfil", count: 150, percentage: 12 },
          { feature: "Conquistas", count: 100, percentage: 8 }
        ]
        setUsageStats(simulatedUsageData)
        
        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao buscar estatísticas:", error)
        toast({
          title: "Erro ao carregar estatísticas",
          description: "Não foi possível carregar os dados estatísticos.",
          variant: "destructive",
        })
        setIsLoading(false)
      }
    }
    
    fetchStatistics()
  }, [toast])

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  const pieData = [
    { name: 'Gratuito', value: userStats.free },
    { name: 'Premium', value: userStats.premium },
    { name: 'Personal', value: userStats.personal },
    { name: 'Admin', value: userStats.admin }
  ]

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Usuários
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.total}</div>
            <p className="text-xs text-muted-foreground">
              Usuários registrados no sistema
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Taxa de Conversão
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <div className="text-2xl font-bold mr-2">{conversionRate}%</div>
              {conversionTrend === "up" && (
                <Badge variant="outline" className="bg-green-500/10 text-green-500">
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                  +1.2%
                </Badge>
              )}
              {conversionTrend === "down" && (
                <Badge variant="outline" className="bg-destructive/10 text-destructive">
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                  -0.8%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Usuários convertidos para premium
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Usuários Premium
            </CardTitle>
            <Badge className="bg-secondary">PRO</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.premium}</div>
            <p className="text-xs text-muted-foreground">
              De um total de {userStats.total} usuários
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recurso Mais Usado
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Treinos</div>
            <p className="text-xs text-muted-foreground">
              450 acessos nos últimos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Distribuição de Usuários</TabsTrigger>
          <TabsTrigger value="trends">Tendências Mensais</TabsTrigger>
          <TabsTrigger value="usage">Uso de Recursos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Usuários por Tipo</CardTitle>
              <CardDescription>
                Visualização da composição da base de usuários por tipo de conta
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                A maioria dos usuários ({Math.round((userStats.free / userStats.total) * 100)}%) 
                possui plano gratuito, apresentando potencial para conversão.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tendências de Registro e Conversão</CardTitle>
              <CardDescription>
                Análise da evolução de novos registros e conversões nos últimos 6 meses
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyStats}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="signups" name="Novos Registros" fill="#8884d8" />
                    <Bar dataKey="conversions" name="Conversões" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                O crescimento de registros tem sido consistente mês a mês, com um
                aumento de 192% em novas contas desde janeiro.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Estatísticas de Uso do Aplicativo</CardTitle>
              <CardDescription>
                Recursos mais utilizados nos últimos 30 dias
              </CardDescription>
            </CardHeader>
            <CardContent className="px-2">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    layout="vertical"
                    data={usageStats}
                    margin={{ top: 20, right: 30, left: 50, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="feature" type="category" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Número de Acessos" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground">
                O recurso de Treinos é o mais acessado, seguido pelo Histórico.
                O Gerador de IA apresenta crescimento consistente desde seu lançamento.
              </p>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 