"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarIcon, MoreHorizontal, Plus, Search, UserRound, Dumbbell, BarChart3 } from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Badge } from "@/app/components/ui/badge"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/app/components/ui/alert-dialog"
import { Profile } from "@/app/types/database.types"
import { ClientProfile } from "@/app/types/client.types"

interface ClientListProps {
  clients: ClientProfile[]
  onAddClient: (email: string) => Promise<void>
  onViewClient: (clientId: string) => void
  onCreateWorkout: (clientId: string) => void
  onViewProgress: (clientId: string) => void
  onRemoveClient: (clientId: string) => Promise<void>
  isLoading: boolean
}

export function ClientList({
  clients,
  onAddClient,
  onViewClient,
  onCreateWorkout,
  onViewProgress,
  onRemoveClient,
  isLoading
}: ClientListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [newClientEmail, setNewClientEmail] = useState("")
  const [addingClient, setAddingClient] = useState(false)
  const [clientToRemove, setClientToRemove] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)
  
  // Filtrar alunos por termo de busca e separar por status
  const filteredClients = clients.filter((client) => {
    const searchTerm = searchQuery.toLowerCase()
    return (
      client.full_name?.toLowerCase().includes(searchTerm) ||
      client.email.toLowerCase().includes(searchTerm)
    )
  })
  
  // Separar clientes ativos e pendentes
  const activeClients = filteredClients.filter(client => 
    client.relationship_status === 'active'
  )
  
  const pendingClients = filteredClients.filter(client => 
    client.relationship_status === 'pending'
  )
  
  // Função para adicionar novo aluno
  const handleAddClient = async () => {
    if (!newClientEmail) return
    
    try {
      setAddingClient(true)
      await onAddClient(newClientEmail)
      setNewClientEmail("")
      setIsAddClientOpen(false)
    } catch (error) {
      console.error("Erro ao adicionar aluno:", error)
    } finally {
      setAddingClient(false)
    }
  }
  
  // Função para remover aluno
  const handleRemoveClient = async () => {
    if (!clientToRemove) return
    
    try {
      setIsRemoving(true)
      await onRemoveClient(clientToRemove)
    } catch (error) {
      console.error("Erro ao remover aluno:", error)
    } finally {
      setIsRemoving(false)
      setClientToRemove(null)
    }
  }
  
  // Obter as iniciais do nome para o avatar
  const getInitials = (name: string | null): string => {
    if (!name) return "U"
    
    const nameParts = name.split(" ")
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase()
    
    return (
      nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)
    ).toUpperCase()
  }
  
  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Buscar por nome ou email..."
            className="w-full bg-background pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Dialog open={isAddClientOpen} onOpenChange={setIsAddClientOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Aluno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Aluno</DialogTitle>
              <DialogDescription>
                Adicione um aluno através do email cadastrado. O aluno deve ter uma conta no Treino na Mão.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                placeholder="Email do aluno"
                type="email"
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
              />
              <div className="mt-3 text-sm text-muted-foreground">
                <div className="p-3 border rounded-md bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
                  <p className="font-medium text-amber-800 dark:text-amber-300">Importante:</p>
                  <p className="mt-1">
                    Apenas usuários com plano Premium podem ser adicionados como alunos. Usuários gratuitos precisam fazer upgrade.
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddClientOpen(false)}
                disabled={addingClient}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddClient}
                disabled={!newClientEmail || addingClient}
              >
                {addingClient ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-current"></div>
                    Adicionando...
                  </>
                ) : (
                  "Adicionar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <UserRound className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum aluno encontrado</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Você ainda não possui alunos cadastrados.
          </p>
          <Button onClick={() => setIsAddClientOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Aluno
          </Button>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <Search className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum resultado encontrado</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            Não encontramos nenhum aluno com este termo de busca.
          </p>
          <Button variant="outline" onClick={() => setSearchQuery("")}>
            Limpar busca
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {pendingClients.length > 0 && (
            <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
              <div className="p-4 border-b border-yellow-200 dark:border-yellow-900">
                <h3 className="text-sm font-medium">
                  Solicitações pendentes ({pendingClients.length})
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Estes alunos ainda não confirmaram sua solicitação
                </p>
              </div>
              <Table>
                <TableBody>
                  {pendingClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Avatar className="h-8 w-8 mr-2">
                            <AvatarImage src={client.avatar_url || ""} />
                            <AvatarFallback>{getInitials(client.full_name || "")}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div>{client.full_name || "Sem nome"}</div>
                            <div className="text-sm text-muted-foreground">
                              {client.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <CalendarIcon className="mr-1 h-3 w-3 text-muted-foreground" />
                          <span>
                            {client.created_at
                              ? format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })
                              : "N/A"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          Aguardando confirmação
                        </Badge>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setClientToRemove(client.id)}
                            >
                              Cancelar solicitação
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar solicitação?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja cancelar esta solicitação?
                                Você poderá enviar um novo convite posteriormente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Não, manter</AlertDialogCancel>
                              <AlertDialogAction onClick={handleRemoveClient} disabled={isRemoving}>
                                {isRemoving ? "Cancelando..." : "Sim, cancelar"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Data de cadastro</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último treino</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <Avatar className="h-8 w-8 mr-2">
                          <AvatarImage src={client.avatar_url || ""} />
                          <AvatarFallback>{getInitials(client.full_name || "")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div>{client.full_name || "Sem nome"}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        {client.created_at 
                          ? format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })
                          : "—"
                        }
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={client.role === "premium" ? "default" : "outline"}
                      >
                        {client.role === "premium" ? "Premium" : "Básico"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {client.last_workout_date 
                        ? format(new Date(client.last_workout_date), "dd/MM/yyyy", { locale: ptBR })
                        : "Nunca treinou"
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onSelect={() => onViewClient(client.id)}
                          >
                            <UserRound className="mr-2 h-4 w-4" />
                            Ver perfil
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onSelect={() => onCreateWorkout(client.id)}
                          >
                            <Dumbbell className="mr-2 h-4 w-4" />
                            Criar treino
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onSelect={() => onViewProgress(client.id)}
                          >
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Ver progresso
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onSelect={(e) => {
                                  e.preventDefault()
                                  setClientToRemove(client.id)
                                }}
                              >
                                Remover aluno
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remover aluno?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O aluno será removido da sua lista, 
                                  mas a conta dele continuará existindo.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={handleRemoveClient}
                                  disabled={isRemoving}
                                >
                                  {isRemoving ? "Removendo..." : "Remover"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
} 