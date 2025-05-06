"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"

import { signUp } from "@/app/lib/auth"
import { checkSupabaseConnection, checkSupabaseProjectStatus } from "@/app/lib/supabase"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { useToast } from "@/app/hooks/use-toast"
import { AlertCircle, Info } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"

interface RegisterFormProps {
  onSuccess?: () => void
}

export function RegisterForm({ onSuccess }: RegisterFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [signupError, setSignupError] = useState<string | null>(null)
  const [isConnectionOk, setIsConnectionOk] = useState(true)
  const [isCheckingStatus, setIsCheckingStatus] = useState(true)
  const [projectStatus, setProjectStatus] = useState<{
    isOk: boolean;
    issues?: {
      authService?: boolean;
      restApi?: boolean;
      tableAccess?: boolean;
      authPermissions?: boolean;
      connectionError?: boolean;
    };
  } | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<{
    email: string
    password: string
    confirmPassword: string
  }>()

  const password = watch("password", "")

  // Verificar a conexão e o status do projeto Supabase ao montar o componente
  useEffect(() => {
    async function checkConnection() {
      setIsCheckingStatus(true);
      
      try {
        // Verificar a conexão básica
        const isConnected = await checkSupabaseConnection();
        setIsConnectionOk(isConnected);
        
        if (!isConnected) {
          toast({
            title: "Problemas de conexão",
            description: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
            variant: "destructive",
          });
          setIsCheckingStatus(false);
          return;
        }
        
        // Verificar status detalhado do projeto
        const status = await checkSupabaseProjectStatus();
        setProjectStatus(status);
        
        if (!status.isOk) {
          // Determinar mensagem específica com base nos problemas detectados
          let message = "Há um problema com o servidor. ";
          
          if (status.issues?.authService) {
            message += "O serviço de autenticação está indisponível. ";
          }
          
          if (status.issues?.tableAccess) {
            message += "Há um problema de acesso aos dados. ";
          }
          
          if (status.issues?.connectionError) {
            message += "Erro de conexão com o servidor. ";
          }
          
          toast({
            title: "Problemas no servidor",
            description: message + "O registro pode não funcionar corretamente, mas você pode tentar mesmo assim.",
            variant: "default",
          });
        }
      } catch (error) {
        console.error("Erro ao verificar conexão:", error);
        setIsConnectionOk(false);
        setProjectStatus({
          isOk: false,
          issues: { connectionError: true }
        });
        
        toast({
          title: "Erro de conexão",
          description: "Ocorreu um erro ao verificar o status do servidor. Você pode tentar realizar o cadastro mesmo assim.",
          variant: "destructive",
        });
      } finally {
        setIsCheckingStatus(false);
      }
    }
    
    checkConnection();
  }, [toast]);

  // Função para ajudar a coletar informações de erro para diagnóstico
  const reportIssue = () => {
    const diagInfo = {
      connection: isConnectionOk,
      projectStatus,
      error: signupError,
      browser: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    
    console.log("Informações de diagnóstico para suporte:", diagInfo);
    
    navigator.clipboard.writeText(JSON.stringify(diagInfo, null, 2))
      .then(() => {
        toast({
          title: "Informações copiadas",
          description: "Informações de diagnóstico copiadas para a área de transferência para enviar ao suporte.",
        });
      })
      .catch(err => {
        console.error("Erro ao copiar informações:", err);
      });
  };

  async function onSubmit(data: { email: string; password: string }) {
    try {
      // Se ainda estiver verificando status, aguardar
      if (isCheckingStatus) {
        toast({
          title: "Aguarde um momento",
          description: "Estamos verificando a conexão com o servidor. Tente novamente em instantes.",
        });
        return;
      }
      
      setIsLoading(true)
      setSignupError(null)
      
      await signUp(data.email, data.password)
      
      toast({
        title: "Registro realizado com sucesso",
        description: "Verifique seu email para confirmar o cadastro.",
      })
      
      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/login?verified=pending")
      }
    } catch (error: any) {
      console.error("Erro ao realizar cadastro:", error)
      
      // Tratando mensagens de erro específicas
      if (error.message === "Este email já está cadastrado.") {
        setSignupError("Este email já está cadastrado. Tente fazer login.")
      } else if (error.message?.includes("Database error")) {
        setSignupError("Erro no banco de dados. Estamos com um problema técnico temporário. Por favor, tente novamente em alguns minutos.")
      } else if (error.message?.includes("User already registered")) {
        setSignupError("Este email já está cadastrado. Tente fazer login.")
      } else {
        setSignupError(error.message || "Erro ao realizar cadastro. Tente novamente mais tarde.")
      }
      
      toast({
        title: "Erro ao realizar cadastro",
        description: "Verifique os dados e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Verificar se deve mostrar o botão de relatório de problemas
  const showDiagnosticButton = signupError?.includes("Database error") || (projectStatus && !projectStatus.isOk);

  return (
    <div className="grid gap-6">
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          {signupError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{signupError}</AlertDescription>
              {showDiagnosticButton && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2" 
                  type="button"
                  onClick={reportIssue}
                >
                  Relatar problema
                </Button>
              )}
            </Alert>
          )}
          
          {!isConnectionOk && (
            <Alert variant="warning">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Aviso</AlertTitle>
              <AlertDescription>
                Problemas de conexão com o servidor. O cadastro pode não funcionar corretamente.
              </AlertDescription>
            </Alert>
          )}
          
          {isConnectionOk && projectStatus && !projectStatus.isOk && (
            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertTitle>Status do servidor</AlertTitle>
              <AlertDescription>
                Detectamos um problema no servidor que pode afetar o cadastro de novos usuários.
                {projectStatus.issues?.authService && " O serviço de autenticação está com problemas."}
                {projectStatus.issues?.tableAccess && " Há problemas de acesso ao banco de dados."}
                {projectStatus.issues?.connectionError && " Há problemas de conexão com o servidor."}
                {" Você pode tentar realizar o cadastro mesmo assim."}
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              placeholder="nome@exemplo.com"
              type="email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect="off"
              disabled={isLoading}
              {...register("email", {
                required: "Email é obrigatório",
                pattern: {
                  value: /\S+@\S+\.\S+/,
                  message: "Email inválido",
                },
              })}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("password", {
                required: "Senha é obrigatória",
                minLength: {
                  value: 6,
                  message: "Senha deve ter no mínimo 6 caracteres",
                },
              })}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoCapitalize="none"
              autoComplete="new-password"
              disabled={isLoading}
              {...register("confirmPassword", {
                required: "Confirme sua senha",
                validate: value => value === password || "As senhas não conferem",
              })}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
          <Button disabled={isLoading || isCheckingStatus}>
            {isLoading ? "Registrando..." : isCheckingStatus ? "Verificando servidor..." : "Registrar"}
          </Button>
        </div>
      </form>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline"
          >
            Faça login
          </Link>
        </p>
      </div>
    </div>
  )
} 