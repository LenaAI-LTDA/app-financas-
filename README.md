# GranaZap - Finanças Pessoais

Aplicação para controle de finanças pessoais desenvolvida com React, TypeScript, Tailwind CSS e Supabase.

## Características

- Login e cadastro de usuários (com validação de e-mail pré-cadastrado)
- Dashboard com resumo financeiro (Receitas, Despesas, Saldo, Previsto a Receber/Pagar)
- Cadastro e gerenciamento de transações
- Categorização de despesas e receitas
- Relatórios financeiros básicos
- Gestão de lançamentos futuros (incluindo parcelados e recorrentes)
- Tema claro/escuro
- Configurações básicas de White-Label (cores, logos, nome)

## Manipulação de Datas

### Abordagem Baseada em Strings ISO (YYYY-MM-DD)

O projeto utiliza uma abordagem baseada em strings ISO para manipulação de datas, evitando os problemas comuns associados com objetos Date do JavaScript:

- Todas as datas são armazenadas e manipuladas como strings no formato `YYYY-MM-DD`
- Não há dependência de bibliotecas externas como date-fns para operações básicas
- Eliminação de problemas de fuso horário na exibição e armazenamento de datas
- Maior consistência entre servidor, cliente e banco de dados

As funções utilitárias para manipulação de datas estão centralizadas em `src/lib/date-utils.ts`, incluindo:

- `formatDateForDisplay`: Converte data ISO para formato brasileiro (DD/MM/YYYY)
- `extractMonthFromIsoDate`: Extrai informação de mês de uma data ISO
- `getCurrentIsoDate`: Retorna a data atual em formato ISO
- `isValidIsoDate`: Valida se uma string está no formato ISO correto

## Tecnologias Principais

- React 18
- TypeScript
- Tailwind CSS (com Shadcn UI para componentes)
- Supabase (Autenticação, Banco de Dados Postgres)
- Vite (Ferramenta de Build)
- Recharts (Gráficos)
- React Hook Form (Formulários)
- Zod (Validação)

## Configurando o Projeto (Passo a Passo)

Este guia vai te ajudar a instalar e configurar o GranaZap na sua máquina.

**Pré-requisitos:**

