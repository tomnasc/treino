"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Save, Shield, Users, Database } from "lucide-react"
import Link from "next/link"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Label } from "@/app/components/ui/label"
import { Switch } from "@/app/components/ui/switch"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser, UserSession } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { Separator } from "@/app/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"

export default function SettingsPage() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Configurações de notificações
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [reminderNotifications, setReminderNotifications] = useState(true)
  const [trainingReminders, setTrainingReminders] = useState(true)
  
  // Preferências do app
  const [theme, setTheme] = useState("system")
  const [language, setLanguage] = useState("pt-BR")
  const [unitSystem, setUnitSystem] = useState("metric")

  // Carregar dados do usuário
  useEffect(() => {
    async function fetchUserData() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        setUser(currentUser)
        
        // Carregar configurações do usuário do banco de dados
        const { data: settings, error } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", currentUser.id)
          .single()
        
        if (error) {
          if (error.code === "PGRST116") {
            // Registro não encontrado, iremos criar na função saveSettings
            console.log("Nenhuma configuração encontrada para o usuário, usando padrões")
          } else {
            console.error("Erro ao buscar configurações:", error)
            toast({
              title: "Erro ao carregar configurações",
              description: "Ocorreu um erro ao buscar suas configurações. Usando configurações padrão.",
              variant: "destructive",
            })
          }
        } else if (settings) {
          // Configurar estados com os valores do banco
          setEmailNotifications(settings.email_notifications ?? true)
          setPushNotifications(settings.push_notifications ?? true)
          setReminderNotifications(settings.reminder_notifications ?? true)
          setTrainingReminders(settings.training_reminders ?? true)
          setTheme(settings.theme ?? "system")
          setLanguage(settings.language ?? "pt-BR")
          setUnitSystem(settings.unit_system ?? "metric")
        }
        
        setLoading(false)
      } catch (error) {
        console.error("Erro ao carregar dados do usuário:", error)
        toast({
          title: "Erro ao carregar configurações",
          description: "Não foi possível carregar suas preferências. Usando configurações padrão.",
          variant: "destructive",
        })
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router, toast])

  // Salvar configurações
  const saveSettings = async () => {
    if (!user) return
    
    setSaving(true)
    
    try {
      const settingsData = {
        user_id: user.id,
        email_notifications: emailNotifications,
        push_notifications: pushNotifications,
        reminder_notifications: reminderNotifications,
        training_reminders: trainingReminders,
        theme,
        language,
        unit_system: unitSystem,
        updated_at: new Date().toISOString(),
      }
      
      // Verificar se já existe um registro de configurações para este usuário
      const { data: existingSettings, error: checkError } = await supabase
        .from("user_settings")
        .select("id")
        .eq("user_id", user.id)
        .single()
      
      let error
      
      if (checkError && checkError.code === "PGRST116") {
        // Não existe ainda, criar novo registro
        const response = await supabase
          .from("user_settings")
          .insert([settingsData])
        
        error = response.error
      } else if (existingSettings) {
        // Atualizar configurações existentes
        const response = await supabase
          .from("user_settings")
          .update(settingsData)
          .eq("user_id", user.id)
        
        error = response.error
      } else if (checkError) {
        throw checkError
      }
      
      if (error) throw error
      
      toast({
        title: "Configurações salvas",
        description: "Suas preferências foram atualizadas com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao salvar configurações:", error)
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar suas configurações. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
      <p className="text-muted-foreground">
        Gerencie suas preferências e configurações do aplicativo.
      </p>

      {/* Notificações */}
      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            Configure como e quando deseja receber notificações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Notificações por email</Label>
              <p className="text-sm text-muted-foreground">
                Receba atualizações e lembretes por email.
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Notificações push</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações em tempo real no seu dispositivo.
              </p>
            </div>
            <Switch
              id="push-notifications"
              checked={pushNotifications}
              onCheckedChange={setPushNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminder-notifications">Lembretes</Label>
              <p className="text-sm text-muted-foreground">
                Receba lembretes para atividades programadas.
              </p>
            </div>
            <Switch
              id="reminder-notifications"
              checked={reminderNotifications}
              onCheckedChange={setReminderNotifications}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="training-reminders">Lembretes de treino</Label>
              <p className="text-sm text-muted-foreground">
                Seja lembrado quando for o momento de treinar.
              </p>
            </div>
            <Switch
              id="training-reminders"
              checked={trainingReminders}
              onCheckedChange={setTrainingReminders}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferências do Aplicativo */}
      <Card>
        <CardHeader>
          <CardTitle>Preferências do Aplicativo</CardTitle>
          <CardDescription>
            Personalize como o aplicativo funciona para você.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-2">
            <Label htmlFor="theme">Tema</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue placeholder="Selecione um tema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Claro</SelectItem>
                <SelectItem value="dark">Escuro</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Escolha como o aplicativo deve ser exibido.
            </p>
          </div>
          
          <Separator />
          
          <div className="grid gap-2">
            <Label htmlFor="language">Idioma</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger id="language">
                <SelectValue placeholder="Selecione um idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                <SelectItem value="en-US">English (US)</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Escolha o idioma do aplicativo.
            </p>
          </div>
          
          <Separator />
          
          <div className="grid gap-2">
            <Label htmlFor="unit-system">Sistema de unidades</Label>
            <Select value={unitSystem} onValueChange={setUnitSystem}>
              <SelectTrigger id="unit-system">
                <SelectValue placeholder="Selecione um sistema" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="metric">Métrico (kg, cm)</SelectItem>
                <SelectItem value="imperial">Imperial (lb, in)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Escolha como as unidades de medida são exibidas.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar configurações
            </>
          )}
        </Button>
      </div>

      {/* Seção de Administração - visível apenas para admins */}
      {user?.role === "admin" && (
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Administração
            </CardTitle>
            <CardDescription>
              Opções avançadas disponíveis apenas para administradores
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Button asChild variant="outline">
                <Link href="/dashboard/settings/admin">
                  <Users className="mr-2 h-4 w-4" />
                  Gerenciar Usuários
                </Link>
              </Button>
              
              <Button asChild variant="outline" disabled>
                <div>
                  <Database className="mr-2 h-4 w-4" />
                  Sistema (Em breve)
                </div>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Estas opções permitem gerenciar o sistema e seus usuários. Use com responsabilidade.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 