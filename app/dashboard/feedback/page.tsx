"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { getCurrentUser } from "@/app/lib/auth"
import { FeedbackForm } from "@/app/components/feedback/feedback-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Button } from "@/app/components/ui/button"
import { Loader2, MessageSquareText, AlertCircle, MessageSquareDashed, FileText, Lightbulb } from "lucide-react"
import { supabase } from "@/app/lib/supabase"
import { Feedback, FeedbackResponse, FeedbackAttachment, FeedbackType } from "@/app/types/database.types"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/app/components/ui/accordion"
import { Badge } from "@/app/components/ui/badge"

// Mapeamento de ícones e cores por tipo de feedback
const feedbackTypeConfig = {
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 dark:bg-red-950",
    borderColor: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    label: "Erro",
  },
  suggestion: {
    icon: Lightbulb,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    label: "Sugestão",
  },
  other: {
    icon: MessageSquareDashed,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800", 
    badge: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    label: "Outro",
  },
}

// Mapeamento de status do feedback
const feedbackStatusConfig = {
  open: {
    label: "Aberto",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  in_progress: {
    label: "Em andamento",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  },
  closed: {
    label: "Concluído",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  },
  reopened: {
    label: "Reaberto",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
}

export default function FeedbackPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [feedbacks, setFeedbacks] = useState<(Feedback & {
    feedback_responses: FeedbackResponse[];
    feedback_attachments: FeedbackAttachment[];
  })[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    async function loadUser() {
      try {
        const user = await getCurrentUser()
        if (user) {
          setUserId(user.id)
          await fetchUserFeedbacks(user.id)
        } else {
          // Redirecionar para login se não estiver autenticado
          router.push("/login")
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [router])

  // Carregar feedbacks do usuário
  const fetchUserFeedbacks = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("feedbacks")
        .select(`
          *,
          feedback_responses(*),
          feedback_attachments(*)
        `)
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
      
      if (error) throw error
      
      setFeedbacks(data || [])
      
      // Carregar URLs dos anexos
      const urls: Record<string, string> = {}
      
      for (const feedback of data || []) {
        for (const attachment of feedback.feedback_attachments) {
          try {
            const { data: urlData, error: urlError } = await supabase.storage
              .from("feedback-attachments")
              .createSignedUrl(attachment.file_path, 3600) // URL válida por 1 hora
            
            if (urlError) continue
            
            urls[attachment.id] = urlData.signedUrl
          } catch (error) {
            console.error(`Erro ao buscar URL para anexo ${attachment.id}:`, error)
          }
        }
      }
      
      setAttachmentUrls(urls)
    } catch (error) {
      console.error("Erro ao carregar feedbacks:", error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!userId) {
    return null // Será redirecionado pelo useEffect
  }

  return (
    <div className="container py-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <MessageSquareText className="h-7 w-7" />
        <span>Feedback</span>
      </h1>
      
      <div className="grid gap-8">
        <FeedbackForm userId={userId} />
        
        <Card>
          <CardHeader>
            <CardTitle>Seus feedbacks anteriores</CardTitle>
            <CardDescription>
              Veja o histórico de feedbacks enviados e acompanhe as respostas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {feedbacks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <MessageSquareText className="h-12 w-12 text-gray-300 mb-3" />
                <h3 className="text-lg font-medium">Nenhum feedback enviado</h3>
                <p className="text-gray-500 max-w-sm mt-1">
                  Você ainda não enviou nenhum feedback. Use o formulário acima para enviar sua primeira sugestão ou reportar um problema.
                </p>
              </div>
            ) : (
              <Accordion type="single" collapsible>
                {feedbacks.map(feedback => {
                  const typeConfig = feedbackTypeConfig[feedback.type]
                  const TypeIcon = typeConfig.icon
                  const statusConfig = feedbackStatusConfig[feedback.status]
                  
                  return (
                    <AccordionItem key={feedback.id} value={feedback.id} className="border-b py-2">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${typeConfig.bgColor} ${typeConfig.color}`}>
                              <TypeIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h3 className="font-medium text-left">{feedback.title}</h3>
                              <div className="flex gap-2 text-sm text-muted-foreground">
                                <span>{format(new Date(feedback.created_at || ''), "dd MMM yyyy", { locale: ptBR })}</span>
                              </div>
                            </div>
                          </div>
                          <Badge className={statusConfig.badge}>
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pt-2 pb-4 space-y-4">
                        <div className="bg-muted p-3 rounded-md">
                          <p className="whitespace-pre-wrap text-sm">{feedback.description}</p>
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
                                  className="text-xs bg-muted px-2 py-1 rounded-md flex items-center gap-1.5 hover:bg-accent transition-colors"
                                  download={attachment.file_name}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  <span className="truncate max-w-[120px]">{attachment.file_name}</span>
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
                                className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-md"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(response.created_at || ''), "dd MMM yyyy HH:mm", { locale: ptBR })}
                                  </p>
                                </div>
                                <p className="text-sm whitespace-pre-wrap">{response.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  )
                })}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 