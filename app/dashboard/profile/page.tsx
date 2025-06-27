"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Loader2, Save, User, Activity, Calendar, Ruler, Heart } from "lucide-react"

import { Button } from "@/app/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/app/components/ui/card"
import { Input } from "@/app/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/app/components/ui/form"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/components/ui/avatar"
import { PendingTrainerRequests } from "@/app/components/ui/pending-trainer-requests"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"
import { Textarea } from "@/app/components/ui/textarea"
import { Checkbox } from "@/app/components/ui/checkbox"
import { useToast } from "@/app/hooks/use-toast"
import { getCurrentUser, UserSession } from "@/app/lib/auth"
import { supabase } from "@/app/lib/supabase"
import { DeleteAccountDialog } from "@/app/components/ui/delete-account-dialog"

const profileFormSchema = z.object({
  fullName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(50),
  email: z.string().email("Email inválido").min(5, "Email muito curto").max(100),
})

const physicalProfileSchema = z.object({
  height: z.string().optional(),
  weight: z.string().optional(),
  birth_date: z.string().optional(),
  gender: z.string().optional(),
  body_fat_percentage: z.string().optional(),
  muscle_mass: z.string().optional(),
  chest_measurement: z.string().optional(),
  waist_measurement: z.string().optional(),
  hip_measurement: z.string().optional(),
  arm_measurement: z.string().optional(),
  thigh_measurement: z.string().optional(),
  neck_measurement: z.string().optional(),
  resting_heart_rate: z.string().optional(),
  blood_pressure_systolic: z.string().optional(),
  blood_pressure_diastolic: z.string().optional(),
  activity_level: z.string().optional(),
  fitness_goals: z.array(z.string()).optional(),
  medical_conditions: z.string().optional(),
  medications: z.string().optional(),
  injuries_limitations: z.string().optional(),
  notes: z.string().optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>
type PhysicalProfileValues = z.infer<typeof physicalProfileSchema>

interface PhysicalProfile {
  id?: string
  height?: number
  weight?: number
  birth_date?: string
  gender?: string
  body_fat_percentage?: number
  muscle_mass?: number
  chest_measurement?: number
  waist_measurement?: number
  hip_measurement?: number
  arm_measurement?: number
  thigh_measurement?: number
  neck_measurement?: number
  resting_heart_rate?: number
  blood_pressure_systolic?: number
  blood_pressure_diastolic?: number
  activity_level?: string
  fitness_goals?: string
  medical_conditions?: string
  medications?: string
  injuries_limitations?: string
  notes?: string
}

const fitnessGoalsOptions = [
  { id: "perda_peso", label: "Perda de peso" },
  { id: "ganho_massa", label: "Ganho de massa muscular" },
  { id: "definicao", label: "Definição muscular" },
  { id: "resistencia", label: "Melhora da resistência" },
  { id: "forca", label: "Aumento de força" },
  { id: "flexibilidade", label: "Melhora da flexibilidade" },
  { id: "saude_geral", label: "Saúde geral" },
  { id: "condicionamento", label: "Condicionamento físico" },
]

export default function ProfilePage() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmittingPhysical, setIsSubmittingPhysical] = useState(false)
  const [memberSince, setMemberSince] = useState<string>("")
  const [physicalProfile, setPhysicalProfile] = useState<PhysicalProfile | null>(null)
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const router = useRouter()
  const { toast } = useToast()

  // Obter dados do usuário
  useEffect(() => {
    fetchUserData()
  }, [router])
  
  async function fetchUserData() {
    try {
      const currentUser = await getCurrentUser()
      if (!currentUser) {
        router.push("/login")
        return
      }
      
      setUser(currentUser)
      
      // Buscar a data de criação do perfil
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("id", currentUser.id)
        .single()
      
      if (profileData?.created_at) {
        const createdDate = new Date(profileData.created_at);
        setMemberSince(createdDate.toLocaleDateString("pt-BR"));
      } else {
        setMemberSince("N/A");
      }
      
      // Buscar perfil físico
      const { data: physicalData, error: physicalError } = await supabase
        .from("physical_profiles")
        .select("*")
        .eq("user_id", currentUser.id)
        .maybeSingle()
      
      if (physicalError && physicalError.code !== 'PGRST116') {
        console.error("Erro ao buscar perfil físico:", physicalError)
      }
      
      if (physicalData) {
        setPhysicalProfile(physicalData)
        // Converter string de goals separada por vírgula para array
        const goalsArray = physicalData.fitness_goals ? physicalData.fitness_goals.split(',') : []
        setSelectedGoals(goalsArray)
        physicalForm.reset({
          height: physicalData.height?.toString() || "",
          weight: physicalData.weight?.toString() || "",
          birth_date: physicalData.birth_date || "",
          gender: physicalData.gender || "",
          body_fat_percentage: physicalData.body_fat_percentage?.toString() || "",
          muscle_mass: physicalData.muscle_mass?.toString() || "",
          chest_measurement: physicalData.chest_measurement?.toString() || "",
          waist_measurement: physicalData.waist_measurement?.toString() || "",
          hip_measurement: physicalData.hip_measurement?.toString() || "",
          arm_measurement: physicalData.arm_measurement?.toString() || "",
          thigh_measurement: physicalData.thigh_measurement?.toString() || "",
          neck_measurement: physicalData.neck_measurement?.toString() || "",
          resting_heart_rate: physicalData.resting_heart_rate?.toString() || "",
          blood_pressure_systolic: physicalData.blood_pressure_systolic?.toString() || "",
          blood_pressure_diastolic: physicalData.blood_pressure_diastolic?.toString() || "",
          activity_level: physicalData.activity_level || "",
          medical_conditions: physicalData.medical_conditions || "",
          medications: physicalData.medications || "",
          injuries_limitations: physicalData.injuries_limitations || "",
          notes: physicalData.notes || "",
        })
      }
      
      form.reset({
        fullName: currentUser.fullName || "",
        email: currentUser.email
      })
      
      setLoading(false)
    } catch (error) {
      console.error("Erro ao carregar dados do usuário:", error)
      toast({
        title: "Erro ao carregar perfil",
        description: "Não foi possível carregar os dados do seu perfil. Tente novamente.",
        variant: "destructive",
      })
      setLoading(false)
    }
  }

  // Formulário de perfil básico
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
  })

  // Formulário de perfil físico
  const physicalForm = useForm<PhysicalProfileValues>({
    resolver: zodResolver(physicalProfileSchema),
    defaultValues: {
      height: "",
      weight: "",
      birth_date: "",
      gender: "",
      body_fat_percentage: "",
      muscle_mass: "",
      chest_measurement: "",
      waist_measurement: "",
      hip_measurement: "",
      arm_measurement: "",
      thigh_measurement: "",
      neck_measurement: "",
      resting_heart_rate: "",
      blood_pressure_systolic: "",
      blood_pressure_diastolic: "",
      activity_level: "",
      medical_conditions: "",
      medications: "",
      injuries_limitations: "",
      notes: "",
    },
  })

  // Função para atualizar perfil básico
  async function onSubmit(data: ProfileFormValues) {
    if (!user) return
    
    setIsSubmitting(true)
    
    try {
      // Atualizar o perfil no Supabase
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: data.fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
      
      if (error) throw error
      
      // Atualizar o estado local
      setUser({
        ...user,
        fullName: data.fullName,
      })
      
      toast({
        title: "Perfil atualizado",
        description: "Seu perfil foi atualizado com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao atualizar perfil:", error)
      toast({
        title: "Erro ao atualizar perfil",
        description: "Não foi possível atualizar seu perfil. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Função para atualizar perfil físico
  async function onSubmitPhysical(data: PhysicalProfileValues) {
    if (!user) return
    
    setIsSubmittingPhysical(true)
    
    try {
      const physicalData = {
        user_id: user.id,
        height: data.height ? parseFloat(data.height) : null,
        weight: data.weight ? parseFloat(data.weight) : null,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        body_fat_percentage: data.body_fat_percentage ? parseFloat(data.body_fat_percentage) : null,
        muscle_mass: data.muscle_mass ? parseFloat(data.muscle_mass) : null,
        chest_measurement: data.chest_measurement ? parseFloat(data.chest_measurement) : null,
        waist_measurement: data.waist_measurement ? parseFloat(data.waist_measurement) : null,
        hip_measurement: data.hip_measurement ? parseFloat(data.hip_measurement) : null,
        arm_measurement: data.arm_measurement ? parseFloat(data.arm_measurement) : null,
        thigh_measurement: data.thigh_measurement ? parseFloat(data.thigh_measurement) : null,
        neck_measurement: data.neck_measurement ? parseFloat(data.neck_measurement) : null,
        resting_heart_rate: data.resting_heart_rate ? parseInt(data.resting_heart_rate) : null,
        blood_pressure_systolic: data.blood_pressure_systolic ? parseInt(data.blood_pressure_systolic) : null,
        blood_pressure_diastolic: data.blood_pressure_diastolic ? parseInt(data.blood_pressure_diastolic) : null,
        activity_level: data.activity_level || null,
        fitness_goals: selectedGoals.length > 0 ? selectedGoals.join(',') : null,
        medical_conditions: data.medical_conditions || null,
        medications: data.medications || null,
        injuries_limitations: data.injuries_limitations || null,
        notes: data.notes || null,
      }

      let error
      if (physicalProfile?.id) {
        // Atualizar perfil existente
        const result = await supabase
          .from("physical_profiles")
          .update(physicalData)
          .eq("id", physicalProfile.id)
        error = result.error
      } else {
        // Criar novo perfil usando upsert
        const result = await supabase
          .from("physical_profiles")
          .upsert(physicalData, {
            onConflict: 'user_id'
          })
        error = result.error
      }
      
      if (error) throw error
      
      // Recarregar dados
      await fetchUserData()
      
      toast({
        title: "Perfil físico atualizado",
        description: "Seus dados físicos foram atualizados com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao atualizar perfil físico:", error)
      toast({
        title: "Erro ao atualizar perfil físico",
        description: "Não foi possível atualizar seus dados físicos. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingPhysical(false)
    }
  }

  // Função para calcular idade
  const calculateAge = (birthDate: string) => {
    const today = new Date()
    const birth = new Date(birthDate)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }

  // Função para calcular IMC
  const calculateBMI = (height: number, weight: number) => {
    const heightInMeters = height / 100
    return (weight / (heightInMeters * heightInMeters)).toFixed(1)
  }

  // Função para obter iniciais do nome para o avatar
  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const userInitials = getInitials(user?.fullName)

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">Perfil</h1>
      <p className="text-muted-foreground">
        Gerencie suas informações pessoais e dados físicos para uma experiência personalizada.
      </p>

      {user && <PendingTrainerRequests userId={user.id} onRequestHandled={fetchUserData} />}

      {/* Perfil Básico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações do Perfil
          </CardTitle>
          <CardDescription>
            Atualize suas informações pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4 mb-6 sm:flex-row sm:space-y-0 sm:space-x-4 sm:items-start">
            <Avatar className="h-24 w-24">
              <AvatarImage src={user?.avatarUrl || ""} alt={user?.fullName || user?.email || ""} />
              <AvatarFallback className="text-xl">{userInitials}</AvatarFallback>
            </Avatar>
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-medium">{user?.fullName || "Usuário"}</h3>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <p className="text-sm mt-1">
                Membro desde {memberSince || "N/A"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Assinatura: {
                  user?.role === "admin" ? "Admin" :
                  user?.role === "personal" ? "Personal" :
                  user?.role === "premium" ? "Premium" : 
                  "Gratuita"
                }
              </p>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="seu@email.com" 
                        {...field} 
                        disabled 
                        title="Não é possível alterar o email"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar alterações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Perfil Físico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Perfil Físico
          </CardTitle>
          <CardDescription>
            Dados para avaliação física, acompanhamento de evolução e personalização de treinos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Resumo dos dados atuais */}
          {physicalProfile && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-3">Resumo dos seus dados:</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                {physicalProfile.height && physicalProfile.weight && (
                  <div>
                    <span className="text-muted-foreground">IMC:</span>
                    <p className="font-medium">{calculateBMI(physicalProfile.height, physicalProfile.weight)}</p>
                  </div>
                )}
                {physicalProfile.birth_date && (
                  <div>
                    <span className="text-muted-foreground">Idade:</span>
                    <p className="font-medium">{calculateAge(physicalProfile.birth_date)} anos</p>
                  </div>
                )}
                {physicalProfile.height && (
                  <div>
                    <span className="text-muted-foreground">Altura:</span>
                    <p className="font-medium">{physicalProfile.height} cm</p>
                  </div>
                )}
                {physicalProfile.weight && (
                  <div>
                    <span className="text-muted-foreground">Peso:</span>
                    <p className="font-medium">{physicalProfile.weight} kg</p>
                  </div>
                )}
              </div>
            </div>
          )}

          <Form {...physicalForm}>
            <form onSubmit={physicalForm.handleSubmit(onSubmitPhysical)} className="space-y-6">
              {/* Dados Básicos */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Dados Básicos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={physicalForm.control}
                    name="height"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Altura (cm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 175"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="weight"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peso (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 70"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="birth_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gênero</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                            <SelectItem value="prefiro_nao_informar">Prefiro não informar</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Composição Corporal */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Composição Corporal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={physicalForm.control}
                    name="body_fat_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentual de Gordura (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 15.5"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="muscle_mass"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Massa Muscular (kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 45"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Medidas Corporais */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Ruler className="h-4 w-4" />
                  Medidas Corporais (cm)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField
                    control={physicalForm.control}
                    name="chest_measurement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Peito</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 100"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="waist_measurement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cintura</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 80"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="hip_measurement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quadril</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 95"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="arm_measurement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Braço</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 35"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="thigh_measurement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coxa</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 55"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="neck_measurement"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pescoço</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            placeholder="Ex: 40"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Dados de Saúde */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Dados de Saúde
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={physicalForm.control}
                    name="resting_heart_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>FC Repouso (bpm)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 65"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="blood_pressure_systolic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pressão Sistólica</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 120"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="blood_pressure_diastolic"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pressão Diastólica</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Ex: 80"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Nível de Atividade e Objetivos */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Atividade e Objetivos</h3>
                
                <FormField
                  control={physicalForm.control}
                  name="activity_level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível de Atividade Atual</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione seu nível de atividade..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sedentario">Sedentário (pouco ou nenhum exercício)</SelectItem>
                          <SelectItem value="leve">Levemente ativo (exercícios leves 1-3 dias/semana)</SelectItem>
                          <SelectItem value="moderado">Moderadamente ativo (exercícios moderados 3-5 dias/semana)</SelectItem>
                          <SelectItem value="intenso">Muito ativo (exercícios intensos 6-7 dias/semana)</SelectItem>
                          <SelectItem value="muito_intenso">Extremamente ativo (exercícios muito intensos, trabalho físico)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel>Objetivos Fitness</FormLabel>
                  <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                    {fitnessGoalsOptions.map((goal) => (
                      <div key={goal.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={goal.id}
                          checked={selectedGoals.includes(goal.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedGoals([...selectedGoals, goal.id])
                            } else {
                              setSelectedGoals(selectedGoals.filter(g => g !== goal.id))
                            }
                          }}
                        />
                        <label
                          htmlFor={goal.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {goal.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Histórico Médico */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Histórico Médico</h3>
                <div className="space-y-4">
                  <FormField
                    control={physicalForm.control}
                    name="medical_conditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condições Médicas</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Informe condições médicas relevantes (diabetes, hipertensão, etc.)"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="medications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicamentos</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Liste medicamentos que está tomando atualmente"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="injuries_limitations"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lesões e Limitações</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva lesões passadas ou limitações físicas atuais"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={physicalForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações Adicionais</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Qualquer informação adicional relevante"
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isSubmittingPhysical}>
                  {isSubmittingPhysical ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar perfil físico
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Zona de Perigo */}
      <Card>
        <CardHeader>
          <CardTitle>Zona de perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis para sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Excluir sua conta removerá permanentemente todos os seus dados pessoais, treinos criados e histórico de atividades.
            Esta ação não pode ser desfeita.
          </p>
          
          {user && <DeleteAccountDialog userId={user.id} userEmail={user.email} />}
        </CardContent>
      </Card>
    </div>
  )
} 