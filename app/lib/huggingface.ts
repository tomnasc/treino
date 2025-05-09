import { HfInference } from '@huggingface/inference';

// Inicializar o cliente HuggingFace
const hf = new HfInference(process.env.NEXT_PUBLIC_HUGGINGFACE_API_KEY || '');

export interface WorkoutGenerationInput {
  goal: string;
  experienceLevel: string;
  frequency: number;
  sessionDuration: number;
  equipment: string[];
  healthConditions?: string;
  preferences?: string;
}

export async function generateWorkoutPlan(input: WorkoutGenerationInput): Promise<string> {
  try {
    const prompt = `
Crie um plano de treino personalizado com as seguintes características:

Objetivo principal: ${input.goal}
Nível de experiência: ${input.experienceLevel}
Frequência semanal: ${input.frequency} dias por semana
Duração da sessão: ${input.sessionDuration} minutos
Equipamentos disponíveis: ${input.equipment.join(', ')}
${input.healthConditions ? `Condições de saúde/limitações: ${input.healthConditions}` : ''}
${input.preferences ? `Preferências específicas: ${input.preferences}` : ''}

Por favor, formate o plano de treino da seguinte maneira:

NOME DO TREINO: [nome criativo e descritivo]

DESCRIÇÃO: [breve descrição do objetivo e benefícios deste treino]

DIVISÃO SEMANAL:
[descreva a divisão semanal, ex: Dia 1: Peito e Tríceps, Dia 2: Costas e Bíceps, etc.]

EXERCÍCIOS:
[Para cada dia, liste os exercícios no formato:
- Nome do exercício | 3 séries x 12 repetições | 60s descanso | Peso sugerido: variável ou kg específico]

OBSERVAÇÕES:
[Dicas específicas para este treino]

Forneça apenas o plano de treino formatado exatamente como solicitado acima, sem comentários adicionais.
`;

    try {
      const response = await hf.textGeneration({
        model: 'mistralai/Mixtral-8x7B-Instruct-v0.1',
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.7,
          top_p: 0.95,
          repetition_penalty: 1.2,
        }
      });

      return response.generated_text || '';
    } catch (apiError) {
      console.error('Erro na API do Hugging Face:', apiError);
      
      // Verificar se é um erro de limite de créditos/pagamento
      const errorString = typeof apiError === 'object' && apiError !== null ? 
        String(apiError) : 
        typeof apiError === 'string' ? 
          apiError : 
          'Unknown error';
          
      const errorMsg = errorString.toLowerCase();
      
      if (errorMsg.includes('payment required') || 
          errorMsg.includes('402') || 
          errorMsg.includes('exceeded') || 
          errorMsg.includes('credits')) {
        console.log('Limite de API excedido, usando gerador de treino de fallback');
        return generateFallbackWorkout(input);
      }
      
      throw apiError;
    }
  } catch (error) {
    console.error('Erro ao gerar plano de treino:', error);
    throw new Error('Não foi possível gerar o plano de treino. Tente novamente mais tarde.');
  }
}

