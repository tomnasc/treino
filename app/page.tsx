"use client"

import Link from "next/link"
import { ArrowRight, Download, Wifi, Clock, Dumbbell, UserPlus, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"

export default function Home() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Detecta se o aplicativo é instalável
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne que o navegador mostre automaticamente o diálogo de instalação
      e.preventDefault()
      // Armazena o evento para usar mais tarde
      setDeferredPrompt(e)
      // Atualiza a UI para mostrar o botão de instalação
      setIsInstallable(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Mostra o diálogo de instalação
    deferredPrompt.prompt()
    
    // Espera pela escolha do usuário
    const choiceResult = await deferredPrompt.userChoice
    
    if (choiceResult.outcome === 'accepted') {
      console.log('Usuário aceitou a instalação do PWA')
    } else {
      console.log('Usuário recusou a instalação do PWA')
    }
    
    // Limpa o evento salvo
    setDeferredPrompt(null)
    setIsInstallable(false)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-background to-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl">
                  Treino na Mão
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Seu aplicativo personalizado para gerenciar seus treinos de academia de forma eficiente.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link 
                  href="/login"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  Entrar
                </Link>
                <Link
                  href="/register"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                >
                  Registrar
                </Link>
              </div>
              
              {isInstallable && (
                <Button 
                  onClick={handleInstallClick}
                  className="mt-4"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Instalar aplicativo
                </Button>
              )}
            </div>
          </div>
        </section>
        
        <section className="w-full py-12 bg-background">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl font-bold tracking-tight text-center mb-8">Recursos do Aplicativo</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <Wifi className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-xl font-medium mb-2">Funciona Offline</h3>
                <p className="text-muted-foreground">
                  Acesse seus treinos mesmo sem conexão com a internet. Seus dados são salvos no dispositivo.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <Dumbbell className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-xl font-medium mb-2">Modo Treino</h3>
                <p className="text-muted-foreground">
                  Acompanhe seus treinos com cronômetros, contadores de séries e anotações de desempenho.
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <Clock className="h-10 w-10 mb-4 text-primary" />
                <h3 className="text-xl font-medium mb-2">Instalável</h3>
                <p className="text-muted-foreground">
                  Instale o aplicativo diretamente no seu celular ou computador para acesso rápido.
                </p>
              </div>
            </div>
            
            <div className="flex justify-center mt-8">
              <Link 
                href="/register"
                className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Comece agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Nova seção para Personal Trainers */}
        <section className="w-full py-12 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
              <UserPlus className="h-12 w-12 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight">Para Personal Trainers</h2>
              <p className="text-muted-foreground max-w-[700px]">
                Profissionais certificados podem solicitar acesso à nossa plataforma exclusiva para Personal Trainers.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="bg-background p-6 rounded-lg border">
                <h3 className="text-xl font-medium mb-4">Benefícios Exclusivos</h3>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Acesso a todos os recursos premium sem custo adicional</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Gerenciamento de múltiplos alunos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Criação de treinos personalizados para alunos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Acompanhamento de progresso e desempenho de alunos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-primary mr-2 mt-0.5 flex-shrink-0" />
                    <span>Sem limite de treinos cadastrados</span>
                  </li>
                </ul>
              </div>
              
              <div className="bg-background p-6 rounded-lg border">
                <h3 className="text-xl font-medium mb-4">Como se Tornar um Personal no Aplicativo</h3>
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Registre-se</span>
                    <p className="mt-1 pl-6">Crie uma conta no aplicativo normalmente</p>
                  </li>
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Envie sua documentação</span>
                    <p className="mt-1 pl-6">Entre em contato com o administrador através da seção de configurações</p>
                  </li>
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Verificação</span>
                    <p className="mt-1 pl-6">Sua certificação profissional e documentos serão avaliados</p>
                  </li>
                  <li className="text-muted-foreground">
                    <span className="text-foreground font-medium">Aprovação</span>
                    <p className="mt-1 pl-6">Após aprovação, seu perfil será atualizado para Personal Trainer com todos os benefícios</p>
                  </li>
                </ol>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg mt-8 p-4 max-w-4xl mx-auto">
              <p className="text-sm text-center text-amber-800 dark:text-amber-300">
                <span className="font-bold">Importante:</span> Personal Trainers recebem automaticamente todos os benefícios de um usuário Premium, sem a necessidade de assinatura.
              </p>
            </div>

            <div className="flex justify-center mt-8">
              <Link 
                href="/register"
                className="inline-flex items-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
              >
                Registrar como Personal
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <footer className="w-full py-6 bg-muted">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Treino na Mão. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
} 