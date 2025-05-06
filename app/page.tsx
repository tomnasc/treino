"use client"

import Link from "next/link"
import { ArrowRight, Download, Wifi, Clock, Dumbbell } from "lucide-react"
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