// Função de fallback para gerar um treino quando a API não estiver disponível
function generateFallbackWorkout(input: WorkoutGenerationInput): string {
  const { goal, experienceLevel, frequency, equipment, healthConditions } = input;
  
  // Definir alguns nomes criativos baseados no objetivo
  const workoutNames: Record<string, string[]> = {
    'Hipertrofia': ['Construção Muscular Total', 'Hipertrofia Progressiva', 'Ganho de Massa Máxima'],
    'Emagrecimento': ['Queima Total', 'Definição Completa', 'Shred Extremo'],
    'Força': ['Força Fundamental', 'Potência Máxima', 'Construção de Poder'],
    'Resistência': ['Resistência Completa', 'Endurance Elite', 'Condicionamento Total'],
    'Saúde': ['Vitalidade Total', 'Equilíbrio Físico', 'Bem-estar Completo'],
  };
  
  // Selecionar um nome aleatório com base no objetivo ou usar um nome genérico
  const goalKey = Object.keys(workoutNames).find(key => goal.toLowerCase().includes(key.toLowerCase())) || 'Hipertrofia';
  const nameOptions = workoutNames[goalKey];
  const workoutName = nameOptions[Math.floor(Math.random() * nameOptions.length)];
  
  // Verificar equipamentos disponíveis para ajustar os exercícios
  const hasWeights = equipment.some(eq => ['halteres', 'barra', 'anilhas', 'pesos'].includes(eq.toLowerCase()));
  const hasMachines = equipment.some(eq => ['maquinas', 'máquinas', 'aparelhos'].includes(eq.toLowerCase()));
  const hasElastics = equipment.some(eq => ['elasticos', 'elásticos', 'bandas'].includes(eq.toLowerCase()));
  
  // Verificar limitações de saúde
  const hasBackPain = healthConditions ? healthConditions.toLowerCase().includes('costas') : false;
  const hasKneePain = healthConditions ? healthConditions.toLowerCase().includes('joelho') : false;
  
  // Adaptar a divisão semanal com base na frequência
  let weekSplit = '';
  let exercises = '';
  
  // Função auxiliar para gerar exercícios para um dia específico
  const generateExercisesForDay = (dayNumber: number, focus: string, isAdvanced: boolean = false): string => {
    const equipmentMap = {
      weights: hasWeights ? 'com halteres' : hasMachines ? 'na máquina' : 'com elásticos',
      bar: hasWeights ? 'com barra' : hasMachines ? 'na máquina' : 'com elásticos',
      machine: hasMachines ? 'na máquina' : hasWeights ? 'com halteres' : 'com elásticos',
      elastic: hasElastics ? 'com elásticos' : hasWeights ? 'com halteres' : 'adaptado',
      body: 'com peso corporal',
      cable: hasMachines ? 'na polia' : hasElastics ? 'com elásticos' : 'adaptado',
    };
    
    // Mapa de exercícios por grupo muscular (7 por grupo para ter variedade)
    const exercisesByMuscle: Record<string, Array<{name: string, equipment: keyof typeof equipmentMap, sets?: number, reps?: string, rest?: number}>> = {
      peito: [
        { name: 'Supino reto', equipment: 'weights', sets: 4, reps: '10-12', rest: 60 },
        { name: 'Supino inclinado', equipment: 'weights', sets: 3, reps: '12', rest: 60 },
        { name: 'Crucifixo', equipment: 'weights', sets: 3, reps: '15', rest: 45 },
        { name: 'Crossover', equipment: 'cable', sets: 3, reps: '15', rest: 45 },
        { name: 'Flexão de braço', equipment: 'body', sets: 3, reps: '15', rest: 45 },
        { name: 'Supino declinado', equipment: 'weights', sets: 3, reps: '12', rest: 60 },
        { name: 'Pullover', equipment: 'weights', sets: 3, reps: '12', rest: 60 }
      ],
      costas: [
        { name: 'Puxada frontal', equipment: 'machine', sets: 4, reps: '10-12', rest: 60 },
        { name: 'Remada curvada', equipment: 'bar', sets: 3, reps: '12', rest: 60 },
        { name: 'Remada baixa', equipment: 'machine', sets: 3, reps: '12', rest: 60 },
        { name: 'Pulldown', equipment: 'machine', sets: 3, reps: '15', rest: 45 },
        { name: 'Remada alta', equipment: 'bar', sets: 3, reps: '15', rest: 45 },
        { name: 'Remada cavalinho', equipment: 'machine', sets: 3, reps: '12', rest: 60 },
        { name: 'Face pull', equipment: 'cable', sets: 3, reps: '15', rest: 45 }
      ],
      ombros: [
        { name: 'Desenvolvimento militar', equipment: 'weights', sets: 4, reps: '10-12', rest: 60 },
        { name: 'Elevação lateral', equipment: 'weights', sets: 3, reps: '15', rest: 45 },
        { name: 'Elevação frontal', equipment: 'weights', sets: 3, reps: '15', rest: 45 },
        { name: 'Desenvolvimento Arnold', equipment: 'weights', sets: 3, reps: '12', rest: 60 },
        { name: 'Remada alta', equipment: 'bar', sets: 3, reps: '12', rest: 60 },
        { name: 'Encolhimento de trapézio', equipment: 'weights', sets: 3, reps: '15', rest: 45 },
        { name: 'Crucifixo invertido', equipment: 'weights', sets: 3, reps: '15', rest: 45 }
      ],
      triceps: [
        { name: 'Tríceps corda', equipment: 'cable', sets: 3, reps: '12', rest: 45 },
        { name: 'Tríceps francês', equipment: 'weights', sets: 3, reps: '12', rest: 45 },
        { name: 'Tríceps testa', equipment: 'weights', sets: 3, reps: '12', rest: 45 },
        { name: 'Tríceps coice', equipment: 'weights', sets: 3, reps: '12', rest: 45 },
        { name: 'Mergulho entre bancos', equipment: 'body', sets: 3, reps: '15', rest: 45 },
        { name: 'Extensão de tríceps', equipment: 'cable', sets: 3, reps: '15', rest: 45 },
        { name: 'Supino fechado', equipment: 'weights', sets: 3, reps: '12', rest: 60 }
      ],
      biceps: [
        { name: 'Rosca direta', equipment: 'bar', sets: 3, reps: '12', rest: 45 },
        { name: 'Rosca alternada', equipment: 'weights', sets: 3, reps: '12', rest: 45 },
        { name: 'Rosca martelo', equipment: 'weights', sets: 3, reps: '12', rest: 45 },
        { name: 'Rosca concentrada', equipment: 'weights', sets: 3, reps: '12', rest: 45 },
        { name: 'Rosca Scott', equipment: 'machine', sets: 3, reps: '12', rest: 45 },
        { name: 'Rosca 21', equipment: 'bar', sets: 3, reps: '7+7+7', rest: 60 },
        { name: 'Rosca pegada neutra', equipment: 'weights', sets: 3, reps: '12', rest: 45 }
      ],
      pernas: [
        { name: hasKneePain ? 'Leg press' : 'Agachamento livre', equipment: hasKneePain ? 'machine' : 'body', sets: 4, reps: '10-12', rest: 75 },
        { name: 'Cadeira extensora', equipment: 'machine', sets: 3, reps: '12', rest: 60 },
        { name: 'Cadeira flexora', equipment: 'machine', sets: 3, reps: '12', rest: 60 },
        { name: hasBackPain ? 'Mesa flexora' : 'Stiff', equipment: hasBackPain ? 'machine' : 'weights', sets: 3, reps: '12', rest: 60 },
        { name: 'Panturrilha em pé', equipment: 'body', sets: 3, reps: '15', rest: 45 },
        { name: 'Abdução de quadril', equipment: 'machine', sets: 3, reps: '15', rest: 45 },
        { name: 'Adução de quadril', equipment: 'machine', sets: 3, reps: '15', rest: 45 }
      ],
      abdomen: [
        { name: hasBackPain ? 'Abdominal na máquina' : 'Abdominal supra', equipment: hasBackPain ? 'machine' : 'body', sets: 3, reps: '15', rest: 45 },
        { name: 'Abdominal infra', equipment: 'body', sets: 3, reps: '15', rest: 45 },
        { name: 'Prancha lateral', equipment: 'body', sets: 3, reps: '30s', rest: 30 },
        { name: 'Prancha frontal', equipment: 'body', sets: 3, reps: '45s', rest: 30 },
        { name: 'Abdominal oblíquo', equipment: 'body', sets: 3, reps: '15', rest: 45 },
        { name: 'Bicicleta', equipment: 'body', sets: 3, reps: '20', rest: 30 },
        { name: 'Russian twist', equipment: 'weights', sets: 3, reps: '20', rest: 30 }
      ]
    };
    
    // Selecionar os grupos musculares com base no foco do dia
    let muscleGroups: string[] = [];
    
    if (focus === 'peito-triceps') muscleGroups = ['peito', 'triceps'];
    else if (focus === 'costas-biceps') muscleGroups = ['costas', 'biceps'];
    else if (focus === 'pernas') muscleGroups = ['pernas', 'abdomen'];
    else if (focus === 'ombros-abdomen') muscleGroups = ['ombros', 'abdomen'];
    else if (focus === 'bracos') muscleGroups = ['biceps', 'triceps'];
    else if (focus === 'full-body') muscleGroups = ['pernas', 'peito', 'costas', 'ombros', 'biceps', 'triceps', 'abdomen'];
    else if (focus === 'peito-ombros') muscleGroups = ['peito', 'ombros'];
    else if (focus === 'costas-ombros') muscleGroups = ['costas', 'ombros'];
    
    // Selecionar exercícios para o dia (7 no total)
    let selectedExercises = [];
    let exercisesPerGroup = Math.ceil(7 / muscleGroups.length); // Distribuir os 7 exercícios entre os grupos
    
    // Garantir que temos exercícios suficientes de cada grupo
    for (const group of muscleGroups) {
      // Número de exercícios para este grupo
      const count = Math.min(exercisesPerGroup, exercisesByMuscle[group].length);
      
      // Selecionar exercícios aleatórios para esse grupo
      const groupExercises = [...exercisesByMuscle[group]];
      for (let i = 0; i < count && selectedExercises.length < 7; i++) {
        if (groupExercises.length === 0) break;
        
        // Pegar um exercício aleatório
        const randomIndex = Math.floor(Math.random() * groupExercises.length);
        const exercise = groupExercises.splice(randomIndex, 1)[0];
        
        // Ajustar para nível avançado, se necessário
        if (isAdvanced) {
          exercise.sets = Math.min(exercise.sets! + 1, 5); // Aumentar séries, máximo 5
          exercise.rest = Math.min(exercise.rest! + 15, 90); // Aumentar descanso, máximo 90s
        }
        
        selectedExercises.push(exercise);
      }
      
      // Se já temos 7 exercícios, parar
      if (selectedExercises.length >= 7) break;
    }
    
    // Se ainda não temos 7 exercícios, adicionar mais do primeiro grupo
    while (selectedExercises.length < 7 && muscleGroups.length > 0) {
      const group = muscleGroups[0];
      const groupExercises = exercisesByMuscle[group];
      
      // Procurar por exercícios que ainda não foram selecionados
      for (const exercise of groupExercises) {
        if (!selectedExercises.includes(exercise)) {
          selectedExercises.push(exercise);
          break;
        }
      }
      
      // Se não encontrou nenhum novo, pular para o próximo grupo
      if (selectedExercises.length < 7) {
        muscleGroups.shift();
      } else {
        break;
      }
    }
    
    // Limitar a 7 exercícios
    selectedExercises = selectedExercises.slice(0, 7);
    
    // Gerar o texto para os exercícios
    let dayExercises = `**Dia ${dayNumber} - ${focus.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' e ')}**\n`;
    
    selectedExercises.forEach((exercise, index) => {
      const equipmentText = equipmentMap[exercise.equipment];
      dayExercises += `- ${exercise.name} ${equipmentText} | ${exercise.sets} séries x ${exercise.reps} repetições | ${exercise.rest}s descanso | Peso sugerido: ${exercise.equipment === 'body' ? 'peso corporal' : 'moderado'}\n`;
    });
    
    return dayExercises;
  };
  
  if (frequency <= 3) {
    // Treino de corpo inteiro para frequências menores
    weekSplit = `Dia 1: Corpo Inteiro A
Dia 2: Descanso
Dia 3: Corpo Inteiro B
Dia 4: Descanso
Dia 5: Corpo Inteiro C
Dia 6: Descanso
Dia 7: Descanso`;

    // Exercícios para corpo inteiro adaptados à experiência e equipamentos
    const isAdvanced = !experienceLevel.toLowerCase().includes('iniciante');
    exercises = generateExercisesForDay(1, 'full-body', isAdvanced) + '\n\n' + 
               generateExercisesForDay(3, 'full-body', isAdvanced) + '\n\n' + 
               generateExercisesForDay(5, 'full-body', isAdvanced);
  } else {
    // Treino dividido para frequências maiores (4-6 dias)
    weekSplit = `Dia 1: Peito e Tríceps
Dia 2: Costas e Bíceps
Dia 3: Pernas
Dia 4: Ombros e Abdômen
Dia 5: Descanso
Dia 6: Descanso
Dia 7: Descanso`;

    if (frequency >= 5) {
      weekSplit = `Dia 1: Peito e Tríceps
Dia 2: Costas e Bíceps
Dia 3: Pernas
Dia 4: Ombros e Abdômen
Dia 5: Braços e Complementos
Dia 6: Descanso
Dia 7: Descanso`;
    }
    
    if (frequency >= 6) {
      weekSplit = `Dia 1: Peito
Dia 2: Costas
Dia 3: Pernas
Dia 4: Ombros
Dia 5: Braços
Dia 6: Abdômen e Complementos
Dia 7: Descanso`;
    }

    // Exercícios para treino dividido
    const isAdvanced = !experienceLevel.toLowerCase().includes('iniciante');
    exercises = generateExercisesForDay(1, 'peito-triceps', isAdvanced) + '\n\n' +
               generateExercisesForDay(2, 'costas-biceps', isAdvanced) + '\n\n' +
               generateExercisesForDay(3, 'pernas', isAdvanced) + '\n\n' +
               generateExercisesForDay(4, 'ombros-abdomen', isAdvanced);
               
    if (frequency >= 5) {
      exercises += '\n\n' + generateExercisesForDay(5, 'bracos', isAdvanced);
    }
    
    if (frequency >= 6) {
      exercises += '\n\n' + generateExercisesForDay(6, 'abdomen', isAdvanced);
    }
  }
  
  // Criar observações personalizadas
  let notes = '';
  
  if (hasBackPain) {
    notes += '- Evite exercícios que coloquem pressão direta na coluna. Mantenha a postura correta em todos os movimentos.\n';
  }
  
  if (hasKneePain) {
    notes += '- Para exercícios de perna, use amplitudes de movimento controladas e evite o agachamento profundo.\n';
  }
  
  if (goal.toLowerCase().includes('hipertrofia')) {
    notes += '- Foque na conexão mente-músculo e mantenha a tensão durante todo o movimento.\n';
  } else if (goal.toLowerCase().includes('emagrecimento')) {
    notes += '- Mantenha os intervalos curtos entre séries para aumentar o gasto calórico.\n';
  } else if (goal.toLowerCase().includes('força')) {
    notes += '- Priorize a técnica e o aumento progressivo de cargas nos exercícios compostos.\n';
  }
  
  // Montar o plano completo
  return `NOME DO TREINO: ${workoutName}

DESCRIÇÃO: Treino personalizado com foco em ${goal.toLowerCase()} adaptado para um nível ${experienceLevel.toLowerCase()}, com duração de ${input.sessionDuration} minutos por sessão e frequência de ${input.frequency} dias por semana.

DIVISÃO SEMANAL:
${weekSplit}

EXERCÍCIOS:
${exercises}

OBSERVAÇÕES:
${notes}
- Faça um aquecimento geral de 5-10 minutos antes de cada treino.
- Termine com 5-10 minutos de alongamento.
- Ajuste os pesos conforme sua capacidade individual.`;
}

