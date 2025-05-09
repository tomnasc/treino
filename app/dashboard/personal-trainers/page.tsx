"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, UserRound, ArrowLeft, MessageSquare } from "lucide-react"

import { supabase } from "@/app/lib/supabase"
import { getCurrentUser } from "@/app/lib/auth"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import Link from "next/link"

interface PersonalTrainer {
  id: string
  full_name: string | null
  email: string
  avatar_url: string | null
  created_at: string | null
  role: string | null
}

export default function PersonalTrainersPage() {
  const router = useRouter()
  const [personalTrainers, setPersonalTrainers] = useState<PersonalTrainer[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchPersonalTrainers() {
      try {
        setIsLoading(true)
        
        const currentUser = await getCurrentUser()
        if (!currentUser) {
          router.push("/login")
          return
        }

        // Buscar a lista de personal trainers usando a função do banco de dados
        const { data: trainers, error } = await supabase
          .rpc('list_personal_trainers')
        
        if (error) throw error
        setPersonalTrainers(trainers || [])
      } catch (error) {
        console.error("Erro ao buscar personal trainers:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPersonalTrainers()
  }, [router])

  const filteredTrainers = personalTrainers.filter(trainer => 
    trainer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    trainer.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name: string | null) => {
    if (!name) return "PT"
    return name
      .split(" ")
      .map(part => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
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
        <h2 className="text-2xl font-bold tracking-tight">Personal Trainers</h2>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-1 max-w-sm items-center space-x-2">
          <Input
            placeholder="Buscar personal trainer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
            type="search"
          />
          <Button variant="outline" size="icon">
            <Search className="h-4 w-4" />
            <span className="sr-only">Buscar</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      ) : filteredTrainers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrainers.map((trainer) => (
            <Card key={trainer.id} className="overflow-hidden">
              <CardHeader className="p-4 pb-0">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={trainer.avatar_url || ''} alt={trainer.full_name || 'Personal Trainer'} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(trainer.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">{trainer.full_name || 'Personal Trainer'}</CardTitle>
                    <CardDescription className="text-sm truncate">
                      {trainer.email}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 pb-0">
                <p className="text-sm text-muted-foreground">
                  Personal trainer profissional, pronto para te ajudar a alcançar seus objetivos de forma personalizada.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end p-4">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="w-full" 
                  onClick={() => router.push(`/dashboard/personal-trainers/message/${trainer.id}`)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Enviar Mensagem
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center h-[400px]">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <UserRound className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="mt-4 text-lg font-semibold">Nenhum personal trainer encontrado</h3>
            <p className="mb-4 mt-2 text-sm text-muted-foreground">
              {searchTerm 
                ? "Não encontramos personal trainers com esses termos. Tente uma busca diferente." 
                : "Não há personal trainers cadastrados no momento."}
            </p>
          </div>
        </div>
      )}
    </div>
  )
} 