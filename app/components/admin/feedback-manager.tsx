"use client"

import { useState, useEffect } from "react"
import { 
  AlertCircle, Check, MessageSquareText, Loader2, RefreshCw, 
  MessageSquareDashed, XCircle, Clock, MessageSquareWarning, 
  MessageSquare, ChevronDown
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu"
import { supabase } from "@/app/lib/supabase"
import { Feedback, FeedbackResponse, FeedbackAttachment, FeedbackStatus, FeedbackType, Profile } from "@/app/types/database.types"

interface FeedbackItemProps {
  feedback: Feedback & { 
    user: Profile;
    feedback_responses: (FeedbackResponse & { user: Profile })[];
    feedback_attachments: FeedbackAttachment[];
  }
  onStatusChange: (id: string, status: FeedbackStatus) => Promise<void>
  onReplySubmit: (id: string, message: string) => Promise<void>
  adminId: string
}

interface FeedbackManagerProps {
  adminId: string
}

// Mapeamento de ícones e cores por tipo de feedback
const feedbackTypeConfig = {
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  suggestion: {
    icon: MessageSquareText,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  },
  other: {
    icon: MessageSquareDashed,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800", 
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  },
}

// Mapeamento de ícones e cores por status de feedback
const feedbackStatusConfig = {
  open: {
    icon: MessageSquare,
    color: "text-green-500",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    label: "Aberto",
  },
  in_progress: {
    icon: Clock,
    color: "text-yellow-500",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    label: "Em andamento",
  },
  closed: {
    icon: Check,
    color: "text-gray-500",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
    label: "Concluído",
  },
  reopened: {
    icon: MessageSquareWarning,
    color: "text-amber-500",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
    label: "Reaberto",
  },
}

const FeedbackStatusBadge = ({ status }: { status: FeedbackStatus }) => {
  const config = feedbackStatusConfig[status]
  const StatusIcon = config.icon
  
  return (
    <Badge className={config.badge} variant="outline">
      <StatusIcon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  )
}

// Componente de item de feedback individual
function FeedbackItem({ feedback, onStatusChange, onReplySubmit, adminId }: FeedbackItemProps) {
  const [replyText, setReplyText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChangingStatus, setIsChangingStatus] = useState(false)
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const { toast } = useToast()
  
  const typeConfig = feedbackTypeConfig[feedback.type]
  const TypeIcon = typeConfig.icon
  
  // Buscar URLs dos anexos
  useEffect(() => {
    const loadAttachmentUrls = async () => {
      const urls: Record<string, string> = {}
      
      for (const attachment of feedback.feedback_attachments) {
        try {
          const { data, error } = await supabase.storage
            .from("feedback-attachments")
            .createSignedUrl(attachment.file_path, 3600) // URL válida por 1 hora
          
          if (error) throw error
          
          urls[attachment.id] = data.signedUrl
        } catch (error) {
          console.error(`Erro ao buscar URL para anexo ${attachment.id}:`, error)
        }
      }
      
      setAttachmentUrls(urls)
    }
    
    if (feedback.feedback_attachments.length > 0) {
      loadAttachmentUrls()
    }
  }, [feedback.feedback_attachments])
  
  const handleSubmitReply = async () => {
    if (!replyText.trim()) return
    
    setIsSubmitting(true)
    try {
      await onReplySubmit(feedback.id, replyText)
      setReplyText("")
      toast({
        title: "Resposta enviada",
        description: "Sua resposta foi enviada com sucesso."
      })
    } catch (error) {
      console.error("Erro ao enviar resposta:", error)
      toast({
        title: "Erro ao enviar resposta",
        description: "Houve um problema ao enviar sua resposta.",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  const handleStatusChange = async (status: FeedbackStatus) => {
    setIsChangingStatus(true)
    try {
      await onStatusChange(feedback.id, status)
      toast({
        title: "Status atualizado",
        description: `O feedback foi marcado como "${feedbackStatusConfig[status].label}".`
      })
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      toast({
        title: "Erro ao atualizar status",
        description: "Houve um problema ao atualizar o status do feedback.",
        variant: "destructive"
      })
    } finally {
      setIsChangingStatus(false)
    }
  }
  
  return (
    <AccordionItem value={feedback.id} className="border rounded-lg mb-4">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
              <TypeIcon className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-lg">{feedback.title}</h3>
              <div className="flex items-center text-sm text-gray-500 gap-2">
                <span>{feedback.user.full_name || feedback.user.email}</span>
                <span>•</span>
                <span>{format(new Date(feedback.created_at || ''), "dd MMM yyyy", { locale: ptBR })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FeedbackStatusBadge status={feedback.status} />
          </div>
        </div>
      </AccordionTrigger>
      
      <AccordionContent className="px-4 py-3 space-y-4">
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-md border border-gray-200 dark:border-gray-800">
            <p className="whitespace-pre-wrap">{feedback.description}</p>
          </div>
          
          {feedback.feedback_attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Anexos:</h4>
              <div className="flex flex-wrap gap-2">
                {feedback.feedback_attachments.map(attachment => (
                  <a
                    key={attachment.id}
                    href={attachmentUrls[attachment.id] || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-md flex items-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    download={attachment.file_name}
                  >
                    <span>{attachment.file_name}</span>
                    <span className="text-xs text-gray-500">
                      ({Math.round(attachment.file_size / 1024)} KB)
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
          
          {feedback.feedback_responses.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Respostas:</h4>
              {feedback.feedback_responses.map(response => (
                <div 
                  key={response.id} 
                  className={`p-3 rounded-md border ${
                    response.user.id === adminId 
                      ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 ml-4" 
                      : "bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-medium">{response.user.full_name || response.user.email}</div>
                    <div className="text-xs text-gray-500">
                      {format(new Date(response.created_at || ''), "dd MMM yyyy HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <h4 className="text-sm font-medium">Responder:</h4>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-1 text-xs h-7"
                    disabled={isChangingStatus}
                  >
                    <span>Alterar Status</span>
                    {isChangingStatus ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleStatusChange("open")}>
                    <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                    <span>Aberto</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("in_progress")}>
                    <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>Em andamento</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("closed")}>
                    <Check className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Concluído</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleStatusChange("reopened")}>
                    <MessageSquareWarning className="h-4 w-4 mr-2 text-amber-500" />
                    <span>Reaberto</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-start gap-2">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Digite sua resposta..."
                className="min-h-[100px] flex-1"
              />
              <Button 
                onClick={handleSubmitReply} 
                disabled={!replyText.trim() || isSubmitting}
                className="mt-1"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Enviar"
                )}
              </Button>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}

export function FeedbackManager({ adminId }: FeedbackManagerProps) {
  const [feedbacks, setFeedbacks] = useState<(Feedback & { 
    user: Profile;
    feedback_responses: (FeedbackResponse & { user: Profile })[];
    feedback_attachments: FeedbackAttachment[];
  })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FeedbackStatus | "all">("all")
  const { toast } = useToast()
  
  const loadFeedbacks = async () => {
    setIsLoading(true)
    try {
      // Buscar feedbacks com respostas, anexos e informações do usuário
      const { data, error } = await supabase
        .from("feedbacks")
        .select(`
          *,
          user:profiles!feedbacks_user_id_fkey(*),
          feedback_responses(*, user:profiles!feedback_responses_user_id_fkey(*)),
          feedback_attachments(*)
        `)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      
      setFeedbacks(data || [])
    } catch (error) {
      console.error("Erro ao carregar feedbacks:", error)
      toast({
        title: "Erro ao carregar feedbacks",
        description: "Não foi possível carregar a lista de feedbacks.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  useEffect(() => {
    loadFeedbacks()
  }, [])
  
  const handleStatusChange = async (id: string, status: FeedbackStatus) => {
    try {
      const { error } = await supabase
        .from("feedbacks")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
      
      if (error) throw error
      
      // Atualizar estado local
      setFeedbacks(prev => 
        prev.map(feedback => 
          feedback.id === id ? { ...feedback, status } : feedback
        )
      )
    } catch (error) {
      console.error("Erro ao atualizar status:", error)
      throw error
    }
  }
  
  const handleReplySubmit = async (id: string, message: string) => {
    try {
      // Adicionar resposta
      const { data: responseData, error: responseError } = await supabase
        .from("feedback_responses")
        .insert({
          feedback_id: id,
          user_id: adminId,
          message
        })
        .select("*, user:profiles!feedback_responses_user_id_fkey(*)")
        .single()
      
      if (responseError) throw responseError
      
      // Atualizar estado local
      setFeedbacks(prev => 
        prev.map(feedback => 
          feedback.id === id 
            ? { 
                ...feedback, 
                feedback_responses: [...feedback.feedback_responses, responseData]
              } 
            : feedback
        )
      )
      
      // Mudar status para "in_progress" se estiver aberto
      const targetFeedback = feedbacks.find(f => f.id === id)
      if (targetFeedback && targetFeedback.status === "open") {
        await handleStatusChange(id, "in_progress")
      }
    } catch (error) {
      console.error("Erro ao adicionar resposta:", error)
      throw error
    }
  }
  
  // Filtrar feedbacks com base na aba selecionada
  const filteredFeedbacks = activeTab === "all"
    ? feedbacks
    : feedbacks.filter(feedback => feedback.status === activeTab)
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gerenciar Feedbacks</CardTitle>
        <CardDescription>
          Visualize e responda aos feedbacks enviados pelos usuários.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="open">Abertos</TabsTrigger>
              <TabsTrigger value="in_progress">Em andamento</TabsTrigger>
              <TabsTrigger value="reopened">Reabertos</TabsTrigger>
              <TabsTrigger value="closed">Concluídos</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={loadFeedbacks}
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
            <span className="ml-2 text-gray-500">Carregando feedbacks...</span>
          </div>
        ) : filteredFeedbacks.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-8 text-center">
            <XCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Nenhum feedback encontrado</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {activeTab === "all"
                ? "Não há feedbacks no sistema."
                : `Não há feedbacks com status "${feedbackStatusConfig[activeTab as FeedbackStatus].label}".`}
            </p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredFeedbacks.map((feedback) => (
              <FeedbackItem
                key={feedback.id}
                feedback={feedback}
                onStatusChange={handleStatusChange}
                onReplySubmit={handleReplySubmit}
                adminId={adminId}
              />
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
} 