"use client"

import { useState } from "react"
import { Trash2, AlertTriangle, Loader2 } from "lucide-react"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger
} from "@/app/components/ui/dialog"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"
import { supabase } from "@/app/lib/supabase"
import { useRouter } from "next/navigation"
import { useToast } from "@/app/hooks/use-toast"
import { signOut } from "@/app/lib/auth"

interface DeleteAccountDialogProps {
  userId: string
  userEmail: string
}

export function DeleteAccountDialog({ userId, userEmail }: DeleteAccountDialogProps) {
  const [confirmation, setConfirmation] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

  const addLog = (message: string) => {
    console.log(message);
    setLogs((prev) => [...prev, message]);
  };

  const handleDeleteAccount = async () => {
    if (confirmation !== userEmail) return
    
    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      setLogs([])
      
      // Primeiro, confirmar que o usuário ainda está autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        throw new Error("Sua sessão expirou. Por favor, faça login novamente.")
      }
      
      addLog(`Iniciando processo de exclusão de conta usando API do servidor`)
      
      // Usar a API do servidor para exclusão, que tem mais permissões
      try {
        addLog("Enviando solicitação para a API de exclusão...")
        addLog(`Token de acesso disponível: ${!!session.access_token}`)
        
        // Obter cookies atuais para depuração
        addLog(`Verificando cookies disponíveis...`)
        const cookies = document.cookie.split(';').map(c => c.trim())
        if (cookies.length > 0) {
          addLog(`${cookies.length} cookies encontrados`)
          cookies.forEach(c => {
            const [name] = c.split('=')
            if (name && name.includes('supabase')) {
              addLog(`Cookie encontrado: ${name}`)
            }
          })
        } else {
          addLog(`Nenhum cookie encontrado!`)
        }
        
        const response = await fetch('/api/user/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            confirmEmail: confirmation,
          }),
          credentials: 'include', // Garantir que cookies de autenticação sejam enviados
        })
        
        if (!response.ok) {
          const errorText = await response.text()
          addLog(`Resposta da API (${response.status}): ${errorText}`)
          
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch (e) {
            errorData = { error: errorText || response.statusText }
          }
          
          throw new Error(errorData.error || 'Erro ao processar solicitação de exclusão')
        }
        
        const data = await response.json()
        addLog("API reportou sucesso na exclusão da conta!")
      } catch (error: any) {
        addLog(`ERRO ao chamar API: ${error.message}`)
        throw error
      }
      
      // Fazer logout
      addLog("Finalizando sessão do usuário...")
      await signOut()
      
      toast({
        title: "Conta excluída",
        description: "Sua conta foi excluída com sucesso. Você será redirecionado para a página inicial.",
      })
      
      // Fechar o diálogo
      setIsOpen(false)
      
      // Redirecionar para a página inicial
      router.push("/")
    } catch (error: any) {
      console.error("Erro ao excluir conta:", error)
      setErrorMessage(error.message || "Não foi possível excluir sua conta. Tente novamente mais tarde.")
      toast({
        title: "Erro ao excluir conta",
        description: error.message || "Não foi possível excluir sua conta. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="mt-4">
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir minha conta
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Excluir conta</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Isso excluirá permanentemente sua conta e removerá seus dados dos nossos servidores.
          </DialogDescription>
        </DialogHeader>
        
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção!</AlertTitle>
          <AlertDescription>
            Todos os seus dados serão excluídos permanentemente, incluindo:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Perfil e informações pessoais</li>
              <li>Treinos personalizados</li>
              <li>Histórico de treinos</li>
              <li>Configurações e preferências</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        {errorMessage && (
          <Alert variant="destructive" className="my-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {logs.length > 0 && isSubmitting && (
          <div className="my-4 p-2 bg-muted rounded text-xs max-h-32 overflow-y-auto">
            <p className="font-bold mb-1">Progresso:</p>
            {logs.map((log, i) => (
              <div key={i} className="mb-1">{log}</div>
            ))}
          </div>
        )}
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="confirmation" className="font-medium">
              Para confirmar, digite seu email: <span className="font-bold text-destructive">{userEmail}</span>
            </Label>
            <Input
              id="confirmation"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder={userEmail}
              className="col-span-2"
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={confirmation !== userEmail || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir minha conta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 