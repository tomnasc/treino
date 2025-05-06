"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Database } from "lucide-react"
import fs from "fs/promises"
import path from "path"

import { Button } from "@/app/components/ui/button"
import { DatabaseMigration } from "@/app/components/admin/database-migration"
import { Separator } from "@/app/components/ui/separator"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser } from "@/app/lib/auth"

// Carregar arquivos SQL como strings
const featuredWorkoutsSql = `-- Adicionar a coluna is_featured à tabela workouts
ALTER TABLE workouts
ADD COLUMN is_featured BOOLEAN DEFAULT FALSE;

-- Criar índice para facilitar consultas de treinos em destaque
CREATE INDEX idx_workouts_is_featured ON workouts (is_featured) WHERE is_featured = TRUE;

-- Comentário para a coluna is_featured
COMMENT ON COLUMN workouts.is_featured IS 'Indica se o treino está em destaque na plataforma';`

const preserveExercisesSql = `-- Criar uma função que transfere a propriedade dos exercícios para um admin quando o usuário é excluído
CREATE OR REPLACE FUNCTION transfer_exercises_to_admin()
RETURNS TRIGGER AS $$
DECLARE
    admin_id UUID;
BEGIN
    -- Obter o ID de um usuário admin
    SELECT id INTO admin_id FROM profiles WHERE role = 'admin' LIMIT 1;
    
    -- Se não existir admin, usar NULL (sistema)
    IF admin_id IS NULL THEN
        admin_id := NULL;
    END IF;
    
    -- Atualizar exercícios do usuário excluído para pertencer ao admin
    UPDATE exercises
    SET created_by = admin_id
    WHERE created_by = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função antes de excluir um perfil
DROP TRIGGER IF EXISTS transfer_exercises_trigger ON profiles;
CREATE TRIGGER transfer_exercises_trigger
BEFORE DELETE ON profiles
FOR EACH ROW
EXECUTE FUNCTION transfer_exercises_to_admin();`

export default function DatabaseMigrationsPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)

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
        <h1 className="text-2xl font-bold tracking-tight">Migrações de Banco de Dados</h1>
      </div>
      
      <p className="text-muted-foreground pb-4">
        Gerencie e aplique migrações SQL ao banco de dados. Tenha cuidado! Essas operações podem 
        afetar os dados armazenados e não podem ser facilmente revertidas.
      </p>
      
      <Separator />
      
      <div className="grid grid-cols-1 gap-6 mt-6">
        <DatabaseMigration 
          title="Adicionar Treinos em Destaque" 
          description="Adiciona o campo is_featured à tabela workouts para permitir marcar treinos em destaque."
          sqlContent={featuredWorkoutsSql}
        />
        
        <DatabaseMigration 
          title="Preservar Exercícios de Usuários Excluídos" 
          description="Cria um trigger para transferir os exercícios criados para um admin quando o usuário for excluído."
          sqlContent={preserveExercisesSql}
        />
      </div>
    </div>
  )
} 