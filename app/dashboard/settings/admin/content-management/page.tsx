"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Database } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"
import { Separator } from "@/app/components/ui/separator"
import { ExerciseManager } from "@/app/components/admin/exercise-manager"
import { FeaturedWorkouts } from "@/app/components/admin/featured-workouts"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"

export default function ContentManagementPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function checkUser() {
      try {
        const user = await getCurrentUser()
        if (!user) {
          router.push("/login")
          return
        }
        
        // Verificar se o usuário é admin
        if (user.role !== "admin") {
          router.push("/dashboard")
          toast({
            title: "Acesso negado",
            description: "Esta área é exclusiva para administradores.",
            variant: "destructive"
          })
          return
        }
        
        setUserId(user.id)
        setIsLoading(false)
      } catch (error) {
        console.error("Erro ao verificar usuário:", error)
        router.push("/dashboard")
      }
    }
    
    checkUser()
  }, [router])

  const handleBack = () => {
    router.push("/dashboard/settings/admin")
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Gestão de Conteúdo</h1>
      </div>
      
      <p className="text-muted-foreground pb-4">
        Gerencie conteúdos disponíveis na plataforma, como exercícios padrão e treinos em destaque.
      </p>
      
      <Separator />
      
      <Tabs defaultValue="exercises" className="space-y-6">
        <TabsList>
          <TabsTrigger value="exercises">Exercícios Padrão</TabsTrigger>
          <TabsTrigger value="featured">Treinos em Destaque</TabsTrigger>
        </TabsList>
        
        <TabsContent value="exercises" className="space-y-6">
          {userId && <ExerciseManager userId={userId} />}
        </TabsContent>
        
        <TabsContent value="featured" className="space-y-6">
          <FeaturedWorkouts maxFeatured={10} />
        </TabsContent>
      </Tabs>
    </div>
  )
} 