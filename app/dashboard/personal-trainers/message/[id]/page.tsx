"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, User } from "lucide-react"

import { supabase } from "@/app/lib/supabase"
import { getCurrentUser } from "@/app/lib/auth"
import { Button } from "@/app/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { Card, CardContent, CardHeader } from "@/app/components/ui/card"
import { TrainerChat } from "@/app/components/trainers/trainer-chat"

interface PersonalTrainerChatPageProps {
  params: {
    id: string
  }
}

export default function PersonalTrainerChatPage({ params }: PersonalTrainerChatPageProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [trainer, setTrainer] = useState<any>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        
        // Verificar usuário logado
        const user = await getCurrentUser()
        if (!user) {
          router.push("/login")
          return
        }
        
        setCurrentUser(user)
        
        // Buscar informações do personal trainer
        const { data: trainerData, error: trainerError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", params.id)
          .eq("role", "personal")
          .single()
        
        if (trainerError) {
          if (trainerError.code === "PGRST116") {
            setError("Personal trainer não encontrado.")
          } else {
            setError("Erro ao carregar o personal trainer.")
            console.error(trainerError)
          }
          return
        }
        
        setTrainer(trainerData)
      } catch (error) {
        console.error("Erro ao carregar dados:", error)
        setError("Ocorreu um erro ao carregar os dados.")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchData()
  }, [params.id, router])

  const getInitials = (name: string | null) => {
    if (!name) return "PT"
    return name
      .split(" ")
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" asChild>
            <Link href="/dashboard/personal-trainers">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Voltar</span>
            </Link>
          </Button>
          <h2 className="text-2xl font-bold tracking-tight">Chat com Personal</h2>
        </div>
        
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <User className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">{error}</h2>
          <p className="text-muted-foreground mt-2 mb-4">
            Não foi possível encontrar o personal trainer solicitado.
          </p>
          <Button asChild>
            <Link href="/dashboard/personal-trainers">
              Ver outros personal trainers
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  if (!trainer || !currentUser) {
    return null
  }

  return (
    <div className="flex flex-col h-screen max-h-[calc(100vh-4rem)]">
      <div className="flex items-center space-x-2 p-4 border-b">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/personal-trainers">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Voltar</span>
          </Link>
        </Button>
        <div className="flex items-center space-x-2 flex-1">
          <Avatar>
            <AvatarImage src={trainer.avatar_url || ''} alt={trainer.full_name || 'Personal Trainer'} />
            <AvatarFallback>{getInitials(trainer.full_name)}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-lg font-medium">{trainer.full_name || 'Personal Trainer'}</h2>
            <p className="text-sm text-muted-foreground">{trainer.role === 'personal' ? 'Personal Trainer' : trainer.role}</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <TrainerChat 
          currentUser={currentUser}
          otherUserId={trainer.id}
          otherUserName={trainer.full_name}
          otherUserAvatar={trainer.avatar_url}
        />
      </div>
    </div>
  )
} 