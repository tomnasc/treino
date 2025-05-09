"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { ArrowLeft, MessageSquare, Loader2, User } from "lucide-react"

import { supabase } from "@/app/lib/supabase"
import { getCurrentUser } from "@/app/lib/auth"
import { Button } from "@/app/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Badge } from "@/app/components/ui/badge"

interface Conversation {
  conversation_with: string
  user_name: string | null
  user_avatar_url: string | null
  user_role: string | null
  last_message: string
  last_message_time: string
  unread_count: number
}

export default function MessagesPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchConversations() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }

        // Buscar todas as conversas do usuário
        const { data, error } = await supabase
          .rpc('get_user_conversations', {
            p_user_id: currentUser.id
          })
        
        if (error) {
          throw error
        }
        
        setConversations(data || [])
      } catch (error) {
        console.error("Erro ao buscar conversas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchConversations()
  }, [router])

  const getInitials = (name: string | null) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  const formatLastMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()
    
    if (isToday) {
      return format(date, "HH:mm", { locale: ptBR })
    }
    
    const isThisYear = date.getFullYear() === now.getFullYear()
    
    if (isThisYear) {
      return format(date, "dd MMM", { locale: ptBR })
    }
    
    return format(date, "dd/MM/yyyy", { locale: ptBR })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Mensagens</h2>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : conversations.length > 0 ? (
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <div 
              key={conversation.conversation_with} 
              className="flex items-center p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => {
                if (conversation.user_role === 'personal') {
                  router.push(`/dashboard/personal-trainers/message/${conversation.conversation_with}`)
                } else {
                  router.push(`/dashboard/messages/${conversation.conversation_with}`)
                }
              }}
            >
              <Avatar className="h-12 w-12 mr-4">
                <AvatarImage src={conversation.user_avatar_url || ''} alt={conversation.user_name || 'Usuário'} />
                <AvatarFallback>{getInitials(conversation.user_name)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{conversation.user_name || 'Usuário'}</h3>
                  <span className="text-xs text-muted-foreground">
                    {formatLastMessageTime(conversation.last_message_time)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-[300px]">
                    {conversation.last_message}
                  </p>
                  {conversation.unread_count > 0 && (
                    <Badge variant="default" className="ml-2">
                      {conversation.unread_count}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-[400px]">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="mt-4 text-lg font-semibold">Nenhuma conversa</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              Você ainda não iniciou nenhuma conversa. Encontre um personal trainer para começar.
            </p>
            <Button asChild>
              <Link href="/dashboard/personal-trainers">
                <User className="mr-2 h-4 w-4" />
                Encontrar personal trainers
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 