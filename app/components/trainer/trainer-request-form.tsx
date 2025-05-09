"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dumbbell, Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form"
import { Textarea } from "@/app/components/ui/textarea"
import { toast } from "@/app/hooks/use-toast"
import { FileUpload } from "@/app/components/ui/file-upload"
import { supabase } from "@/app/lib/supabase"

const formSchema = z.object({
  description: z.string().min(50, {
    message: "A descrição deve ter pelo menos 50 caracteres",
  }),
})

type FormValues = z.infer<typeof formSchema>

interface TrainerRequestFormProps {
  userId: string
}

export function TrainerRequestForm({ userId }: TrainerRequestFormProps) {
  const router = useRouter()
  const [certification, setCertification] = useState<{
    path: string
    fileName: string
    fileType: string
    fileSize: number
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasExistingRequest, setHasExistingRequest] = useState(false)
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  })

  // Verificar se já existe uma solicitação pendente
  const checkExistingRequest = async () => {
    try {
      const { data, error } = await supabase
        .from("trainer_requests")
        .select("id, status")
        .eq("user_id", userId)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle()
      
      if (error) throw error
      
      if (data) {
        setHasExistingRequest(true)
        form.reset()
        toast({
          title: "Solicitação em análise",
          description: "Você já possui uma solicitação pendente para se tornar personal trainer.",
        })
      }
    } catch (error) {
      console.error("Erro ao verificar solicitações existentes:", error)
    }
  }
  
  // Verificar solicitações na montagem do componente
  useEffect(() => {
    checkExistingRequest()
  }, []) // empty dependency array

  const onSubmit = async (values: FormValues) => {
    // Se já existe uma solicitação, não permitir enviar outra
    if (hasExistingRequest) {
      toast({
        title: "Solicitação em análise",
        description: "Você já possui uma solicitação pendente. Aguarde a análise da nossa equipe.",
        variant: "destructive",
      })
      return
    }
    
    // Verificar se o certificado foi anexado
    if (!certification) {
      toast({
        title: "Certificado necessário",
        description: "Por favor, anexe o seu certificado ou diploma de formação.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      // Enviar solicitação
      const { error } = await supabase
        .from("trainer_requests")
        .insert({
          user_id: userId,
          description: values.description,
          certification_file_path: certification.path,
          certification_file_name: certification.fileName,
          certification_file_type: certification.fileType,
          certification_file_size: certification.fileSize,
          status: "pending",
        })

      if (error) throw error

      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação para se tornar personal trainer foi enviada com sucesso. Você receberá uma resposta em breve.",
      })

      setHasExistingRequest(true)
      form.reset()
    } catch (error) {
      console.error("Erro ao enviar solicitação:", error)
      toast({
        title: "Erro ao enviar solicitação",
        description: "Houve um problema ao enviar sua solicitação. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUploadComplete = (filePath: string, fileInfo: { fileName: string; fileType: string; fileSize: number }) => {
    setCertification({
      path: filePath,
      fileName: fileInfo.fileName,
      fileType: fileInfo.fileType,
      fileSize: fileInfo.fileSize,
    })
  }

  const handleFileUploadError = (error: Error) => {
    toast({
      title: "Erro no upload",
      description: error.message,
      variant: "destructive",
    })
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5" />
          <span>Tornar-se Personal Trainer</span>
        </CardTitle>
        <CardDescription>
          Envie sua solicitação para se tornar um personal trainer em nossa plataforma. Compartilhe seus conhecimentos e expanda sua base de clientes.
        </CardDescription>
      </CardHeader>
      
      {hasExistingRequest ? (
        <CardContent>
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-300">Solicitação em análise</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
              Sua solicitação está sendo analisada por nossa equipe. Você receberá uma resposta por e-mail assim que concluirmos a análise.
            </p>
          </div>
        </CardContent>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Por que você quer se tornar um personal trainer?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva sua experiência, formação e motivos para se tornar um personal trainer em nossa plataforma..."
                        className="resize-none min-h-[180px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Certificado ou Diploma (obrigatório)</FormLabel>
                <FileUpload
                  bucket="trainer-certifications"
                  onUploadComplete={handleFileUploadComplete}
                  onUploadError={handleFileUploadError}
                  userId={userId}
                  acceptedFileTypes={["image/png", "image/jpeg", "image/jpg", "application/pdf"]}
                  maxSizeMB={10}
                />
                <p className="text-xs text-gray-500">
                  Anexe seu certificado ou diploma de formação em Educação Física ou área correlata. (Max: 10MB)
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar Solicitação"
                )}
              </Button>
            </CardFooter>
          </form>
        </Form>
      )}
    </Card>
  )
} 