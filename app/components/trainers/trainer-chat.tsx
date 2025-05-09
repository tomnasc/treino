"use client"

import { useState, useEffect, useRef } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { SendHorizonal, Loader2 } from "lucide-react"

import { supabase } from "@/app/lib/supabase"
import { Button } from "@/app/components/ui/button"
import { Textarea } from "@/app/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { UserSession } from "@/app/lib/auth"

interface TrainerChatProps {
  currentUser: UserSession
  otherUserId: string
  otherUserName: string | null
  otherUserAvatar: string | null
}

interface Message {
  id: string
  sender_id: string
  receiver_id: string
  message: string
  is_read: boolean
  created_at: string
}

export function TrainerChat({ currentUser, otherUserId, otherUserName, otherUserAvatar }: TrainerChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  // Carregar mensagens iniciais
  useEffect(() => {
    async function fetchMessages() {
      try {
        setIsLoading(true)
        
        // Usar a função para obter mensagens entre os dois usuários
        const { data, error } = await supabase
          .rpc('get_conversation_messages', {
            p_user_id: currentUser.id,
            p_other_user_id: otherUserId
          })
        
        if (error) throw error
        setMessages(data || [])
        
        // Marcar mensagens como lidas
        await supabase
          .rpc('mark_messages_as_read', {
            p_user_id: currentUser.id,
            p_sender_id: otherUserId
          })
      } catch (error) {
        console.error("Erro ao carregar mensagens:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchMessages()
    
    // Configurar assinatura em tempo real para atualizações
    const messagesSubscription = supabase
      .channel('trainer_messages_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'trainer_messages',
        filter: `sender_id=eq.${otherUserId},receiver_id=eq.${currentUser.id}`,
      }, async (payload) => {
        // Adicionar a nova mensagem recebida à lista
        const newMessage = payload.new as Message
        setMessages(prevMessages => [...prevMessages, newMessage])
        
        // Marcar a mensagem como lida automaticamente
        await supabase
          .from('trainer_messages')
          .update({ is_read: true, updated_at: new Date().toISOString() })
          .eq('id', newMessage.id)
      })
      .subscribe()
    
    // Limpar assinatura ao desmontar
    return () => {
      supabase.removeChannel(messagesSubscription)
    }
  }, [currentUser.id, otherUserId])
  
  // Rolar para o final quando novas mensagens chegarem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return
    
    try {
      setIsSending(true)
      
      // Inserir nova mensagem
      const { data, error } = await supabase
        .from('trainer_messages')
        .insert({
          sender_id: currentUser.id,
          receiver_id: otherUserId,
          message: newMessage.trim(),
          is_read: false
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Adicionar à lista de mensagens
      setMessages(prevMessages => [...prevMessages, data])
      setNewMessage("")
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error)
    } finally {
      setIsSending(false)
    }
  }
  
  const getInitials = (name: string | null) => {
    if (!name) return "PT"
    return name
      .split(" ")
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }
  
  const formatMessageTime = (dateString: string) => {
    return format(new Date(dateString), "HH:mm", { locale: ptBR })
  }
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="max-w-sm">
              <h3 className="text-lg font-medium mb-2">Comece a conversa</h3>
              <p className="text-sm text-muted-foreground">
                Envie sua primeira mensagem para iniciar a conversa com {otherUserName || "o personal"}
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[80%] ${msg.sender_id === currentUser.id ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.sender_id !== currentUser.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={otherUserAvatar || ''} alt={otherUserName || 'Personal Trainer'} />
                    <AvatarFallback>{getInitials(otherUserName)}</AvatarFallback>
                  </Avatar>
                )}
                
                <div 
                  className={`
                    px-4 py-2 rounded-lg 
                    ${msg.sender_id === currentUser.id 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'}
                  `}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                  <span className={`text-[10px] ${msg.sender_id === currentUser.id ? 'text-primary-foreground/70' : 'text-muted-foreground'} block text-right mt-1`}>
                    {formatMessageTime(msg.created_at)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="min-h-[80px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={isSending || !newMessage.trim()} 
            className="self-end"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizonal className="h-4 w-4" />
            )}
            <span className="sr-only">Enviar</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 