// Função para parsear o output do modelo e transformar em objetos estruturados
export function parseWorkoutPlan(rawOutput: string): {
  name: string;
  description: string;
  exercises: Array<{
    name: string;
    sets: number;
    reps: string;
    restTime: number;
    weight: string | null;
    order: number;
    dayOfWeek: number;
  }>;
} {
  try {
    console.log("Iniciando processamento do plano de treino");
    
    // Limpar o texto de possíveis prefixos que o modelo possa adicionar
    const cleanedOutput = rawOutput.replace(/```.*?\n/g, '').replace(/```$/g, '');
    
    // Extrair nome do treino
    const nameMatch = cleanedOutput.match(/NOME DO TREINO:?\s*(.+?)(?:\n|$)/i);
    const name = nameMatch && nameMatch[1].trim() !== '[nome criativo e descritivo]' 
      ? nameMatch[1].trim() 
      : 'Treino Personalizado';

    // Extrair descrição
    const descMatch = cleanedOutput.match(/DESCRIÇÃO:?\s*(.+?)(?=\n\n|\n[A-Z])/is);
    const description = descMatch && descMatch[1].trim() !== '[breve descrição do objetivo e benefícios deste treino]' 
      ? descMatch[1].trim() 
      : 'Treino personalizado gerado por IA com base nas suas preferências.';

    // Array para armazenar os exercícios estruturados
    const exercises: Array<{
      name: string;
      sets: number;
      reps: string;
      restTime: number;
      weight: string | null;
      order: number;
      dayOfWeek: number;
    }> = [];

    // Buscar a seção de exercícios
    const exercisesSection = cleanedOutput.match(/EXERCÍCIOS:([^]*)(?=OBSERVAÇÕES:|$)/i);
    const exercisesText = exercisesSection ? exercisesSection[1].trim() : '';
    
    if (!exercisesText) {
      console.warn("Seção de exercícios não encontrada");
      return { name, description, exercises };
    }
    
    console.log("Seção de exercícios encontrada, tamanho:", exercisesText.length);
    
    // Dividir o texto em linhas
    const lines = exercisesText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Mapeamento para armazenar exercícios por dia
    const dayExercises: { [day: number]: string[] } = {};
    let currentDay = 0;
    
    // Expressões regulares para identificar dias
    const dayPatterns = [
      /\*\*Dia\s+(\d+)[^\*]+\*\*/i,            // **Dia 1 - Descrição**
      /\*\*Dia\s+(\d+)\s*[-–]\s*[^\*]+\*\*/i,  // **Dia 1 - Descrição**
      /\*\*Dia\s+(\d+)\*\*/i,                  // **Dia 1**
      /Dia\s+(\d+)\s*:/i,                      // Dia 1:
      /Dia\s+(\d+)\s*[-–]/i                    // Dia 1 -
    ];
    
    // Primeira passagem: identificar os blocos de dias
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Verificar se é um marcador de dia
      let isDayMarker = false;
      
      for (const pattern of dayPatterns) {
        const match = line.match(pattern);
        if (match) {
          currentDay = parseInt(match[1]);
          dayExercises[currentDay] = [];
          isDayMarker = true;
          console.log(`Dia ${currentDay} encontrado: "${line}"`);
          break;
        }
      }
      
      // Se não for um marcador de dia e estivermos processando um dia, adicionar ao dia atual
      if (!isDayMarker && currentDay > 0) {
        // Verificar se é uma linha de exercício (começa com hífen)
        if (line.startsWith('-')) {
          dayExercises[currentDay].push(line);
          console.log(`Exercício para o dia ${currentDay}: "${line.substring(0, 40)}..."`);
        }
      }
    }
    
    // Se não encontrou nenhum dia, tentar uma abordagem diferente
    if (Object.keys(dayExercises).length === 0) {
      console.log("Tentando abordagem alternativa para detectar dias");
      
      // Procurar por blocos de texto que começam com asteriscos duplos
      let blockStart = -1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.includes('**Dia') || line.includes('**Treino')) {
          // Encontrou o início de um bloco
          if (blockStart >= 0) {
            // Já estava processando um bloco, extrair o número do dia do bloco anterior
            const previousBlock = lines[blockStart];
            const dayMatch = previousBlock.match(/\*\*(?:Dia|Treino)\s+(\d+)/i);
            
            if (dayMatch) {
              const day = parseInt(dayMatch[1]);
              
              // Coletar os exercícios deste bloco
              const blockExercises = [];
              for (let j = blockStart + 1; j < i; j++) {
                if (lines[j].startsWith('-')) {
                  blockExercises.push(lines[j]);
                }
              }
              
              dayExercises[day] = blockExercises;
              console.log(`Bloco para dia ${day} encontrado com ${blockExercises.length} exercícios`);
            }
          }
          
          blockStart = i;
        }
      }
      
      // Processar o último bloco
      if (blockStart >= 0) {
        const lastBlock = lines[blockStart];
        const dayMatch = lastBlock.match(/\*\*(?:Dia|Treino)\s+(\d+)/i);
        
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          
          // Coletar os exercícios deste bloco
          const blockExercises = [];
          for (let j = blockStart + 1; j < lines.length; j++) {
            if (lines[j].startsWith('-')) {
              blockExercises.push(lines[j]);
            }
          }
          
          dayExercises[day] = blockExercises;
          console.log(`Último bloco para dia ${day} encontrado com ${blockExercises.length} exercícios`);
        }
      }
    }
    
    // Segunda passagem: processar os exercícios de cada dia
    Object.entries(dayExercises).forEach(([dayStr, exerciseLines]) => {
      const day = parseInt(dayStr);
      let orderInDay = 1;
      
      exerciseLines.forEach(line => {
        // Remover o hífen inicial
        let cleanLine = line.startsWith('-') ? line.substring(1).trim() : line.trim();
        
        // Dividir a linha usando pipes
        const parts = cleanLine.split('|').map(part => part.trim());
        
        if (parts.length >= 3) {
          // Nome do exercício
          const name = parts[0];
          
          // Extrair séries e repetições
          const setsRepsPattern = /(\d+)\s*(?:séries?|series?|série|serie)?(?:\s*(?:de|x|×)\s*)(\d+(?:-\d+)?(?:\s*[aà]\s*\d+)?)\s*(?:repetições|repeticões|repetição|repeticão|reps)?/i;
          const setsRepsMatch = parts[1].match(setsRepsPattern);
          
          if (setsRepsMatch) {
            const sets = parseInt(setsRepsMatch[1]);
            const reps = setsRepsMatch[2].trim();
            
            // Extrair tempo de descanso
            let restTime = 60; // Padrão
            const restPattern = /(\d+)\s*s?/;
            const restMatch = parts[2].match(restPattern);
            
            if (restMatch) {
              restTime = parseInt(restMatch[1]);
            }
            
            // Extrair peso sugerido
            let weight = null;
            if (parts.length >= 4) {
              weight = parts[3].replace(/peso\s*sugerido:?/i, '').trim();
            }
            
            exercises.push({
              name,
              sets,
              reps,
              restTime,
              weight,
              order: orderInDay++,
              dayOfWeek: day
            });
            
            console.log(`Exercício processado: Dia ${day}, ${name}, ${sets} séries x ${reps}, ${restTime}s descanso`);
          } else {
            console.warn(`Não foi possível extrair séries e repetições de: ${parts[1]}`);
          }
        } else {
          console.warn(`Linha de exercício não tem partes suficientes: ${cleanLine}`);
        }
      });
    });
    
    // Se ainda não encontrou exercícios, tentativa final com regex mais agressiva
    if (exercises.length === 0) {
      console.log("Tentando extração direta de exercícios com regex");
      
      // Padrão específico para o formato observado na saída
      const exercisePattern = /-\s*([^|]+)\s*\|\s*(\d+)\s*(?:séries?|series?|série|serie)?\s*[×x]\s*(\d+(?:-\d+)?)\s*(?:repetições|repeticões|repetição|repeticão|reps)?\s*\|\s*(\d+)s?\s*descanso\s*\|\s*(?:Peso\s*sugerido:?)?\s*([^|]+)/i;
      
      let dayCounter = 1;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Verificar se é um marcador de dia
        for (const pattern of dayPatterns) {
          const match = line.match(pattern);
          if (match) {
            dayCounter = parseInt(match[1]);
            break;
          }
        }
        
        // Verificar se é uma linha de exercício
        const exerciseMatch = line.match(exercisePattern);
        if (exerciseMatch) {
          const [_, name, sets, reps, rest, weight] = exerciseMatch;
          
          exercises.push({
            name: name.trim(),
            sets: parseInt(sets),
            reps: reps.trim(),
            restTime: parseInt(rest),
            weight: weight.trim(),
            order: exercises.length + 1,
            dayOfWeek: dayCounter
          });
          
          console.log(`Extração direta: Dia ${dayCounter}, ${name.trim()}`);
        }
      }
    }
    
    console.log("Exercícios parseados:", exercises.length, exercises);
    
    return {
      name,
      description,
      exercises
    };
  } catch (error) {
    console.error('Erro ao parsear plano de treino:', error);
    return {
      name: 'Treino Personalizado',
      description: 'Treino gerado por IA',
      exercises: []
    };
  }
}

