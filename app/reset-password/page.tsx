"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { Button } from "@/app/components/ui/button"
import { Input } from "@/app/components/ui/input"
import { Label } from "@/app/components/ui/label"
import { useToast } from "@/app/hooks/use-toast"
import { supabase } from "@/app/lib/supabase"

export default function ResetPasswordPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{
    email: string
  }>()

  async function onSubmit(data: { email: string }) {
    try {
      setIsSubmitting(true)
      
      // Enviar email de redefinição de senha usando Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password/confirm`,
      })
      
      if (error) throw error
      
      setEmailSent(true)
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro ao enviar email",
        description: (error as Error).message || "Não foi possível enviar o email de redefinição. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Redefinir senha
          </h1>
          <p className="text-sm text-muted-foreground">
            {emailSent 
              ? "Email enviado! Verifique sua caixa de entrada." 
              : "Informe seu email para receber instruções de redefinição de senha"}
          </p>
        </div>
        
        {emailSent ? (
          <div className="flex flex-col space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Enviamos um email com instruções para redefinir sua senha. 
              Verifique sua caixa de entrada e siga as instruções no email.
            </p>
            <Button asChild variant="outline">
              <Link href="/login">
                Voltar para o login
              </Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                placeholder="nome@exemplo.com"
                type="email"
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                disabled={isSubmitting}
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
            
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar link de redefinição"}
            </Button>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Lembrou sua senha?{" "}
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