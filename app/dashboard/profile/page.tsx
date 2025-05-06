"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Save, User } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { PendingTrainerRequests } from "@/app/components/ui/pending-trainer-requests"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser, UserSession } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { DeleteAccountDialog } from "@/app/components/ui/delete-account-dialog"

const profileFormSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(50),
  email: z.string().email("Email inválido").min(5, "Email muito curto").max(100),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export default function ProfilePage() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [memberSince, setMemberSince] = useState<string>("")
  const router = useRouter()
  const { toast } = useToast()

  // Obter dados do usuário
  useEffect(() => {
    fetchUserData()
  }, [router])
  
  async function fetchUserData() {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      
      setUser(currentUser)
      
      // Buscar a data de criação do perfil
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", currentUser.id)
        .single()
      
      if (profileData?.created_at) {
        const createdDate = new Date(profileData.created_at);
        setMemberSince(createdDate.toLocaleDateString("pt-BR"));
      } else {
        setMemberSince("N/A");
      }
      
      form.reset({
        fullName: currentUser.fullName || "",
        email: currentUser.email
      })
      
      setLoading(false)
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error)
      toast({
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar os dados do seu perfil. Tente novamente.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  // Formulário
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  })

  // Função para atualizar perfil
  async function onSubmit(data: ProfileFormValues) {
    if (!user) return
    
    setIsSubmitting(true)
    
    try {
      // Atualizar o perfil no Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
      
      if (error) throw error
      
      // Atualizar o estado local
      setUser({
        ...user,
        fullName: data.fullName,
      })
      
      toast({
        title: "Perfil atualizado",
        description: "Seu perfil foi atualizado com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Função para obter iniciais do nome para o avatar
  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const userInitials = getInitials(user?.fullName)

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
      <p className="text-muted-foreground">
        Gerencie suas informações pessoais e como elas são exibidas no aplicativo.
      </p>

      {user && <PendingTrainerRequests userId={user.id} onRequestHandled={fetchUserData} />}

      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
          <CardDescription>
            Atualize suas informações pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4 mb-6 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.fullName || user?.email || ""} />
              <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-medium">{user?.fullName || "Usuário"}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-sm mt-1">
                Membro desde {memberSince || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Assinatura: {
                  user?.role === "admin" ? "Admin" :
                  user?.role === "personal" ? "Personal" :
                  user?.role === "premium" ? "Premium" : 
                  "Gratuita"
                }
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="seu@email.com" 
                        {...field} 
                        disabled 
                        title="Não é possível alterar o email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Zona de perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Excluir sua conta removerá permanentemente todos os seus dados pessoais, treinos criados e histórico de atividades.
            Esta ação não pode ser desfeita.
          </p>
          
          {user && <DeleteAccountDialog userId={user.id} userEmail={user.email} />}
        </CardContent>
      </Card>
    </div>
  )
} 