*   Você precisa ter o **Node.js** instalado (que inclui o npm). Você pode baixar em [nodejs.org](https://nodejs.org/).
*   Você precisa ter o **Git** instalado. Você pode baixar em [git-scm.com](https://git-scm.com/).
*   Uma conta gratuita no [Supabase](https://supabase.com/).

**Passo 1: Copiar o Código**

1.  Abra o seu terminal (ou prompt de comando).
2.  Navegue até a pasta onde você quer guardar o projeto.
3.  Copie o código do repositório usando o Git:
    ```bash
    git clone https://github.com/seu-usuario/grana-zap-finance.git
    ```
    (Substitua `https://github.com/seu-usuario/grana-zap-finance.git` pelo endereço correto do repositório)
4.  Entre na pasta que foi criada:
    ```bash
    cd grana-zap-finance
    ```

**Passo 2: Configurar o Supabase (O "Cérebro" Online)**

O Supabase guarda todos os dados (usuários, transações, etc.). Precisamos prepará-lo.

1.  **Crie um Projeto no Supabase:** Acesse [supabase.com](https://supabase.com/), faça login e crie um novo projeto. Escolha um nome e uma senha forte para o banco de dados (guarde essa senha!). Selecione a região mais próxima de você.
2.  **Aguarde a Criação:** Pode levar alguns minutos para o projeto ficar pronto.
3.  **Prepare o Banco de Dados:**
    *   No painel do seu projeto Supabase, vá para a seção **SQL Editor** (geralmente um ícone `</>` no menu lateral).
    *   Clique em **New query**.
    *   Abra o arquivo `supabase_setup/complete_schema_setup.sql` que está dentro da pasta do projeto que você baixou no Passo 1.
    *   **Copie TODO o conteúdo** desse arquivo (`Ctrl+A` ou `Cmd+A`, depois `Ctrl+C` ou `Cmd+C`).
    *   **Cole o conteúdo** na janela do SQL Editor no Supabase (`Ctrl+V` ou `Cmd+V`).
    *   Clique no botão **Run** (ou similar) para executar o código. Isso vai criar todas as "gavetas" (tabelas) e "regras" (funções, políticas de segurança) que o GranaZap precisa para funcionar.
    *   Se tudo correu bem, você verá uma mensagem de "Success".

**Passo 3: Conectar o Aplicativo ao Supabase (As "Chaves Secretas")**

Agora, precisamos dizer ao aplicativo GranaZap onde encontrar o "cérebro" (seu projeto Supabase) que acabamos de configurar.

1.  **Encontre as Chaves:**
    *   No painel do seu projeto Supabase, vá para **Project Settings** (ícone de engrenagem).
    *   Clique em **API** no menu lateral.
    *   Você verá duas informações importantes na seção **Project API keys**:
        *   **Project URL:** É o endereço principal do seu projeto Supabase.
        *   **anon public:** É uma chave (um tipo de senha) que permite ao aplicativo conversar com o Supabase de forma segura, sem precisar de login para algumas coisas básicas.
2.  **Crie o Arquivo `.env`:**
    *   Na pasta do projeto no seu computador, procure por um arquivo chamado `.env.example`. Se ele existir, faça uma cópia dele e renomeie a cópia para `.env`.
    *   Se o `.env.example` não existir, crie um novo arquivo **exatamente** com o nome `.env` na pasta principal do projeto.
3.  **Preencha o `.env`:**
    *   Abra o arquivo `.env` com um editor de texto.
    *   Adicione ou edite as seguintes linhas, colando as informações que você pegou do Supabase:
        ```dotenv
        VITE_SUPABASE_URL=COLE_A_URL_DO_PROJETO_AQUI
        VITE_SUPABASE_ANON_KEY=COLE_A_CHAVE_ANON_PUBLIC_AQUI
        ```
    *   **Importante:** O `VITE_` no início é necessário! Não apague.
    *   Salve o arquivo `.env`.

**Passo 4: Configurar a Ferramenta Supabase (Opcional, mas recomendado)**

Existe uma ferramenta de linha de comando do Supabase que pode ser útil no futuro. Para que ela funcione, precisamos dizer a ela qual é o seu projeto.

1.  **Encontre o ID de Referência:**
    *   No painel do seu projeto Supabase, vá para **Project Settings** (ícone de engrenagem).
    *   Clique em **General**.
    *   Copie o **Reference ID**. É um código aleatório.
2.  **Edite o `config.toml`:**
    *   Abra o arquivo `supabase/config.toml` na pasta do projeto.
    *   Cole o **Reference ID** que você copiou na linha `project_id = "..."`, substituindo o valor que estava lá.
        ```toml
        project_id = "COLE_O_REFERENCE_ID_AQUI"
        ```
    *   Salve o arquivo.

**Passo 5: Instalar as "Peças" do Aplicativo**

Agora que a conexão está pronta, vamos instalar as bibliotecas e ferramentas que o GranaZap usa.

1.  Volte para o seu terminal (ou prompt de comando), certificando-se de que você está dentro da pasta `grana-zap-finance`.
2.  Execute o comando:
    
    npm install
  
    (Ou `bun install` se você preferir usar o Bun).
3.  Aguarde a instalação terminar. Isso pode levar alguns minutos.

**Passo 6: Configurações Finais e Primeiro Acesso**

1.  **(IMPORTANTE) Pré-Cadastrar Usuários:** Este aplicativo só permite o login/cadastro de usuários que **já existem** na tabela `public.usuarios` do seu banco de dados Supabase e que tenham o `status` como `'ativo'`. Você precisará adicionar manualmente os e-mails permitidos usando a interface do Supabase (vá em Table Editor -> Tabela usuarios -> Insert row).
2.  **(IMPORTANTE) White-Label:** Para personalizar cores, logos e nome da empresa, edite a única linha que existe na tabela `public.configuracoes_sistema` diretamente no Supabase.
3.  **(RECOMENDAÇÃO DE SEGURANÇA): Desabilitar Cadastro Público:** Vá nas configurações de **Authentication** -> **Settings** do seu projeto Supabase e **desative** a opção "Enable email signup" (ou similar). Isso garante que apenas os usuários que você pré-cadastrou poderão usar o sistema.

**Passo 7: Rodar o Aplicativo!**

1.  No terminal, dentro da pasta do projeto, execute:
 
    npm run dev

    (Ou `bun run dev`).
2.  Seu terminal mostrará um endereço local, geralmente `http://localhost:8080/`.
3.  Abra seu navegador de internet e acesse esse endereço.
4.  Pronto! O GranaZap deve estar rodando na sua máquina. Você pode tentar fazer login com um dos e-mails que você pré-cadastrou.

## Gerando a Versão Final para Hospedagem (Build)

Quando você quiser colocar o site no ar em um serviço de hospedagem (como Vercel, Netlify, Cloudflare Pages, etc.), você não envia todo o código do projeto. Você precisa gerar uma versão otimizada.

1.  **Execute o Comando de Build:** No terminal, dentro da pasta do projeto, rode:
    
    npm run build

    (Ou `bun run build`).
2.  **Pasta `dist`:** Este comando criará uma nova pasta chamada `dist` no seu projeto.
3.  **Envie para Hospedagem:** É o **conteúdo da pasta `dist`** que você deve enviar para o seu serviço de hospedagem. Consulte a documentação do seu provedor de hospedagem para saber como fazer o deploy de um site estático ou de um projeto Vite.

## Estrutura do Projeto

```
src/
├── components/       # Componentes reutilizáveis da interface
├── contexts/         # Contextos React (Autenticação, Configurações)
├── hooks/            # Hooks personalizados (ex: useToast)
├── integrations/     # Configuração de serviços externos (Supabase client)
├── lib/              # Funções utilitárias (datas, Supabase helpers, serviços)
├── pages/            # Componentes de página completos (Dashboard, Transações, etc)
└── App.tsx           # Componente raiz, define rotas

public/               # Arquivos estáticos (ícones, etc)
supabase_setup/       # Script SQL para setup do banco
.env.example          # Exemplo de variáveis de ambiente
README.md             # Este arquivo :)
# ... outros arquivos de configuração (vite, tailwind, package.json, etc)
```

## Lógica de Cadastro Restrito

Esta aplicação implementa uma regra para permitir o cadastro (sign-up) apenas para usuários cujo e-mail já exista previamente na tabela `public.usuarios` e cujo status nesta tabela seja `'ativo'`. A validação é realizada no **frontend** antes de chamar a função de cadastro do Supabase Auth.

**Fluxo:**

1.  O usuário preenche o formulário de cadastro (`src/pages/auth/Register.tsx`).
2.  Ao submeter, o sistema **primeiro consulta** a tabela `usuarios` buscando pelo e-mail fornecido.
3.  **Validação:**
    *   Se o e-mail não for encontrado ou o status do usuário encontrado não for `'ativo'`, uma mensagem de erro específica é exibida e o cadastro é bloqueado.
    *   Se o e-mail for encontrado e o status for `'ativo'`, o sistema prossegue.
4.  O sistema chama `supabase.auth.signUp()` para criar a conta no sistema de autenticação do Supabase.
5.  Se o `signUp` for bem-sucedido, o sistema **atualiza** o registro existente na tabela `usuarios` com o ID de autenticação recém-criado e os demais dados do formulário (nome, celular, etc.).

**Configuração Necessária (Administrador / Cliente White-Label):**

1.  **Pré-cadastrar Usuários:** Você deve adicionar manualmente os registros dos usuários permitidos na sua tabela `public.usuarios` no Supabase.
2.  **Definir Status:** Certifique-se de que a coluna `status` para os usuários que devem poder se cadastrar esteja definida como `'ativo'`. Os valores possíveis são `ativo`, `inativo`, `bloqueado`, `excluido`.
3.  **(RECOMENDAÇÃO FORTE DE SEGURANÇA): Desabilitar Cadastro Público no Supabase:** Como a validação principal ocorre no frontend, para garantir que usuários não possam contorná-la, é **altamente recomendado** desabilitar o cadastro público nas configurações do seu projeto Supabase:
    *   Vá para o painel do Supabase.
    *   Navegue até **Authentication** -> **Settings**.
    *   Desative a opção **Disable signup** (ou similar).
    *   Salve as alterações.
    Com o signup desabilitado, apenas usuários pré-cadastrados e ativos conseguirão ativar suas contas através deste fluxo.

## Contribuindo


