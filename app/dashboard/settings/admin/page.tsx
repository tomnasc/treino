"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { 
  Loader2, 
  Search, 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  UserX, 
  Download, 
  Filter,
  RefreshCw,
  Mail,
  KeyRound,
  Ban,
  AlertCircle,
  Database,
  Dumbbell,
  Star
} from "lucide-react"
import Link from "next/link"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/app/components/ui/table"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/app/components/ui/dropdown-menu"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/app/components/ui/select"
import { Badge } from "@/app/components/ui/badge"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/app/components/ui/dialog"
import { Textarea } from "@/app/components/ui/textarea"
import { Label } from "@/app/components/ui/label"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/app/components/ui/accordion"
import { ScrollArea } from "@/app/components/ui/scroll-area"

// Tipo para representar um usuário na tabela de administração
type AdminUser = {
  id: string
  email: string
  full_name: string | null
  role: string
  created_at: string
  last_sign_in_at?: string | null
  status?: string
  is_suspended?: boolean
}

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Verificar se o usuário atual é admin
  useEffect(() => {
    async function checkAdminAccess() {
      try {
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }
        
        // Verificar se é admin
        if (currentUser.role !== "admin") {
          router.push("/dashboard")
          toast({
            title: "Acesso restrito",
            description: "Você não tem permissão para acessar esta página.",
            variant: "destructive",
          })
          return
        }
        
        // Se for admin, carregar a lista de usuários
        await fetchUsers()
      } catch (error) {
        console.error("Erro ao verificar permissões:", error)
        router.push("/dashboard")
      }
    }
    
    checkAdminAccess()
  }, [router])

  // Função para buscar usuários
  const fetchUsers = async () => {
    try {
      setIsRefreshing(true)
      
      // Buscar todos os usuários da tabela profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
      
      if (profilesError) {
        throw profilesError
      }
      
      // Buscar informações adicionais da tabela auth.users (como última data de login)
      // Isso seria melhor implementado como uma view ou função no Supabase
      // Esta implementação é simplificada
      const usersWithDetails = profilesData.map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at,
        status: profile.subscription_status || 'ativo',
        is_suspended: false
      }))
      
      setUsers(usersWithDetails)
      setFilteredUsers(usersWithDetails)
      setIsLoading(false)
      setIsRefreshing(false)
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      })
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Aplicar filtros quando searchQuery, roleFilter ou statusFilter mudarem
  useEffect(() => {
    const applyFilters = () => {
      let result = [...users]
      
      // Filtrar por texto de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        result = result.filter(
          user => 
            user.email.toLowerCase().includes(query) || 
            (user.full_name && user.full_name.toLowerCase().includes(query))
        )
      }
      
      // Filtrar por role
      if (roleFilter !== "all") {
        result = result.filter(user => user.role === roleFilter)
      }
      
      // Filtrar por status
      if (statusFilter !== "all") {
        if (statusFilter === "suspended") {
          result = result.filter(user => user.is_suspended)
        } else if (statusFilter === "active") {
          result = result.filter(user => !user.is_suspended)
        }
      }
      
      setFilteredUsers(result)
    }
    
    applyFilters()
  }, [searchQuery, roleFilter, statusFilter, users])

  // Função para atualizar o papel (role) de um usuário
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId)
      
      if (error) throw error
      
      // Atualizar a lista local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, role: newRole } : user
        )
      )
      
      toast({
        title: "Função atualizada",
        description: `Usuário atualizado para ${newRole}.`,
      })
    } catch (error) {
      console.error("Erro ao atualizar função:", error)
      toast({
        title: "Erro ao atualizar função",
        description: "Não foi possível atualizar a função do usuário.",
        variant: "destructive",
      })
    }
  }

  // Formatar data para exibição
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  // Renderizar badge de acordo com o papel e status
  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="destructive">Admin</Badge>
      case "personal":
        return <Badge variant="outline">Personal</Badge>
      case "premium":
        return <Badge variant="secondary">Premium</Badge>
      default:
        return <Badge variant="default">Gratuito</Badge>
    }
  }
  
  const renderStatusBadge = (isSuspended?: boolean) => {
    if (isSuspended) {
      return <Badge variant="outline" className="bg-destructive/10 text-destructive">Suspenso</Badge>
    }
    return <Badge variant="outline" className="bg-green-500/10 text-green-500">Ativo</Badge>
  }

  // Função para enviar email para usuário
  const sendEmailToUser = async () => {
    if (!selectedUser) return
    
    setIsSendingEmail(true)
    try {
      // Em uma implementação real, aqui você integra com algum serviço de email
      // Este é apenas um exemplo simulado
      
      // Simular atraso da API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast({
        title: "Email enviado",
        description: `Email enviado para ${selectedUser.email} com sucesso.`,
      })
      
      // Limpar formulário
      setEmailSubject("")
      setEmailBody("")
      setSelectedUser(null)
    } catch (error) {
      console.error("Erro ao enviar email:", error)
      toast({
        title: "Erro ao enviar email",
        description: "Não foi possível enviar o email. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSendingEmail(false)
    }
  }
  
  // Função para redefinir senha de usuário
  const resetUserPassword = async (userId: string, userEmail: string) => {
    setIsResettingPassword(true)
    try {
      // Aqui, em um cenário real, você usaria a API do Supabase para resetar a senha
      // const { error } = await supabase.auth.admin.resetUserPassword(userId)
      
      // Simular atraso da API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      toast({
        title: "Redefinição de senha iniciada",
        description: `Email de redefinição enviado para ${userEmail}.`,
      })
    } catch (error) {
      console.error("Erro ao redefinir senha:", error)
      toast({
        title: "Erro na redefinição",
        description: "Não foi possível iniciar a redefinição de senha.",
        variant: "destructive",
      })
    } finally {
      setIsResettingPassword(false)
    }
  }
  
  // Função para suspender/reativar conta de usuário
  const toggleUserSuspension = async (userId: string, isSuspended: boolean) => {
    setIsUpdatingStatus(true)
    try {
      // Em um cenário real, você usaria a API do Supabase para suspender o usuário
      // const { error } = await supabase.auth.admin.updateUserById(userId, { banned: !isSuspended })
      
      // Simular atraso da API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Atualizar a lista local
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, is_suspended: !isSuspended } : user
        )
      )
      
      const action = isSuspended ? "reativada" : "suspensa"
      
      toast({
        title: `Conta ${action}`,
        description: `A conta do usuário foi ${action} com sucesso.`,
      })
    } catch (error) {
      console.error("Erro ao atualizar status da conta:", error)
      toast({
        title: "Erro ao atualizar conta",
        description: "Não foi possível alterar o status da conta.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="px-4 py-10 space-y-6 max-w-full">
      <h1 className="text-3xl font-bold">Painel do Administrador</h1>
      <p className="text-muted-foreground">
        Gerencie usuários, conteúdo e configurações do sistema.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link href="/dashboard/settings/admin/sync-users" className="block no-underline">
          <Card className="h-full cursor-pointer transition-all hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center space-x-3 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
                <RefreshCw className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Sincronizar Usuários</CardTitle>
                <CardDescription>
                  Sincronizar usuários com serviço externo
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/settings/admin/content-management" className="block no-underline">
          <Card className="h-full cursor-pointer transition-all hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center space-x-3 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
                <Dumbbell className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Gestão de Conteúdo</CardTitle>
                <CardDescription>
                  Exercícios padrão e treinos em destaque
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/dashboard/settings/admin/database-migrations" className="block no-underline">
          <Card className="h-full cursor-pointer transition-all hover:bg-accent/50">
            <CardHeader className="flex flex-row items-center space-x-3 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-primary/10 bg-primary/5">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Migrações de Banco</CardTitle>
                <CardDescription>
                  Aplicar migrações ao banco de dados
                </CardDescription>
              </div>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader className="p-5">
          <CardTitle className="flex items-center">
            <AlertCircle className="h-6 w-6 mr-2 text-amber-500" />
            <span>Guia de Administração</span>
          </CardTitle>
          <CardDescription>
            Documentação das funcionalidades avançadas de gerenciamento de usuários
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="suspensao">
              <AccordionTrigger>
                <div className="flex items-center">
                  <Ban className="h-4 w-4 mr-2" />
                  <span>Suspensão de Contas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="h-36 rounded-md border p-4">
                  <div className="space-y-2">
                    <p className="text-sm">
                      A suspensão de contas impede temporariamente que um usuário acesse o sistema. 
                      Quando um usuário é suspenso:
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>Ele não conseguirá fazer login no sistema</li>
                      <li>Permanece visível na lista de usuários com status "Suspenso"</li>
                      <li>Não pode ter seu papel (role) alterado enquanto estiver suspenso</li>
                      <li>Não pode receber emails do sistema</li>
                    </ul>
                    <p className="text-sm">
                      Para suspender um usuário, clique em "Ações" ao lado do nome do usuário 
                      e em seguida "Suspender conta". Para reativar uma conta suspensa, 
                      siga o mesmo caminho e escolha "Reativar conta".
                    </p>
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="redefinicao">
              <AccordionTrigger>
                <div className="flex items-center">
                  <KeyRound className="h-4 w-4 mr-2" />
                  <span>Redefinição de Senhas</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="h-36 rounded-md border p-4">
                  <div className="space-y-2">
                    <p className="text-sm">
                      Como administrador, você pode iniciar o processo de redefinição de senha 
                      para qualquer usuário que esteja com problemas para acessar sua conta.
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>O sistema enviará um email com um link para redefinição de senha</li>
                      <li>O link é temporário e expira após um determinado período</li>
                      <li>Você não terá acesso à nova senha do usuário</li>
                      <li>A conta deve estar ativa (não suspensa) para redefinir a senha</li>
                    </ul>
                    <p className="text-sm">
                      Para redefinir a senha de um usuário, clique em "Ações" ao lado do nome 
                      do usuário e em seguida "Redefinir senha".
                    </p>
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="emails">
              <AccordionTrigger>
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>Envio de Emails</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="h-36 rounded-md border p-4">
                  <div className="space-y-2">
                    <p className="text-sm">
                      Você pode enviar emails personalizados diretamente para qualquer usuário 
                      do sistema. Esta funcionalidade é útil para:
                    </p>
                    <ul className="list-disc pl-5 text-sm space-y-1">
                      <li>Enviar notificações importantes sobre o sistema</li>
                      <li>Solicitar ações específicas dos usuários</li>
                      <li>Resolver problemas de acesso ou configuração</li>
                      <li>Enviar instruções personalizadas para usuários específicos</li>
                    </ul>
                    <p className="text-sm">
                      Os emails são enviados a partir do endereço oficial do sistema e aparecerão 
                      na caixa de entrada do usuário como vindos do "Treino na Mão". 
                      Todos os emails enviados são registrados para fins de auditoria.
                    </p>
                    <p className="text-sm">
                      Para enviar um email, clique em "Ações" ao lado do nome do usuário, 
                      em seguida "Enviar email". Preencha o assunto e o corpo da mensagem e clique em enviar.
                    </p>
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-5">
          <CardTitle>
            <div className="flex items-center space-x-2">
              <Users className="h-6 w-6 text-primary" />
              <span>Usuários</span>
            </div>
          </CardTitle>
          <CardDescription>
            Total de {users.length} usuários registrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0 md:space-x-4 mb-4">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center">
                <Filter className="h-4 w-4 text-muted-foreground mr-2" />
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Filtrar por papel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os papéis</SelectItem>
                    <SelectItem value="free">Gratuito</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativos</SelectItem>
                    <SelectItem value="suspended">Suspensos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button variant="outline" size="sm" onClick={() => {
                setSearchQuery("")
                setRoleFilter("all")
                setStatusFilter("all")
              }}>
                Limpar
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de cadastro</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum usuário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className={user.is_suspended ? "opacity-60" : ""}>
                      <TableCell className="font-medium">
                        {user.full_name || "Nome não definido"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{renderRoleBadge(user.role)}</TableCell>
                      <TableCell>{renderStatusBadge(user.is_suspended)}</TableCell>
                      <TableCell>{formatDate(user.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Ações
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => updateUserRole(user.id, "admin")}
                              disabled={user.role === "admin" || user.is_suspended}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Definir como Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateUserRole(user.id, "personal")}
                              disabled={user.role === "personal" || user.is_suspended}
                            >
                              <UserCheck className="mr-2 h-4 w-4" />
                              Definir como Personal
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateUserRole(user.id, "premium")}
                              disabled={user.role === "premium" || user.is_suspended}
                            >
                              <UserPlus className="mr-2 h-4 w-4" />
                              Definir como Premium
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateUserRole(user.id, "free")}
                              disabled={user.role === "free" || user.is_suspended}
                            >
                              <UserX className="mr-2 h-4 w-4" />
                              Definir como Gratuito
                            </DropdownMenuItem>
                            
                            <DropdownMenuSeparator />
                            
                            <DropdownMenuItem
                              onClick={() => resetUserPassword(user.id, user.email)}
                              disabled={isResettingPassword || user.is_suspended}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Redefinir senha
                            </DropdownMenuItem>
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setSelectedUser(user)
                                  }}
                                  disabled={user.is_suspended}
                                >
                                  <Mail className="mr-2 h-4 w-4" />
                                  Enviar email
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                  <DialogTitle>Enviar email para usuário</DialogTitle>
                                  <DialogDescription>
                                    Envie uma mensagem diretamente para o email do usuário: {selectedUser?.email}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                  <div className="grid gap-2">
                                    <Label htmlFor="subject">Assunto</Label>
                                    <Input
                                      id="subject"
                                      placeholder="Assunto do email"
                                      value={emailSubject}
                                      onChange={(e) => setEmailSubject(e.target.value)}
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label htmlFor="body">Mensagem</Label>
                                    <Textarea
                                      id="body"
                                      placeholder="Conteúdo do email..."
                                      rows={5}
                                      value={emailBody}
                                      onChange={(e) => setEmailBody(e.target.value)}
                                    />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button 
                                    type="submit" 
                                    onClick={sendEmailToUser} 
                                    disabled={!emailSubject || !emailBody || isSendingEmail}
                                  >
                                    {isSendingEmail ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Enviando...
                                      </>
                                    ) : (
                                      <>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Enviar email
                                      </>
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                            
                            <DropdownMenuSeparator />
                            
                            <Dialog>
                              <DialogTrigger asChild>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setSelectedUser(user)
                                  }}
                                  className="text-destructive focus:text-destructive"
                                >
                                  {user.is_suspended ? (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Reativar conta
                                    </>
                                  ) : (
                                    <>
                                      <Ban className="mr-2 h-4 w-4" />
                                      Suspender conta
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>
                                    {user.is_suspended 
                                      ? "Reativar conta de usuário" 
                                      : "Suspender conta de usuário"
                                    }
                                  </DialogTitle>
                                  <DialogDescription>
                                    {user.is_suspended
                                      ? "Tem certeza que deseja reativar esta conta? O usuário voltará a ter acesso ao sistema."
                                      : "Tem certeza que deseja suspender esta conta? O usuário perderá acesso ao sistema."
                                    }
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="py-4">
                                  <div className="flex items-center p-3 space-x-2 rounded-md bg-muted">
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                    <p className="text-sm">
                                      {user.is_suspended
                                        ? "A reativação permitirá que o usuário faça login novamente."
                                        : "A suspensão impedirá que o usuário faça login no sistema."
                                      }
                                    </p>
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                                    Cancelar
                                  </Button>
                                  <Button 
                                    variant={user.is_suspended ? "default" : "destructive"}
                                    onClick={() => {
                                      if (selectedUser) {
                                        toggleUserSuspension(selectedUser.id, selectedUser.is_suspended || false)
                                        setSelectedUser(null)
                                      }
                                    }}
                                    disabled={isUpdatingStatus}
                                  >
                                    {isUpdatingStatus ? (
                                      <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Processando...
                                      </>
                                    ) : user.is_suspended ? (
                                      "Reativar conta"
                                    ) : (
                                      "Suspender conta"
                                    )}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 