// Função auxiliar para extrair dados do exercício
function extractExerciseData(line: string): {
  name: string;
  sets: number;
  reps: string;
  restTime: number;
  weight: string | null;
} | null {
  try {
    // Limpar a linha de marcadores
    let cleanLine = line.trim();
    if (line.startsWith('-')) cleanLine = line.substring(1).trim();
    if (line.startsWith('•')) cleanLine = line.substring(1).trim();
    if (line.startsWith('*')) cleanLine = line.substring(1).trim();
    
    // Diferentes padrões para capturar exercícios:
    
    // Padrão 1: Nome | X séries x Y repetições | 60s descanso | Peso sugerido: valor
    const pattern1 = /([^|]+)\s*\|\s*(\d+)\s*(?:séries?|series?|série|serie)\s*[×x]\s*([^|]+)\s*\|\s*(\d+)s?\s*descanso(?:\s*\|\s*(?:Peso\s*sugerido:?)?\s*(.+))?/i;
    
    // Padrão 2: Nome do exercício | 3 x 12 | 60s descanso | Peso: valor
    const pattern2 = /([^|]+)\s*\|\s*(\d+)\s*[×x]\s*([^|]+)\s*\|\s*(\d+)s?\s*(?:descanso)?(?:\s*\|\s*(?:Peso:?)?\s*(.+))?/i;
    
    // Padrão 3: Nome do exercício | 3 séries x 12 repetições | 60s | Peso: valor
    const pattern3 = /([^|]+)\s*\|\s*(\d+)\s*(?:séries?|series?|série|serie)\s*[×x]\s*([^|]+)\s*\|\s*(\d+)s?(?:\s*\|\s*(?:Peso:?)?\s*(.+))?/i;
    
    // Testar os padrões em ordem
    let match = cleanLine.match(pattern1) || cleanLine.match(pattern2) || cleanLine.match(pattern3);
    
    if (match) {
      const [_, name, sets, reps, restTime, weight] = match;
      
      return {
        name: name.trim(),
        sets: parseInt(sets),
        reps: reps.trim(),
        restTime: parseInt(restTime),
        weight: weight ? weight.trim() : null
      };
    }
    
    return null;
  } catch (e) {
    console.error("Erro ao extrair dados do exercício:", e);
    return null;
  }
} 