# Treino na Mão - Aplicativo de Gerenciamento de Treinos

O Treino na Mão é um aplicativo web e PWA (Progressive Web App) para gerenciamento de treinos de academia. Com ele, você pode criar, gerenciar e acompanhar seus treinos de forma interativa.

## Funcionalidades

### 1. Módulo de Gerenciamento de Treinos
- Criar, editar e excluir treinos personalizados
- Organizar exercícios por dia e por ordem de execução
- Definir séries, repetições, peso e tempo de descanso

### 2. Módulo de Treino Interativo
- Interface de treino com cronômetro integrado
- Controle de séries e repetições durante o treino
- Feedback sonoro para descanso e conclusão de exercícios
- Histórico detalhado de treinos realizados

### 3. Módulo de IA
- Integração com a API do Hugging Face para geração de treinos personalizados
- Formulário para coleta de dados e preferências do usuário
- Geração de treinos baseados no objetivo, nível e equipamentos disponíveis
- Edição e adição dos treinos gerados ao perfil do usuário

## Tecnologias Utilizadas

- **Next.js**: Framework React para renderização do lado do servidor
- **TypeScript**: Tipagem estática para JavaScript
- **Tailwind CSS**: Framework CSS para estilização
- **Supabase**: Backend as a Service para autenticação e banco de dados
- **Vercel**: Hospedagem e deploy

## Instalação e Uso

### Como instalar o aplicativo no dispositivo móvel

1. Acesse o aplicativo através do navegador em seu dispositivo móvel
2. No Safari (iOS) ou Chrome (Android), clique no botão de compartilhamento
3. Selecione "Adicionar à Tela Inicial" ou "Instalar Aplicativo"
4. O aplicativo será instalado como um ícone na tela inicial do seu dispositivo

### Desenvolvimento local

Para executar o projeto localmente, siga estas etapas:

1. Clone o repositório
2. Instale as dependências com `npm install`
3. Copie o arquivo `.env.example` para `.env.local` e preencha as variáveis
4. Execute o projeto com `npm run dev`

### Variáveis de Ambiente

```
# Banco de dados
NEXT_PUBLIC_SUPABASE_URL=sua_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon

# Hugging Face API
NEXT_PUBLIC_HUGGINGFACE_API_KEY=sua_api_key_huggingface
```

Você precisará criar uma conta no [Hugging Face](https://huggingface.co/) e obter uma API key para acessar os modelos de linguagem utilizados.

## Estrutura do Projeto

```
Treino/
  ├── app/              # Código fonte da aplicação
  │   ├── api/          # API routes
  │   ├── components/   # Componentes reutilizáveis
  │   ├── dashboard/    # Páginas do dashboard
  │   ├── hooks/        # React hooks personalizados
  │   ├── lib/          # Bibliotecas e utilidades
  │   ├── login/        # Página de login
  │   ├── register/     # Página de registro
  │   ├── styles/       # Estilos globais
  │   ├── types/        # Tipos TypeScript
  │   └── utils/        # Funções utilitárias
  ├── public/           # Arquivos estáticos
  │   ├── icons/        # Ícones do PWA
  │   └── sounds/       # Sons utilizados no aplicativo
  ├── .gitignore        # Arquivos ignorados pelo git
  ├── package.json      # Dependências e scripts
  ├── README.md         # Documentação do projeto
  ├── tailwind.config.js # Configuração do Tailwind CSS
  └── tsconfig.json     # Configuração do TypeScript
```

## Funcionalidades Implementadas

- [x] Autenticação de usuários
- [x] Gerenciamento de treinos (criar, editar, excluir)
- [x] Modo de treino interativo
- [x] PWA (Progressive Web App)
- [x] Geração de treinos com IA
- [x] Histórico e relatórios detalhados
- [x] Sistema de pagamento para funcionalidades premium
- [x] Funcionalidades para personal trainers

## Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE para detalhes.

## Contato

Para mais informações, entre em contato pelo email: contato@treinonamao.app 