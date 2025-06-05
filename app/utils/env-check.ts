/**
 * Verificação de variáveis de ambiente essenciais
 */

export function checkRequiredEnvVars() {
  // Verificar se estamos em ambiente de desenvolvimento
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Em desenvolvimento no lado do cliente, não mostrar erros
  if (isDevelopment && typeof window !== 'undefined') {
    return true;
  }
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  // Em ambiente de desenvolvimento, apenas verifique as variáveis públicas no cliente
  const varsToCheck = typeof window !== 'undefined'
    ? requiredVars.filter(v => v.startsWith('NEXT_PUBLIC_'))
    : requiredVars;
  
  const missingVars = varsToCheck.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    // Em desenvolvimento, apenas registrar no console, não mostrar erros UI
    if (isDevelopment) {
      console.log(`⚠️ Informativo: Variáveis de ambiente ausentes: ${missingVars.join(', ')}`);
      console.log('Adicione estas variáveis ao seu arquivo .env.local para funcionalidades completas');
      
      if (missingVars.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.log(`
          ℹ️ SUPABASE_SERVICE_ROLE_KEY é necessária para funcionalidades administrativas.
          Você pode obtê-la no dashboard do Supabase em:
          Configurações do Projeto > API > service_role key (secret)
        `);
      }
      
      // Em desenvolvimento, permitimos continuar mesmo com variáveis ausentes
      return true;
    } else {
      // Em produção, registrar erros e alertar
      console.error(`⚠️ Variáveis de ambiente ausentes: ${missingVars.join(', ')}`);
      console.error('Por favor, adicione estas variáveis ao seu arquivo .env.local');
      
      if (missingVars.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.error(`
          ⚠️ SUPABASE_SERVICE_ROLE_KEY é necessária para funcionalidades administrativas.
          Você pode obtê-la no dashboard do Supabase em:
          Configurações do Projeto > API > service_role key (secret)
        `);
      }
      
      return false;
    }
  }
  
  return true;
} 