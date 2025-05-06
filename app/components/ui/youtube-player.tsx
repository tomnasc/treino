"use client"

import { useState } from "react"
import { Youtube, Video } from "lucide-react"
import { Button } from "@/app/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog"

interface YouTubePlayerProps {
  url: string | null | undefined
  label?: string
  buttonVariant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link"
  buttonSize?: "default" | "sm" | "lg" | "icon"
  iconOnly?: boolean
  className?: string
  id?: string
}

export function YouTubePlayer({ 
  url, 
  label = "Ver demonstração", 
  buttonVariant = "ghost", 
  buttonSize = "sm", 
  iconOnly = false,
  className = "",
  id
}: YouTubePlayerProps) {
  const [open, setOpen] = useState(false)
  
  // Se não tiver URL, não renderiza nada
  if (!url) {
    return null
  }
  
  // Extrair o ID do vídeo da URL do YouTube
  const getYouTubeVideoId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return (match && match[2].length === 11) ? match[2] : null
  }
  
  const videoId = getYouTubeVideoId(url)
  
  if (!videoId) {
    return null
  }
  
  return (
    <>
      <Button 
        variant={buttonVariant}
        size={buttonSize}
        onClick={() => setOpen(true)}
        className={className}
        id={id}
      >
        <Video className={`h-4 w-4 ${!iconOnly ? "mr-2" : ""}`} />
        {!iconOnly && <span className={buttonSize === "sm" ? "text-xs" : ""}>{label}</span>}
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Demonstração do Exercício</DialogTitle>
          </DialogHeader>
          <div className="aspect-video w-full pt-1 px-1 pb-4">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
              className="w-full h-full"
              frameBorder="0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 