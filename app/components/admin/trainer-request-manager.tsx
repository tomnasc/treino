"use client"

import { useState, useEffect } from "react"
import { 
  Dumbbell, Loader2, RefreshCw, Check, X, 
  Clock, FileText, Download, ChevronDown
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Badge } from "@/app/components/ui/badge"
import { Button } from "@/app/components/ui/button"
import { Textarea } from "@/app/components/ui/textarea"
import { useToast } from "@/app/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion"
import { supabase } from "@/app/lib/supabase"
import { TrainerRequest, TrainerRequestStatus, Profile } from "@/app/types/database.types"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/app/components/ui/dialog"

interface TrainerRequestItemProps {
  request: TrainerRequest & { 
    user: Profile;
  }
  onStatusChange: (id: string, status: TrainerRequestStatus, notes?: string) => Promise<void>
  adminId: string
}

interface TrainerRequestManagerProps {
  adminId: string
}

// Mapeamento de status de solicitação
const requestStatusConfig = {
  pending: {
    icon: Clock,
    color: "text-yellow-500",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    label: "Pendente",
  },
  approved: {
    icon: Check,
    color: "text-green-500",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    label: "Aprovada",
  },
  rejected: {
    icon: X,
    color: "text-red-500",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    label: "Rejeitada",
  },
}

