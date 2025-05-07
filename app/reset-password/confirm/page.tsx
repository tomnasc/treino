"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"

export default function ResetPasswordConfirmPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [loading, setLoading] = useState(true)
  const [invalidLink, setInvalidLink] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<{
    password: string
    confirmPassword: string
  }>()

  const password = watch("password", "")

  // Verificar se o link é válido
  useEffect(() => {
    const checkSession = async () => {
      try {
        setLoading(true)
        
        // Verificar se há um token de reset na URL
        const hash = window.location.hash.substring(1)
        const params = new URLSearchParams(hash)
        
        if (!params.get("type") || params.get("type") !== "recovery") {
          setInvalidLink(true)
          return
        }

        // Verificar a sessão atual
        const { data, error } = await supabase.auth.getSession()
        
        if (error || !data.session) {
          setInvalidLink(true)
          return
        }
        
        setInvalidLink(false)
      } catch (error) {
        console.error("Erro ao verificar sessão:", error)
        setInvalidLink(true)
      } finally {
        setLoading(false)
      }
    }
    
    checkSession()
  }, [])

  async function onSubmit(data: { password: string; confirmPassword: string }) {
    try {
      setIsSubmitting(true)
      
      if (data.password !== data.confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem",
          variant: "destructive",
        })
        return
      }
      
      // Atualizar a senha
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      })
      
      if (error) throw error
      
      setIsSuccess(true)
      toast({
        title: "Senha atualizada",
        description: "Sua senha foi atualizada com sucesso. Você já pode fazer login.",
      })
      
      // Redirecionar para a página de login após alguns segundos
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro ao atualizar senha",
        description: (error as Error).message || "Não foi possível atualizar sua senha. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p className="text-sm text-muted-foreground">Verificando...</p>
          </div>
        </div>
      </div>
    )
  }

  if (invalidLink) {
    return (
      <div className="container flex h-screen w-screen flex-col items-center justify-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight">
              Link inválido
            </h1>
            <p className="text-sm text-muted-foreground">
              Este link de redefinição de senha é inválido ou expirou.
            </p>
          </div>
          
          <Button asChild>
            <Link href="/reset-password">
              Solicitar novo link
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Nova senha
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSuccess 
              ? "Senha atualizada com sucesso!" 
              : "Defina sua nova senha de acesso"}
          </p>
        </div>
        
        {isSuccess ? (
          <div className="flex flex-col space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Sua senha foi atualizada com sucesso. Você será redirecionado para a página de login em alguns segundos.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">
                Ir para o login agora
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="password">Nova senha</Label>
              <Input
                id="password"
                type="password"
                autoCapitalize="none"
                autoComplete="new-password"
                disabled={isSubmitting}
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
              <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoCapitalize="none"
                autoComplete="new-password"
                disabled={isSubmitting}
                {...register("confirmPassword", {
                  required: "Confirmação de senha é obrigatória",
                  validate: value => value === password || "As senhas não coincidem"
                })}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Atualizando..." : "Atualizar senha"}
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Voltar para login
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  )
} 