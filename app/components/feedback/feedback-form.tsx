"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BugIcon, MessageSquarePlus, Lightbulb, Loader2 } from "lucide-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form"
import { Textarea } from "@/app/components/ui/textarea"
import { Input } from "@/app/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/app/components/ui/radio-group"
import { toast } from "@/app/hooks/use-toast"
import { FileUpload } from "@/app/components/ui/file-upload"
import { supabase } from "@/app/lib/supabase"
import { FeedbackType } from "@/app/types/database.types"

const formSchema = z.object({
  title: z.string().min(3, {
    message: "O título deve ter pelo menos 3 caracteres",
  }),
  description: z.string().min(10, {
    message: "A descrição deve ter pelo menos 10 caracteres",
  }),
  type: z.enum(["error", "suggestion", "other"]),
})

type FormValues = z.infer<typeof formSchema>

interface FeedbackFormProps {
  userId: string
}

export function FeedbackForm({ userId }: FeedbackFormProps) {
  const router = useRouter()
  const [attachment, setAttachment] = useState<{
    path: string
    fileName: string
    fileType: string
    fileSize: number
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "suggestion",
    },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true)

      // Inserir feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedbacks")
        .insert({
          user_id: userId,
          title: values.title,
          description: values.description,
          type: values.type as FeedbackType,
          status: "open",
        })
        .select()
        .single()

      if (feedbackError) throw feedbackError

      // Se houver anexo, inserir na tabela feedback_attachments
      if (attachment) {
        const { error: attachmentError } = await supabase
          .from("feedback_attachments")
          .insert({
            feedback_id: feedbackData.id,
            file_path: attachment.path,
            file_name: attachment.fileName,
            file_type: attachment.fileType,
            file_size: attachment.fileSize,
          })

        if (attachmentError) throw attachmentError
      }

      toast({
        title: "Feedback enviado",
        description: "Agradecemos seu feedback! Ele será analisado por nossa equipe.",
      })

      // Redirecionar para a página de feedback se existir
      router.push("/dashboard/feedback")
      router.refresh()
    } catch (error) {
      console.error("Erro ao enviar feedback:", error)
      toast({
        title: "Erro ao enviar feedback",
        description: "Houve um problema ao enviar seu feedback. Por favor, tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileUploadComplete = (filePath: string, fileInfo: { fileName: string; fileType: string; fileSize: number }) => {
    setAttachment({
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
        <CardTitle>Enviar Feedback</CardTitle>
        <CardDescription>
          Encontrou um erro ou tem uma sugestão? Nos conte para que possamos melhorar a plataforma.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Tipo de feedback</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-1"
                    >
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="error" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-1">
                          <BugIcon className="h-4 w-4" />
                          <span>Erro</span>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="suggestion" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-1">
                          <Lightbulb className="h-4 w-4" />
                          <span>Sugestão</span>
                        </FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="other" />
                        </FormControl>
                        <FormLabel className="font-normal flex items-center gap-1">
                          <MessageSquarePlus className="h-4 w-4" />
                          <span>Outro</span>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título do feedback" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o problema ou sugestão em detalhes..."
                      className="resize-none min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Anexo (opcional)</FormLabel>
              <FileUpload
                bucket="feedback-attachments"
                onUploadComplete={handleFileUploadComplete}
                onUploadError={handleFileUploadError}
                userId={userId}
                acceptedFileTypes={["image/png", "image/jpeg", "image/jpg", "image/gif", "application/pdf"]}
                maxSizeMB={5}
              />
              <p className="text-xs text-gray-500">
                Anexe uma captura de tela ou documento relacionado ao seu feedback. (Max: 5MB)
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
                "Enviar Feedback"
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  )
} 