const RequestStatusBadge = ({ status }: { status: TrainerRequestStatus }) => {
  const config = requestStatusConfig[status]
  const StatusIcon = config.icon
  
  return (
    <Badge className={config.badge} variant="outline">
      <StatusIcon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

// Componente de item de solicitação individual
function TrainerRequestItem({ request, onStatusChange, adminId }: TrainerRequestItemProps) {
  const [adminNotes, setAdminNotes] = useState(request.admin_notes || "")
  const [isProcessing, setIsProcessing] = useState(false)
  const [certificationUrl, setCertificationUrl] = useState<string | null>(null)
  const { toast } = useToast()
  
  // Buscar URL do certificado
  useEffect(() => {
    const loadCertificationUrl = async () => {
      if (request.certification_file_path) {
        try {
          const { data, error } = await supabase.storage
            .from("trainer-certifications")
            .createSignedUrl(request.certification_file_path, 3600) // URL válida por 1 hora
          
          if (error) throw error
          
          setCertificationUrl(data.signedUrl)
        } catch (error) {
          console.error("Erro ao buscar URL para certificado:", error)
        }
      }
    }
    
    loadCertificationUrl()
  }, [request.certification_file_path])
  
  const handleApprove = async () => {
    setIsProcessing(true)
    try {
      await onStatusChange(request.id, "approved", adminNotes)
      toast({
        title: "Solicitação aprovada",
        description: "O usuário foi promovido a personal trainer."
      })
    } catch (error) {
      console.error("Erro ao aprovar solicitação:", error)
      toast({
        title: "Erro ao aprovar solicitação",
        description: "Houve um problema ao aprovar a solicitação.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  const handleReject = async () => {
    setIsProcessing(true)
    try {
      await onStatusChange(request.id, "rejected", adminNotes)
      toast({
        title: "Solicitação rejeitada",
        description: "A solicitação foi rejeitada com sucesso."
      })
    } catch (error) {
      console.error("Erro ao rejeitar solicitação:", error)
      toast({
        title: "Erro ao rejeitar solicitação",
        description: "Houve um problema ao rejeitar a solicitação.",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <AccordionItem value={request.id} className="border rounded-lg mb-4">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-500">
              <Dumbbell className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-lg">{request.user.full_name || request.user.email}</h3>
              <div className="flex items-center text-sm text-gray-500 gap-2">
                <span>{request.user.email}</span>
                <span>•</span>
                <span>{format(new Date(request.created_at || ''), "dd MMM yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <RequestStatusBadge status={request.status} />
          </div>
        </div>
      </AccordionTrigger>
      
      <AccordionContent className="px-4 py-3 space-y-4">
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
            <p className="whitespace-pre-wrap">{request.description}</p>
          </div>
          
          {request.certification_file_path && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Certificado:</h4>
              <a
                href={certificationUrl || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                download={request.certification_file_name || "certificado.pdf"}
              >
                <FileText className="h-4 w-4" />
                <span>{request.certification_file_name}</span>
                <span className="text-xs text-gray-500">
                  ({request.certification_file_size ? Math.round(request.certification_file_size / 1024) : 0} KB)
                </span>
                <Download className="h-4 w-4 ml-1" />
              </a>
            </div>
          )}
          
          {request.status === "pending" && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Notas administrativas:</h4>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Adicione notas internas sobre esta solicitação (opcional)"
                className="min-h-[100px]"
              />
              
              <div className="flex justify-end space-x-2 mt-4">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-1">
                      <X className="h-4 w-4" />
                      <span>Rejeitar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Rejeitar solicitação</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja rejeitar esta solicitação? Esta ação não pode ser desfeita.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                      <p className="text-sm text-muted-foreground mb-4">
                        O usuário será notificado que sua solicitação foi rejeitada e poderá enviar uma nova solicitação no futuro.
                      </p>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Razão para a rejeição (opcional)"
                        className="min-h-[100px]"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>Cancelar</Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleReject}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          "Confirmar rejeição"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="gap-1">
                      <Check className="h-4 w-4" />
                      <span>Aprovar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Aprovar solicitação</DialogTitle>
                      <DialogDescription>
                        Tem certeza que deseja aprovar esta solicitação? O usuário receberá privilégios de personal trainer.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                      <p className="text-sm text-muted-foreground mb-4">
                        Após a aprovação, o usuário terá acesso às funcionalidades de personal trainer e poderá gerenciar clientes.
                      </p>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Notas adicionais (opcional)"
                        className="min-h-[100px]"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>Cancelar</Button>
                      <Button 
                        variant="default" 
                        onClick={handleApprove}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processando...
                          </>
                        ) : (
                          "Confirmar aprovação"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
          
          {request.status !== "pending" && request.admin_notes && (
            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
              <h4 className="text-sm font-medium mb-2">Notas do administrador:</h4>
              <p className="text-sm whitespace-pre-wrap">{request.admin_notes}</p>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function TrainerRequestManager({ adminId }: TrainerRequestManagerProps) {
  const [requests, setRequests] = useState<(TrainerRequest & { 
    user: Profile;
  })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TrainerRequestStatus | "all">("all")
  const { toast } = useToast()
  
  const loadRequests = async () => {
    setIsLoading(true)
    try {
      // Buscar solicitações com informações do usuário
      const { data, error } = await supabase
        .from("trainer_requests")
        .select(`
          *,
          user:profiles!trainer_requests_user_id_fkey(*)
        `)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      
      setRequests(data || [])
    } catch (error) {
      console.error("Erro ao carregar solicitações:", error)
      toast({
        title: "Erro ao carregar solicitações",
        description: "Não foi possível carregar a lista de solicitações.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    loadRequests()
  }, [])
  
  const handleStatusChange = async (id: string, status: TrainerRequestStatus, notes?: string) => {
    try {
      // Iniciar uma transação
      if (status === "approved") {
        // 1. Atualizar a solicitação
        const { error: updateError } = await supabase
          .from("trainer_requests")
          .update({ 
            status: status, 
            admin_notes: notes || null,
            updated_at: new Date().toISOString() 
          })
          .eq("id", id)
        
        if (updateError) throw updateError
        
        // 2. Buscar o user_id desta solicitação
        const { data: requestData, error: requestError } = await supabase
          .from("trainer_requests")
          .select("user_id")
          .eq("id", id)
          .single()
        
        if (requestError) throw requestError
        
        // 3. Atualizar o papel do usuário para "personal"
        const { error: profileError } = await supabase
          .from("profiles")
          .update({ role: "personal" })
          .eq("id", requestData.user_id)
        
        if (profileError) throw profileError
        
      } else {
        // Apenas atualizar o status e notas
        const { error } = await supabase
          .from("trainer_requests")
          .update({ 
            status: status, 
            admin_notes: notes || null,
            updated_at: new Date().toISOString() 
          })
          .eq("id", id)
        
        if (error) throw error
      }
      
      // Atualizar estado local
      setRequests(prev => 
        prev.map(request => 
          request.id === id ? { ...request, status, admin_notes: notes || null } : request
        )
      )
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      throw error
    }
  }
  
  // Filtrar solicitações com base na aba selecionada
  const filteredRequests = activeTab === "all"
    ? requests
    : requests.filter(request => request.status === activeTab)
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Solicitações de Personal Trainer</CardTitle>
        <CardDescription>
          Avalie e gerencie as solicitações para se tornar personal trainer na plataforma.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas</TabsTrigger>
              <TabsTrigger value="rejected">Rejeitadas</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadRequests}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2">Atualizar</span>
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Carregando solicitações...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-8 text-center">
            <Dumbbell className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Nenhuma solicitação encontrada</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === "all"
                ? "Não há solicitações no sistema."
                : `Não há solicitações com status "${requestStatusConfig[activeTab as TrainerRequestStatus].label}".`}
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredRequests.map((request) => (
              <TrainerRequestItem
                key={request.id}
                request={request}
                onStatusChange={handleStatusChange}
                adminId={adminId}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
} 