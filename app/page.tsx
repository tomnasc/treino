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
            <div className="text-center max-w-3xl mx-auto mb-10">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Todos os Recursos</h2>
              <p className="text-muted-foreground">
                O Treino na Mão oferece uma ampla gama de funcionalidades para otimizar seu treino e acompanhar seu progresso fitness.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path>
                  <line x1="8" y1="16" x2="8.01" y2="16"></line>
                  <line x1="8" y1="20" x2="8.01" y2="20"></line>
                  <line x1="12" y1="18" x2="12.01" y2="18"></line>
                  <line x1="12" y1="22" x2="12.01" y2="22"></line>
                  <line x1="16" y1="16" x2="16.01" y2="16"></line>
                  <line x1="16" y1="20" x2="16.01" y2="20"></line>
                </svg>
                <h3 className="text-xl font-medium mb-2">Sincronização Automática</h3>
                <p className="text-muted-foreground">
                  Seus dados são sincronizados automaticamente quando você volta a ficar online após treinar offline.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                </svg>
                <h3 className="text-xl font-medium mb-2">Treinos Personalizados</h3>
                <p className="text-muted-foreground">
                  Crie treinos personalizados com sequências de exercícios, séries, repetições e tempos de descanso.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
                </svg>
                <h3 className="text-xl font-medium mb-2">Histórico de Treinos</h3>
                <p className="text-muted-foreground">
                  Acompanhe todo seu histórico de treinos com dados detalhados de cada sessão realizada.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 6v6l4 2"></path>
                </svg>
                <h3 className="text-xl font-medium mb-2">Cronômetros Integrados</h3>
                <p className="text-muted-foreground">
                  Cronômetros para acompanhar o tempo de descanso entre séries e a duração total do treino.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
                </svg>
                <h3 className="text-xl font-medium mb-2">Exercícios Favoritos</h3>
                <p className="text-muted-foreground">
                  Marque exercícios como favoritos para acessá-los rapidamente ao criar novos treinos.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                </svg>
                <h3 className="text-xl font-medium mb-2">Biblioteca de Exercícios</h3>
                <p className="text-muted-foreground">
                  Acesse uma biblioteca completa com centenas de exercícios categorizados por grupo muscular.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
                  <line x1="12" x2="12" y1="8" y2="16"></line>
                  <line x1="8" x2="16" y1="12" y2="12"></line>
                </svg>
                <h3 className="text-xl font-medium mb-2">Treino com IA</h3>
                <p className="text-muted-foreground">
                  Gere treinos personalizados com inteligência artificial baseados em seus objetivos e equipamentos disponíveis.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <h3 className="text-xl font-medium mb-2">Personal Trainers</h3>
                <p className="text-muted-foreground">
                  Conecte-se com personal trainers profissionais que podem criar e acompanhar seus treinos personalizados.
                </p>
              </div>

              <div className="flex flex-col items-center text-center p-6 border rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-4 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
                  <path d="M13 5v2"></path>
                  <path d="M13 17v2"></path>
                  <path d="M13 11v2"></path>
                </svg>
                <h3 className="text-xl font-medium mb-2">Notificações Sonoras</h3>
                <p className="text-muted-foreground">
                  Sons específicos para marcar o fim do descanso, conclusão de série e finalização de exercícios durante o treino.
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

        {/* Nova seção de demonstração visual */}
        <section className="w-full py-12 md:py-20 bg-muted/50">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-2">Treine em Qualquer Dispositivo</h2>
              <p className="text-muted-foreground">
                O Treino na Mão funciona perfeitamente em smartphones, tablets e computadores, mantendo seus dados sincronizados em todos os seus dispositivos.
              </p>
            </div>
            
            <div className="relative mx-auto max-w-5xl">
              {/* Mockup para mostrar o app em vários dispositivos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                <div className="hidden md:block transform -rotate-6">
                  <div className="bg-background rounded-3xl overflow-hidden border shadow-lg p-1 mx-auto max-w-[220px]">
                    <div className="rounded-2xl overflow-hidden border-4 border-background">
                      <div className="relative pb-[200%] bg-gray-900">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center text-white p-4">
                            <Dumbbell className="h-10 w-10 mx-auto mb-2 text-primary" />
                            <p className="text-sm font-medium">Modo Treino em ação</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="z-10 transform scale-110">
                  <div className="bg-background rounded-3xl overflow-hidden border shadow-xl p-2 mx-auto max-w-[280px]">
                    <div className="rounded-2xl overflow-hidden">
                      <div className="relative pb-[210%] bg-gray-900">
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-center text-white p-4">
                            <h3 className="text-lg font-bold mb-3">Treino na Mão</h3>
                            <div className="mb-4 p-3 bg-gray-800 rounded-lg mx-auto w-36">
                              <Dumbbell className="h-12 w-12 mx-auto text-primary" />
                            </div>
                            <p className="text-sm">Acompanhe seus treinos em tempo real</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="hidden md:block transform rotate-6">
                  <div className="bg-background rounded-2xl overflow-hidden border shadow-lg mx-auto max-w-[320px]">
                    <div className="p-1">
                      <div className="rounded-xl overflow-hidden">
                        <div className="relative pb-[70%] bg-gray-900">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center text-white p-4">
                              <p className="text-sm font-medium mb-3">Dashboard com seus treinos</p>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-gray-800 p-2 rounded">
                                  <Dumbbell className="h-6 w-6 mx-auto text-primary mb-1" />
                                  <span className="text-xs">Treino A</span>
                                </div>
                                <div className="bg-gray-800 p-2 rounded">
                                  <Dumbbell className="h-6 w-6 mx-auto text-primary mb-1" />
                                  <span className="text-xs">Treino B</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Indicadores de funcionalidade */}
              <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                <div>
                  <div className="bg-primary/10 rounded-full p-3 w-14 h-14 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium">Treine em Qualquer Hora</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    O app está sempre disponível, mesmo offline.
                  </p>
                </div>
                
                <div>
                  <div className="bg-primary/10 rounded-full p-3 w-14 h-14 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="14" x="2" y="3" rx="2"></rect>
                      <line x1="8" x2="16" y1="21" y2="21"></line>
                      <line x1="12" x2="12" y1="17" y2="21"></line>
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium">Multi-plataforma</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Funciona em qualquer dispositivo com navegador.
                  </p>
                </div>
                
                <div>
                  <div className="bg-primary/10 rounded-full p-3 w-14 h-14 flex items-center justify-center mx-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </div>
                  <h3 className="mt-4 text-lg font-medium">Personalizável</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adapte de acordo com suas necessidades.
                  </p>
                </div>
              </div>
            </div>
            
            {/* CTA secundário */}
            <div className="mt-16 text-center">
              <Link
                href="/login" 
                className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-base font-medium text-primary-foreground shadow-md transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                Experimente Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <p className="mt-4 text-sm text-muted-foreground">
                Não é necessário cartão de crédito. Crie sua conta gratuitamente.
              </p>
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