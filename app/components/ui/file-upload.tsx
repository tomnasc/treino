"use client"

import { useState, useRef } from "react"
import { UploadCloud, X, FileIcon, Loader2 } from "lucide-react"
import { v4 as uuidv4 } from "uuid"

import { Button } from "@/app/components/ui/button"
import { supabase } from "@/app/lib/supabase"

interface FileUploadProps {
  bucket: string
  onUploadComplete: (filePath: string, fileInfo: {
    fileName: string
    fileType: string
    fileSize: number
  }) => void
  onUploadError: (error: Error) => void
  onFileRemove?: () => void
  maxSizeMB?: number
  acceptedFileTypes?: string[] 
  userId: string
  existingFilePath?: string
  existingFileName?: string
}

export function FileUpload({
  bucket,
  onUploadComplete,
  onUploadError,
  onFileRemove,
  maxSizeMB = 5,
  acceptedFileTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "application/pdf"],
  userId,
  existingFilePath,
  existingFileName
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFile, setUploadedFile] = useState<{
    path: string;
    name: string;
    type: string;
    size: number;
  } | null>(existingFilePath && existingFileName ? {
    path: existingFilePath,
    name: existingFileName,
    type: "",
    size: 0
  } : null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      onUploadError(new Error(`O arquivo deve ter menos que ${maxSizeMB}MB`))
      return
    }

    // Validate file type
    if (!acceptedFileTypes.includes(file.type)) {
      onUploadError(new Error(`Tipo de arquivo não permitido. Tipos aceitos: ${acceptedFileTypes.join(", ")}`))
      return
    }

    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Create a unique file path with userId as folder
      const fileExt = file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false
        })

      if (error) throw error

      // Save file info
      const uploadedFileInfo = {
        path: data.path,
        name: file.name,
        type: file.type,
        size: file.size
      }

      setUploadedFile(uploadedFileInfo)
      onUploadComplete(data.path, {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      })
      
    } catch (error) {
      console.error("Erro no upload:", error)
      onUploadError(error instanceof Error ? error : new Error("Erro ao fazer upload do arquivo"))
    } finally {
      setIsUploading(false)
      setUploadProgress(100)
      
      // Reset input to allow re-uploading the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemove = async () => {
    if (!uploadedFile) return

    try {
      setIsUploading(true)
      
      // Remove file from storage
      const { error } = await supabase.storage
        .from(bucket)
        .remove([uploadedFile.path])

      if (error) throw error

      setUploadedFile(null)
      if (onFileRemove) onFileRemove()
    } catch (error) {
      console.error("Erro ao remover arquivo:", error)
      onUploadError(error instanceof Error ? error : new Error("Erro ao remover o arquivo"))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="w-full">
      {!uploadedFile ? (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:bg-gray-50 transition-colors duration-200">
          <input
            type="file"
            onChange={handleFileChange}
            className="hidden"
            ref={fileInputRef}
            accept={acceptedFileTypes.join(",")}
          />
          
          <Button 
            type="button"
            variant="outline"
            className="w-full h-24 flex flex-col items-center justify-center gap-2"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Enviando arquivo... {uploadProgress}%</span>
              </>
            ) : (
              <>
                <UploadCloud className="h-6 w-6" />
                <span>Clique ou arraste para fazer upload</span>
                <span className="text-xs text-gray-500">
                  Max: {maxSizeMB}MB ({acceptedFileTypes.map(type => type.replace('image/', '.')).join(', ')})
                </span>
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileIcon className="h-5 w-5 text-blue-500" />
            <div className="text-sm">
              <p className="font-medium truncate max-w-[200px]">{uploadedFile.name}</p>
              <p className="text-xs text-gray-500">
                {(uploadedFile.size / 1024).toFixed(0)} KB
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={handleRemove}
            disabled={isUploading}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
    </div>
  )
} 