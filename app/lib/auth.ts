import { supabase } from '@/app/lib/supabase'
import { Profile, UserRole } from '@/app/types/database.types'
import { createClient } from '@supabase/supabase-js'

// Obter URL e chave do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ywikavfswkvqgwueukgm.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3aWthdmZzd2t2cWd3dWV1a2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODAxNTQsImV4cCI6MjA2MjA1NjE1NH0._sQUJsdrjSUOP4R2nSaCRBJaE_-PkbHvwRHg_G4dGxQ'

export interface UserSession {
  id: string
  email: string
  role: UserRole
  fullName?: string
  avatarUrl?: string
  personalId?: string
}

// Função melhorada para cadastro de usuários com tratamento de erros
export async function signUp(email: string, password: string, retryCount = 0) {
  try {
    // Verificar se o usuário já existe antes de tentar criar
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    if (checkError) {
      console.error('Erro ao verificar usuário existente:', checkError);
    }
    
    // Se o usuário já existir no banco, retornar um erro específico
    if (existingUser) {
      throw new Error('Este email já está cadastrado.');
    }
    
    // Abordagem alternativa: criar usuário usando a API REST do Supabase diretamente
    // Isso evita alguns problemas com o SDK que podem causar o erro Database error saving new user
    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/login?verified=true`
          }
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Verificar se o usuário tem id (está registrado)
        if (data.user && data.user.id) {
          // Garantir que o perfil seja criado (caso o trigger não funcione)
          await createProfileForUser(data.user.id, email);
        }
        
        return { user: data, session: null };
      } else {
        // Se ainda recebermos um erro usando a API REST, voltamos para o SDK
        // com uma abordagem simplificada (sem opções adicionais)
        console.warn('Falha na API REST, tentando SDK simplificado');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) {
          throw error;
        }
        
        // Garantir que o perfil seja criado
        if (data.user) {
          await createProfileForUser(data.user.id, email);
        }
        
        return data;
      }
    } catch (fetchError) {
      console.error('Erro na tentativa REST:', fetchError);
      
      // Última alternativa: usar a abordagem original do SDK
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?verified=true`
        }
      });
      
      if (error) {
        // Se o erro for de banco de dados e ainda estamos dentro do limite de tentativas
        if (error.message.includes('Database error') && retryCount < 2) {
          console.warn(`Tentativa ${retryCount + 1} falhou, tentando novamente...`);
          // Esperar 1 segundo antes de tentar novamente
          await new Promise(resolve => setTimeout(resolve, 1000));
          return signUp(email, password, retryCount + 1);
        }
        
        throw error;
      }
      
      // Garantir que o perfil seja criado
      if (data.user) {
        await createProfileForUser(data.user.id, email);
      }
      
      return data;
    }
  } catch (error) {
    console.error('Erro completo no cadastro:', error);
    throw error;
  }
}

// Função auxiliar para criar o perfil de usuário
// Usando SQL direto para evitar problemas de tipagem
async function createProfileForUser(userId: string, email: string) {
  try {
    // Verificar se o perfil já existe
    const { data: existingProfile, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error('Erro ao verificar perfil existente:', checkError);
    }
    
    // Se o perfil não existir, criar via SQL direto para evitar erros de tipagem
    if (!existingProfile) {
      const { error } = await supabase.rpc('create_user_profile', {
        user_id: userId,
        user_email: email
      });
      
      if (error) {
        console.error('Erro ao criar perfil via RPC:', error);
        
        // Fallback: inserção direta
        try {
          const defaultRole: UserRole = 'free';
          await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: email,
              role: defaultRole,
              created_at: new Date().toISOString()
            });
        } catch (insertError) {
          console.error('Erro no fallback de criação de perfil:', insertError);
        }
      }
    }
  } catch (err) {
    console.error('Erro ao criar perfil:', err);
    // Não lançamos o erro para não interromper o fluxo de registro
  }
}

export async function signIn(email: string, password: string) {
  // Primeiro, verificar se o email existe e se o usuário está suspenso
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_suspended')
    .eq('email', email)
    .maybeSingle()

  // Se encontrou o perfil e o usuário está suspenso
  if (profile && profile.is_suspended) {
    throw new Error("Sua conta está suspensa. Entre em contato com o suporte para mais informações.")
  }

  // Prosseguir com o login normal
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  // Após login bem-sucedido, atualizar o último login
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', data.user.id)
      .then(({ error }) => {
        if (error) console.error('Erro ao atualizar último login:', error)
      })
  }

  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({
    password,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function getCurrentUser(): Promise<UserSession | null> {
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('Error fetching session:', error.message)
    return null
  }

  if (!session) {
    return null
  }

  // Fetch profile data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError.message)
    return null
  }

  // Função para garantir que o valor de role seja um dos tipos válidos
  const validateRole = (role: string | null): UserRole => {
    if (role === 'free' || role === 'premium' || role === 'personal' || role === 'admin') {
      return role;
    }
    return 'free'; // Valor padrão
  };

  return {
    id: session.user.id,
    email: session.user.email || '',
    role: validateRole((profile as Profile).role),
    fullName: (profile as Profile).full_name || undefined,
    avatarUrl: (profile as Profile).avatar_url || undefined,
    personalId: (profile as Profile).personal_id || undefined,
  }
}

export async function updateProfile(userId: string, updates: {
  fullName?: string,
  avatarUrl?: string,
  role?: UserRole,
  personalId?: string,
}) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      full_name: updates.fullName,
      avatar_url: updates.avatarUrl,
      role: updates.role,
      personal_id: updates.personalId,
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function deleteUser(userId: string) {
  try {
    // Usando a API de Admin do Supabase para deletar o usuário
    // Esta operação só funciona em ambiente de desenvolvimento local ou
    // com funções Edge/Serveless no ambiente de produção
    const { error } = await supabase.auth.admin.deleteUser(userId)
    
    if (error) throw error
    
    return { success: true }
  } catch (error: any) {
    console.error('Erro ao deletar usuário:', error)
    throw new Error(error.message || 'Falha ao deletar o usuário')
  }
} 