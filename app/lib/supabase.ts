import { createClient } from '@supabase/supabase-js'
import { Database } from '@/app/types/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ywikavfswkvqgwueukgm.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3aWthdmZzd2t2cWd3dWV1a2dtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0ODAxNTQsImV4cCI6MjA2MjA1NjE1NH0._sQUJsdrjSUOP4R2nSaCRBJaE_-PkbHvwRHg_G4dGxQ'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Verificar a saúde da conexão com o Supabase
export async function checkSupabaseConnection() {
  try {
    // Tentativa simples de fazer uma requisição ao Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
      .single();
    
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Aviso: Verificação de conexão com Supabase falhou silenciosamente.');
      }
      return false;
    }
    
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Aviso: Exceção na verificação de conexão com Supabase.');
    }
    return false;
  }
}

// Verificar o status do projeto Supabase de forma mais completa
// evitando qualquer requisição que possa gerar erro no console
export async function checkSupabaseProjectStatus() {
  try {
    // Desativar log original do console para evitar mensagens de erro
    const originalConsoleError = console.error;
    console.error = () => {};
    
    // Verificações em paralelo para ser mais rápido
    const results = await Promise.allSettled([
      // 1. Verificar se conseguimos buscar a sessão (auth)
      supabase.auth.getSession(),
      
      // 2. Verificar se conseguimos acessar a tabela profiles
      supabase.from('profiles').select('count')
    ]);
    
    // Restaurar o console.error
    console.error = originalConsoleError;
    
    // Analisar resultados
    const authOk = results[0].status === 'fulfilled';
    const tableOk = results[1].status === 'fulfilled';
    
    // Status consolidado do projeto
    const status = {
      authServiceOk: authOk,
      tableAccessOk: tableOk
    };
    
    // Checar o status geral
    const isOk = authOk && tableOk;
    
    // Apenas para depuração em desenvolvimento, sem usar console.error
    if (!isOk && process.env.NODE_ENV === 'development') {
      console.log('Aviso: Status do projeto Supabase:', status);
    }
    
    // Retornar resultado sem gerar erros no console
    return {
      isOk,
      issues: {
        authService: !authOk,
        tableAccess: !tableOk
      }
    };
  } catch (error) {
    // Não logar erros para não poluir o console
    return { 
      isOk: false, 
      issues: { 
        connectionError: true 
      }
    };
  }
} 