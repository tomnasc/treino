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
  } catch (error) {
    console.error('Erro ao gerar plano de treino:', error);
    throw new Error('Não foi possível gerar o plano de treino. Tente novamente mais tarde.');
  }
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

    // Extrair divisão semanal e exercícios
    const exercisesSection = cleanedOutput.match(/EXERCÍCIOS:?\s*([\s\S]+?)(?=\n\nOBSERVAÇÕES|\n\n[A-Z]|$)/i);
    let exercisesText = exercisesSection ? exercisesSection[1] : '';

    // Caso não encontre a seção de exercícios no formato esperado, tenta extrair tudo após a divisão semanal
    if (!exercisesText) {
      const fullText = cleanedOutput;
      const divisionMatch = fullText.match(/DIVISÃO SEMANAL:?\s*([\s\S]+)/i);
      if (divisionMatch) {
        exercisesText = divisionMatch[1];
      }
    }

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

    // Mapeamento dos dias da semana para números
    const dayNameToNumber: Record<string, number> = {
      'segunda': 1, 'segunda-feira': 1, 
      'terça': 2, 'terça-feira': 2, 
      'quarta': 3, 'quarta-feira': 3, 
      'quinta': 4, 'quinta-feira': 4, 
      'sexta': 5, 'sexta-feira': 5, 
      'sábado': 6, 'sabado': 6, 
      'domingo': 7
    };

    let currentDayNumber = 1; // Começar com dia 1 por padrão
    let exerciseOrder = 1;
    let processingDay = false;
    
    // Dividir por linhas e processar
    const lines = exercisesText.split('\n');
    
    // Caso especial para o formato no console: verificar linhas com "**Treino X:**"
    const treinoRegex = /\*\*Treino\s+(\d+):\*\*/i;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Verificar se é um dia usando o formato visto no console (++Treino 1:++)
      const treinoPlusMatch = line.match(/\+\+Treino\s+(\d+):\+\+/i);
      if (treinoPlusMatch) {
        currentDayNumber = parseInt(treinoPlusMatch[1]);
        processingDay = true;
        continue;
      }
      
      // Verificar se é um dia usando o formato visto no console (**Treino 1:**)
      const treinoMatch = line.match(treinoRegex);
      if (treinoMatch) {
        currentDayNumber = parseInt(treinoMatch[1]);
        processingDay = true;
        continue;
      }
      
      // Verificar se é um dia numérico (Dia 1, Treino 2, etc)
      let isDayHeader = false;
      
      // Verificar formato "Dia X"
      if (line.toLowerCase().startsWith('dia ')) {
        const dayNum = parseInt(line.replace(/dia\s+/i, ''));
        if (!isNaN(dayNum)) {
          currentDayNumber = dayNum;
          processingDay = true;
          isDayHeader = true;
        }
      }
      
      // Verificar formato "Treino X"
      if (!isDayHeader && line.toLowerCase().startsWith('treino ')) {
        const dayNum = parseInt(line.replace(/treino\s+/i, ''));
        if (!isNaN(dayNum)) {
          currentDayNumber = dayNum;
          processingDay = true;
          isDayHeader = true;
        }
      }
      
      // Verificar dias da semana
      if (!isDayHeader) {
        const lowerLine = line.toLowerCase();
        for (const [dayName, dayNum] of Object.entries(dayNameToNumber)) {
          if (lowerLine.includes(dayName)) {
            currentDayNumber = dayNum;
            processingDay = true;
            isDayHeader = true;
            break;
          }
        }
      }

      // Verificar grupos musculares
      if (!isDayHeader) {
        const muscleGroups = [
          "peito", "costas", "pernas", "ombro", "ombros", "bíceps", "biceps", 
          "tríceps", "triceps", "abdômen", "abdomen", "glúteos", "gluteos", 
          "superior", "inferior", "push", "pull", "leg", "legs"
        ];
        
        const lowerLine = line.toLowerCase();
        for (const muscle of muscleGroups) {
          if (lowerLine.includes(muscle) && lowerLine.includes(':')) {
            processingDay = true;
            isDayHeader = true;
            break;
          }
        }
      }
      
      // Processar exercícios
      if (!isDayHeader && (processingDay || exercises.length === 0)) {
        let isExerciseLine = false;
        
        // Verificar se é uma linha de exercício
        if (line.startsWith('-') || 
            line.startsWith('•') || 
            line.startsWith('*') || 
            line.startsWith('+') ||
            /^\d+[.)]/.test(line) ||
            /^[A-Za-z][.)]/.test(line)) {
          isExerciseLine = true;
        }
        
        if (isExerciseLine) {
          // Limpar a linha de marcadores
          let cleanLine = line;
          if (line.startsWith('-')) cleanLine = line.substring(1).trim();
          if (line.startsWith('•')) cleanLine = line.substring(1).trim();
          if (line.startsWith('*')) cleanLine = line.substring(1).trim();
          // Não remova o '+' aqui, pois faz parte do padrão
          if (/^\d+[.)]/.test(line)) cleanLine = line.replace(/^\d+[.)]\s*/, '').trim();
          if (/^[A-Za-z][.)]/.test(line)) cleanLine = line.replace(/^[A-Za-z][.)]\s*/, '').trim();
          
          // Extrair dados do exercício
          let exerciseData = extractExerciseData(cleanLine);
          
          if (exerciseData) {
            exercises.push({
              name: exerciseData.name,
              sets: exerciseData.sets,
              reps: exerciseData.reps,
              restTime: exerciseData.restTime,
              weight: exerciseData.weight,
              order: exerciseOrder++,
              dayOfWeek: currentDayNumber
            });
          }
        }
      }
    }

    // Se não encontrou exercícios, tentar uma última abordagem
    if (exercises.length === 0) {
      // Encontrar seções de treino
      const treinoSections: { [key: number]: string[] } = {};
      let currentSection = 0;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Verificar se é uma linha de treino
        const treinoMatch = line.match(/\*\*Treino\s+(\d+):\*\*/i) || line.match(/\+\+Treino\s+(\d+):\+\+/i);
        if (treinoMatch) {
          currentSection = parseInt(treinoMatch[1]);
          treinoSections[currentSection] = [];
          continue;
        }
        
        // Adicionar a linha à seção atual se estiver processando uma seção
        if (currentSection > 0 && line) {
          treinoSections[currentSection].push(line);
        }
      }
      
      // Processar cada seção de treino
      for (const [section, sectionLines] of Object.entries(treinoSections)) {
        const dayNumber = parseInt(section);
        
        // Processar as linhas desta seção
        for (const line of sectionLines) {
          // Verificar se a linha contém o padrão "+ [exercício]"
          if (line.includes('+') && line.includes('|')) {
            const exerciseData = extractExerciseData(line);
            if (exerciseData) {
              exercises.push({
                name: exerciseData.name,
                sets: exerciseData.sets,
                reps: exerciseData.reps,
                restTime: exerciseData.restTime,
                weight: exerciseData.weight,
                order: exerciseOrder++,
                dayOfWeek: dayNumber
              });
            }
          }
        }
      }
    }
    
    // Ainda sem sucesso? Buscar por linhas com estrutura semelhante a um exercício em todo o texto
    if (exercises.length === 0) {
      const exerciseLines = exercisesText.split('\n')
        .filter(line => {
          const trimmedLine = line.trim();
          return trimmedLine && (
            trimmedLine.includes('série') || 
            trimmedLine.includes('series') || 
            trimmedLine.includes('repetições') || 
            trimmedLine.includes('reps')
          );
        });
      
      for (const line of exerciseLines) {
        const exerciseData = extractExerciseData(line);
        if (exerciseData) {
          exercises.push({
            name: exerciseData.name,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            restTime: exerciseData.restTime,
            weight: exerciseData.weight,
            order: exerciseOrder++,
            dayOfWeek: currentDayNumber
          });
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
    // Caso especial para linhas como "Chest Press Máquina | 3 séries x 15 repetições | 45s descanso | Peso sugerido: varie entre 8kg a 12kg nas últimas series;"
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim());
      
      if (parts.length >= 2) {
        // Extrair nome do exercício
        const name = parts[0].replace(/^\+\s*/, '').trim();
        
        // Extrair séries e repetições
        const setsRepsPattern = /(\d+)\s*(?:séries?|sets?)?(?:\s*(?:de|x)\s*)([^|]+)/i;
        const setsRepsMatch = parts[1].match(setsRepsPattern);
        
        if (setsRepsMatch) {
          const sets = parseInt(setsRepsMatch[1]);
          const reps = setsRepsMatch[2].trim();
          
          // Extrair tempo de descanso
          let restTime = 60;
          if (parts.length >= 3) {
            const restMatch = parts[2].match(/(\d+)/);
            if (restMatch) {
              restTime = parseInt(restMatch[1]);
            }
          }
          
          // Extrair peso
          let weight = null;
          if (parts.length >= 4) {
            weight = parts[3].replace(/peso[^:]*:?/i, '').trim();
          }
          
          return {
            name,
            sets,
            reps,
            restTime,
            weight
          };
        }
      }
    }
    
    // Caso especial para linhas do tipo "+ Chest Press Máquina | 3 séries x 15 repetições | 45s descanso | Peso sugerido: varie entre 8kg a 12kg"
    const specialMatch = line.match(/\+\s*(.+?)\s*\|\s*(\d+)\s*séries\s*x\s*(\d+)\s*repetições\s*\|\s*(\d+)s\s*descanso\s*(?:\|\s*Peso\s*sugerido:\s*(.+))?/i);
    if (specialMatch) {
      return {
        name: specialMatch[1].trim(),
        sets: parseInt(specialMatch[2]),
        reps: specialMatch[3].trim(),
        restTime: parseInt(specialMatch[4]),
        weight: specialMatch[5] ? specialMatch[5].trim() : null
      };
    }
    
    // Formato com hífen: Nome - Séries x Reps
    if (line.includes('-')) {
      const parts = line.split('-').map(p => p.trim());
      
      if (parts.length >= 2) {
        const name = parts[0];
        
        // Extrair séries e repetições
        const setsRepsPattern = /(\d+)\s*(?:séries?|sets?)?(?:\s*(?:de|x)\s*)([^-]+)/i;
        const setsRepsMatch = parts[1].match(setsRepsPattern);
        
        if (setsRepsMatch) {
          const sets = parseInt(setsRepsMatch[1]);
          const reps = setsRepsMatch[2].trim();
          
          // Extrair tempo de descanso
          let restTime = 60;
          if (parts.length >= 3) {
            const restMatch = parts[2].match(/(\d+)/);
            if (restMatch) {
              restTime = parseInt(restMatch[1]);
            }
          }
          
          // Extrair peso
          let weight = null;
          if (parts.length >= 4) {
            weight = parts[3].trim();
          }
          
          return {
            name,
            sets,
            reps,
            restTime,
            weight
          };
        }
      }
    }
    
    // Formato com dois pontos: Nome: Séries x Reps
    if (line.includes(':')) {
      const parts = line.split(':').map(p => p.trim());
      
      if (parts.length >= 2) {
        const name = parts[0];
        
        // Extrair séries e repetições
        const setsRepsPattern = /(\d+)\s*(?:séries?|sets?)?(?:\s*(?:de|x)\s*)([^:]+)/i;
        const setsRepsMatch = parts[1].match(setsRepsPattern);
        
        if (setsRepsMatch) {
          const sets = parseInt(setsRepsMatch[1]);
          const reps = setsRepsMatch[2].trim();
          
          // Restante como no caso anterior
          let restTime = 60;
          let weight = null;
          
          return {
            name,
            sets,
            reps,
            restTime,
            weight
          };
        }
      }
    }
    
    // Formato específico para o padrão visto no console
    // "+ Chest Press Máquina | 3 séries x 15 repetições | 45s descanso | Peso sugerido: varie entre 8kg a 12kg nas últimas series;"
    const detailedMatch = line.match(/\+\s*(.*?)\s*\|\s*(\d+)\s*séries?\s*x\s*(\d+)\s*repetições?\s*\|\s*(\d+)s\s*descanso\s*\|\s*Peso\s*sugerido:\s*(.*)/i);
    if (detailedMatch) {
      return {
        name: detailedMatch[1].trim(),
        sets: parseInt(detailedMatch[2]),
        reps: detailedMatch[3].trim(),
        restTime: parseInt(detailedMatch[4]),
        weight: detailedMatch[5].trim()
      };
    }
    
    // Padrão visto no console sem a parte do peso
    // "+ Chest Press Máquina | 3 séries x 15 repetições | 45s descanso"
    const noWeightMatch = line.match(/\+\s*(.*?)\s*\|\s*(\d+)\s*séries?\s*x\s*(\d+)\s*repetições?\s*\|\s*(\d+)s\s*descanso/i);
    if (noWeightMatch) {
      return {
        name: noWeightMatch[1].trim(),
        sets: parseInt(noWeightMatch[2]),
        reps: noWeightMatch[3].trim(),
        restTime: parseInt(noWeightMatch[4]),
        weight: null
      };
    }
    
    // Formato simples: buscar padrões de série x repetições na linha
    const simpleSetsRepsPattern = /(\d+)\s*(?:séries?|sets?)?(?:\s*(?:de|x)\s*)(\d+(?:-\d+)?(?:\s*a\s*\d+)?)\s*(?:repetições|reps)?/i;
    const simpleSetsRepsMatch = line.match(simpleSetsRepsPattern);
    
    if (simpleSetsRepsMatch) {
      const fullMatch = simpleSetsRepsMatch[0];
      const sets = parseInt(simpleSetsRepsMatch[1]);
      const reps = simpleSetsRepsMatch[2];
      
      // Extrair o nome (assumindo que vem antes do padrão de séries)
      const namePattern = new RegExp(`(.+?)${fullMatch}`, 'i');
      const nameMatch = line.match(namePattern);
      const name = nameMatch ? nameMatch[1].trim() : line.split(fullMatch)[0].trim();
      
      return {
        name,
        sets,
        reps,
        restTime: 60,
        weight: null
      };
    }
    
    // Último recurso: verificar se há números que possam representar séries e repetições
    const numbers = line.match(/\d+/g);
    if (numbers && numbers.length >= 2) {
      const sets = parseInt(numbers[0]);
      const reps = numbers[1];
      
      // Extrair o nome (assumindo que é tudo antes do primeiro número)
      const nameMatch = line.match(/^(.*?)(?:\d+|$)/);
      const name = nameMatch ? nameMatch[1].trim() : line;
      
      if (name) {
        return {
          name,
          sets,
          reps,
          restTime: 60,
          weight: null
        };
      }
    }
    
    return null;
  } catch (e) {
    console.error("Erro ao extrair dados do exercício:", e);
    return null;
  }
} 