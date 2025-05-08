"use client"

import Link from "next/link"
import { ArrowRight, Download, Wifi, Clock, Dumbbell, UserPlus, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { Button } from "@/app/components/ui/button"

export default function Home() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isIOSPWA, setIsIOSPWA] = useState(false)
  const [showIOSInstall, setShowIOSInstall] = useState(false)
  const [showIOSBanner, setShowIOSBanner] = useState(true)

  useEffect(() => {
    // Garantir que o código execute apenas no cliente
    if (typeof window === 'undefined') return
    
    // Verificar se o usuário já dispensou o banner anteriormente
    const hasUserDismissedBanner = localStorage.getItem('pwa-ios-banner-dismissed')
    if (hasUserDismissedBanner === 'true') {
      setShowIOSBanner(false)
    }
    
    // Detectar se é um dispositivo iOS
    const userAgent = navigator.userAgent || ''
    // Safari no iPad mais recente pode se mostrar como Mac
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream
    const isPossibleIPad = 
      /Mac/.test(userAgent) && 
      navigator.maxTouchPoints > 1 && 
      typeof window.orientation !== 'undefined'
    
    setIsIOS(isIOSDevice || isPossibleIPad)
    
    // Verificar se já está instalado como PWA em iOS
    let isInStandaloneMode = false
    try {
      isInStandaloneMode = 
        ('matchMedia' in window && window.matchMedia('(display-mode: standalone)').matches) || 
        !!(window.navigator as any).standalone || 
        !!(document.referrer && document.referrer.includes('ios-app://'))
    } catch (e) {
      console.error('Erro ao verificar modo standalone:', e)
    }
    
    setIsIOSPWA(isInStandaloneMode)
    
    // Mostrar botão para iOS apenas se for iOS e não estiver em modo standalone
    setShowIOSInstall(false) // Não mostrar imediatamente, deixar o usuário clicar no botão

    // Detecta se o aplicativo é instalável em outros navegadores (não iOS)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Previne que o navegador mostre automaticamente o diálogo de instalação
      e.preventDefault()
      // Armazena o evento para usar mais tarde
      setDeferredPrompt(e)
      // Atualiza a UI para mostrar o botão de instalação
      setIsInstallable(true)
    }

    if ('addEventListener' in window) {
      window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)
    }

    return () => {
      if ('removeEventListener' in window) {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as any)
      }
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

  // Função para abrir modal de instruções para iOS
  const handleIOSInstallClick = () => {
    setShowIOSInstall(true)
  }
  
  // Função para dispensar o banner de iOS
  const dismissIOSBanner = () => {
    setShowIOSBanner(false)
    // Salvar a preferência do usuário para não mostrar mais
    try {
      localStorage.setItem('pwa-ios-banner-dismissed', 'true')
    } catch (e) {
      console.error('Erro ao salvar preferência:', e)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {isIOS && !isIOSPWA && showIOSBanner && (
        <div className="sticky top-0 z-50 bg-primary p-3 text-primary-foreground text-center text-sm">
          <div className="flex items-center justify-center">
            <Download className="h-4 w-4 mr-2" />
            <span>Instale o app para uma melhor experiência</span>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-3 h-7 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
              onClick={handleIOSInstallClick}
            >
              Instalar
            </Button>
            <button 
              onClick={dismissIOSBanner} 
              className="ml-2 p-1 rounded-full hover:bg-primary-foreground/10"
              aria-label="Fechar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>
      )}
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
              
              {isIOS && !isIOSPWA && (
                <Button 
                  onClick={handleIOSInstallClick}
                  className="mt-4"
                  variant="outline"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Instalar no iPhone/iPad
                </Button>
              )}
              
              {showIOSInstall && (
                <div className="mt-6 p-6 bg-muted rounded-lg max-w-md mx-auto text-left border border-primary/20 shadow-lg">
                  <h3 className="font-bold text-lg mb-3">Instalar no seu iPhone/iPad:</h3>
                  <ol className="space-y-4 pl-5 list-decimal">
                    <li className="text-sm md:text-base">
                      Toque no botão de compartilhamento 
                      <span className="inline-block mx-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded text-blue-600 dark:text-blue-300">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                          <polyline points="16 6 12 2 8 6"></polyline>
                          <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                      </span> 
                      na barra inferior do Safari
                    </li>
                    <li className="text-sm md:text-base">
                      Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>
                      <div className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded flex items-center">
                        <span className="inline-block mr-2 p-1 bg-white dark:bg-gray-700 rounded-md">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"></path>
                          </svg>
                        </span>
                        <span>Adicionar à Tela de Início</span>
                      </div>
                    </li>
                    <li className="text-sm md:text-base">
                      Toque em <strong>"Adicionar"</strong> no canto superior direito
                    </li>
                  </ol>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Após a instalação, o aplicativo funcionará em tela cheia e também estará disponível offline.
                  </p>
                  <div className="flex space-x-3 mt-5">
                    <Button 
                      onClick={() => setShowIOSInstall(false)}
                      className="flex-1"
                      variant="default"
                    >
                      Entendi
                    </Button>
                    <Button 
                      onClick={() => setShowIOSInstall(false)}
                      className="flex-1" 
                      variant="outline"
                    >
                      Mais tarde
                    </Button>
                  </div>
                </div>
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