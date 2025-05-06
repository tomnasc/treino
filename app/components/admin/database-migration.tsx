"use client"

import { useState } from "react"
import { FileUp, Check, AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"

interface DatabaseMigrationProps {
  title: string
  description: string
  sqlContent: string
  onMigrated?: () => void
}

export function DatabaseMigration({ 
  title, 
  description, 
  sqlContent,
  onMigrated
}: DatabaseMigrationProps) {
  const [isMigrating, setIsMigrating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const applyMigration = async () => {
    setIsMigrating(true)
    setError(null)
    
    try {
      // Aplicar a migração SQL
      const { error } = await supabase.rpc('exec_sql', { sql_string: sqlContent })
      
      if (error) throw error
      
      setIsComplete(true)
      toast({
        title: "Migração aplicada com sucesso",
        description: `A migração "${title}" foi aplicada ao banco de dados.`
      })
      
      // Callback opcional
      if (onMigrated) onMigrated()
    } catch (err: any) {
      console.error("Erro ao aplicar migração:", err)
      setError(err.message || "Ocorreu um erro ao aplicar a migração.")
      toast({
        title: "Erro ao aplicar migração",
        description: "Não foi possível aplicar a migração. Verifique o console para mais detalhes.",
        variant: "destructive"
      })
    } finally {
      setIsMigrating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          {title}
          {isComplete && <Check className="ml-2 h-5 w-5 text-green-500" />}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="bg-slate-100 dark:bg-slate-900 p-4 rounded-md text-xs overflow-auto max-h-60">
          {sqlContent}
        </pre>
        
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-sm text-red-800 dark:text-red-400 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={applyMigration} 
          disabled={isMigrating || isComplete}
          className="w-full"
        >
          {isMigrating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Aplicando migração...
            </>
          ) : isComplete ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Migração aplicada
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Aplicar migração
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
} 