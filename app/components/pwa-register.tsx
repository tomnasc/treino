"use client"

import { useEffect, useState } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

import { Button } from "@/app/components/ui/button"
import { useToast } from "@/app/hooks/use-toast"

export function PWARegister() {
  const { toast } = useToast()
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false)

  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator
    ) {
      const isProd = window.location.hostname !== 'localhost'
      
      // Apenas registre o service worker em produção ou se for explicitamente solicitado
      if (isProd || window.location.search.includes('pwa=true')) {
        registerServiceWorker()
      }
    }
  }, [])

  // Função para registrar o service worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js')
      
      // Verifica se há atualizações quando o serviço for registrado
      checkForUpdates(registration)
      
      // Adiciona listeners para detectar novas atualizações
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Uma nova versão foi instalada e está pronta para ser ativada
              setWaitingWorker(newWorker)
              setIsUpdateAvailable(true)
              
              notifyUpdateAvailable()
            }
          })
        }
      })
      
      console.log('Service Worker registrado com sucesso')
    } catch (error) {
      console.error('Falha ao registrar Service Worker:', error)
    }
  }
  
  // Verifica se há atualizações no service worker
  const checkForUpdates = (registration: ServiceWorkerRegistration) => {
    // Verificar periodicamente se há atualizações
    setInterval(() => {
      registration.update().catch(err => {
        console.error('Erro ao verificar atualizações do Service Worker:', err)
      })
    }, 60 * 60 * 1000) // Verifica a cada hora
  }
  
  // Notifica o usuário sobre atualizações disponíveis
  const notifyUpdateAvailable = () => {
    toast({
      title: "Atualização disponível",
      description: "Uma nova versão do aplicativo está disponível. Atualize para obter as últimas melhorias.",
      action: (
        <Button variant="default" size="sm" onClick={updateServiceWorker}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      ),
      duration: 10000, // 10 segundos
    })
  }
  
  // Atualiza o service worker para a nova versão
  const updateServiceWorker = () => {
    if (waitingWorker) {
      // Envia uma mensagem para o service worker atualizar imediatamente
      waitingWorker.postMessage({ action: 'skipWaiting' })
      
      // Recarrega a página para usar a nova versão
      window.location.reload()
      
      setIsUpdateAvailable(false)
      setWaitingWorker(null)
    }
  }

  // Monitora eventos online/offline para notificar o usuário
  useEffect(() => {
    const handleOffline = () => {
      toast({
        title: "Você está offline",
        description: "Algumas funcionalidades podem estar limitadas, mas seus treinos salvos ainda estão disponíveis.",
        variant: "destructive",
        duration: 5000,
      })
    }
    
    const handleOnline = () => {
      toast({
        title: "Conexão restaurada",
        description: "Você está online novamente. Todos os recursos estão disponíveis.",
        duration: 3000,
      })
    }
    
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  if (isUpdateAvailable) {
    return (
      <div className="fixed bottom-4 right-4 z-50 p-4 bg-primary text-primary-foreground rounded-lg shadow-lg max-w-xs">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <div className="flex-1">
            <p className="font-medium">Nova versão disponível</p>
            <p className="text-sm opacity-90">Atualize para obter as últimas melhorias</p>
          </div>
        </div>
        <Button 
          className="w-full mt-2" 
          size="sm"
          onClick={updateServiceWorker}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Atualizar agora
        </Button>
      </div>
    )
  }

  // O componente não renderiza nada na UI quando não há atualizações
  return null
} 