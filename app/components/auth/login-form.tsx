"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { AlertCircle } from "lucide-react"

import { signIn } from "@/app/lib/auth"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { useToast } from "@/app/hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert"

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSuspended, setIsSuspended] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{
    email: string
    password: string
  }>()

  // Verificar se o usuário foi redirecionado por estar suspenso
  useEffect(() => {
    const suspended = searchParams.get('suspended')
    if (suspended === 'true') {
      setIsSuspended(true)
    }
  }, [searchParams])

  async function onSubmit(data: { email: string; password: string }) {
    try {
      setIsLoading(true)
      await signIn(data.email, data.password)
      toast({
        title: "Login realizado com sucesso",
        description: "Você será redirecionado para o dashboard.",
      })
      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/dashboard")
      }
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro ao realizar login",
        description: (error as Error).message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="grid gap-6">
      {isSuspended && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Conta suspensa</AlertTitle>
          <AlertDescription>
            Sua conta foi suspensa. Entre em contato com o suporte para mais informações.
          </AlertDescription>
        </Alert>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid gap-4">
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
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/reset-password"
                className="text-sm text-muted-foreground hover:text-primary"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoCapitalize="none"
              autoComplete="current-password"
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
          <Button disabled={isLoading}>
            {isLoading ? "Entrando..." : "Entrar"}
          </Button>
        </div>
      </form>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Não tem uma conta?{" "}
          <Link
            href="/register"
            className="text-primary underline-offset-4 hover:underline"
          >
            Registre-se
          </Link>
        </p>
      </div>
    </div>
  )
} 